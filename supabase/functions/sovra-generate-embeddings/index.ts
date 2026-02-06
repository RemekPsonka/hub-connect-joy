import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyAuth, isAuthError, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Rate Limiting ──────────────────────────────────────
async function checkRateLimit(key: string): Promise<boolean> {
  const redisUrl = Deno.env.get("UPSTASH_REDIS_REST_URL");
  const redisToken = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");
  if (!redisUrl || !redisToken) return true;

  const now = Date.now();
  const windowMs = 60_000;
  const max = 5;

  try {
    const res = await fetch(`${redisUrl}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${redisToken}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["ZREMRANGEBYSCORE", key, "0", String(now - windowMs)],
        ["ZCARD", key],
      ]),
    });
    if (!res.ok) return true;
    const results = await res.json();
    if ((results[1]?.result ?? 0) >= max) return false;

    await fetch(`${redisUrl}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${redisToken}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["ZADD", key, String(now), `${now}-${crypto.randomUUID().slice(0, 8)}`],
        ["EXPIRE", key, "120"],
      ]),
    });
    return true;
  } catch {
    return true;
  }
}

// ─── Batch generate embeddings via OpenAI ───────────────
async function batchGenerateEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey || texts.length === 0) return texts.map(() => null);

  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: texts,
      }),
    });

    if (!res.ok) {
      console.error("OpenAI batch embedding error:", res.status, await res.text());
      return texts.map(() => null);
    }

    const data = await res.json();
    const embeddings = data.data as Array<{ embedding: number[]; index: number }>;

    // Sort by index to match input order
    const sorted = embeddings.sort((a, b) => a.index - b.index);
    return sorted.map((e) => e.embedding);
  } catch (e) {
    console.error("Batch embedding failed:", e);
    return texts.map(() => null);
  }
}

// ─── Main Handler ───────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // Auth
    const auth = await verifyAuth(req, serviceClient);
    if (isAuthError(auth)) return unauthorizedResponse(auth, corsHeaders);
    if (auth.userType !== "director" || !auth.directorId) {
      return new Response(JSON.stringify({ error: "Only directors can generate embeddings" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit
    const allowed = await checkRateLimit(`sovra-embeddings:${auth.directorId}`);
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const type = body.type as "contacts" | "projects" | "single";
    const recordId = body.record_id as string | undefined;

    if (!type || !["contacts", "projects", "single"].includes(type)) {
      return new Response(JSON.stringify({ error: "type must be 'contacts', 'projects', or 'single'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;

    if (type === "projects") {
      // Fetch projects without embeddings (limit 50)
      const { data: projects } = await serviceClient
        .from("projects")
        .select("id, name, description, status")
        .eq("tenant_id", auth.tenantId)
        .is("embedding", null)
        .limit(50);

      if (!projects || projects.length === 0) {
        return new Response(
          JSON.stringify({ processed: 0, type: "projects" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get project contact names for richer embeddings
      const projectIds = projects.map((p) => p.id);
      const { data: allPc } = await serviceClient
        .from("project_contacts")
        .select("project_id, contact:contacts(full_name)")
        .in("project_id", projectIds);

      const contactsByProject: Record<string, string[]> = {};
      for (const pc of allPc || []) {
        const name = (pc as any).contact?.full_name;
        if (name) {
          if (!contactsByProject[pc.project_id]) contactsByProject[pc.project_id] = [];
          contactsByProject[pc.project_id].push(name);
        }
      }

      // Build texts
      const texts = projects.map((p) => {
        const contacts = contactsByProject[p.id]?.join(", ") || "";
        return [
          p.name,
          p.description || "",
          `Status: ${p.status || ""}`,
          contacts ? `Kontakty: ${contacts}` : "",
        ]
          .filter(Boolean)
          .join(". ");
      });

      // Batch in groups of 50 (OpenAI limit)
      const embeddings = await batchGenerateEmbeddings(texts);

      // Update each project
      for (let i = 0; i < projects.length; i++) {
        if (embeddings[i]) {
          const { error } = await serviceClient
            .from("projects")
            .update({ embedding: JSON.stringify(embeddings[i]) })
            .eq("id", projects[i].id);
          if (!error) processed++;
        }
      }
    } else if (type === "contacts") {
      // Fetch contacts without embeddings (limit 50)
      const { data: contacts } = await serviceClient
        .from("contacts")
        .select("id, full_name, company, position, industry, notes, tags")
        .eq("tenant_id", auth.tenantId)
        .is("profile_embedding", null)
        .limit(50);

      if (!contacts || contacts.length === 0) {
        return new Response(
          JSON.stringify({ processed: 0, type: "contacts" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const texts = contacts.map((c) => {
        const tags = Array.isArray(c.tags) ? c.tags.join(", ") : "";
        return [
          c.full_name,
          c.position ? `${c.position}` : "",
          c.company ? `w ${c.company}` : "",
          c.industry ? `Branża: ${c.industry}` : "",
          c.notes ? `Notatki: ${c.notes.slice(0, 500)}` : "",
          tags ? `Tagi: ${tags}` : "",
        ]
          .filter(Boolean)
          .join(". ");
      });

      const embeddings = await batchGenerateEmbeddings(texts);

      for (let i = 0; i < contacts.length; i++) {
        if (embeddings[i]) {
          const { error } = await serviceClient
            .from("contacts")
            .update({ profile_embedding: JSON.stringify(embeddings[i]) })
            .eq("id", contacts[i].id);
          if (!error) processed++;
        }
      }
    } else if (type === "single" && recordId) {
      // Try as project first
      const { data: project } = await serviceClient
        .from("projects")
        .select("id, name, description, status")
        .eq("id", recordId)
        .eq("tenant_id", auth.tenantId)
        .maybeSingle();

      if (project) {
        const text = [project.name, project.description || "", `Status: ${project.status || ""}`]
          .filter(Boolean)
          .join(". ");
        const embeddings = await batchGenerateEmbeddings([text]);
        if (embeddings[0]) {
          await serviceClient
            .from("projects")
            .update({ embedding: JSON.stringify(embeddings[0]) })
            .eq("id", recordId);
          processed = 1;
        }
      } else {
        // Try as contact
        const { data: contact } = await serviceClient
          .from("contacts")
          .select("id, full_name, company, position, industry, notes, tags")
          .eq("id", recordId)
          .eq("tenant_id", auth.tenantId)
          .maybeSingle();

        if (contact) {
          const tags = Array.isArray(contact.tags) ? contact.tags.join(", ") : "";
          const text = [
            contact.full_name,
            contact.position || "",
            contact.company ? `w ${contact.company}` : "",
            contact.industry ? `Branża: ${contact.industry}` : "",
            tags ? `Tagi: ${tags}` : "",
          ]
            .filter(Boolean)
            .join(". ");
          const embeddings = await batchGenerateEmbeddings([text]);
          if (embeddings[0]) {
            await serviceClient
              .from("contacts")
              .update({ profile_embedding: JSON.stringify(embeddings[0]) })
              .eq("id", recordId);
            processed = 1;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ processed, type }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("sovra-generate-embeddings error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
