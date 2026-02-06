import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyAuth, isAuthError, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Rate Limiting ──────────────────────────────────────
async function checkRateLimit(key: string, max: number, windowMs: number): Promise<boolean> {
  const redisUrl = Deno.env.get("UPSTASH_REDIS_REST_URL");
  const redisToken = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");
  if (!redisUrl || !redisToken) return true;

  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    const res = await fetch(`${redisUrl}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${redisToken}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["ZREMRANGEBYSCORE", key, "0", String(windowStart)],
        ["ZCARD", key],
      ]),
    });
    if (!res.ok) return true;
    const results = await res.json();
    const count = results[1]?.result ?? 0;
    if (count >= max) return false;

    await fetch(`${redisUrl}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${redisToken}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["ZADD", key, String(now), `${now}-${crypto.randomUUID().slice(0, 8)}`],
        ["EXPIRE", key, String(Math.ceil(windowMs / 1000) + 10)],
      ]),
    });
    return true;
  } catch {
    return true;
  }
}

// ─── Generate embedding for a text using OpenAI ─────────
async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    console.error("OPENAI_API_KEY not set");
    return null;
  }

  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
      }),
    });

    if (!res.ok) {
      console.error("OpenAI embedding error:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    return data.data?.[0]?.embedding || null;
  } catch (e) {
    console.error("Embedding generation failed:", e);
    return null;
  }
}

// ─── Generate AI reasons using Lovable AI Gateway ───────
async function generateReasons(
  project: { name: string; description: string | null },
  suggestions: Array<{ id: string; full_name: string; company: string | null; position: string | null; similarity: number }>
): Promise<Record<string, string>> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey || suggestions.length === 0) return {};

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Jesteś Sovra — AI asystentka w systemie CRM. Dla każdego kontaktu napisz JEDNO krótkie zdanie po polsku DLACZEGO ta osoba może być wartościowa dla projektu. Odwołuj się do pozycji, branży lub firmy kontaktu i potrzeb projektu. Odpowiedz TYLKO JSON array: [{"contact_id": "...", "reason": "..."}]. Bez markdown, bez komentarzy.`,
          },
          {
            role: "user",
            content: JSON.stringify({
              project: { name: project.name, description: project.description || "brak opisu" },
              contacts: suggestions.map((s) => ({
                contact_id: s.id,
                full_name: s.full_name,
                company: s.company,
                position: s.position,
              })),
            }),
          },
        ],
        temperature: 0.4,
      }),
    });

    if (!res.ok) {
      console.warn("AI reason generation failed:", res.status);
      return {};
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response (handle markdown code blocks)
    const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(jsonStr) as Array<{ contact_id: string; reason: string }>;

    const map: Record<string, string> = {};
    for (const item of parsed) {
      if (item.contact_id && item.reason) {
        map[item.contact_id] = item.reason;
      }
    }
    return map;
  } catch (e) {
    console.warn("AI reason parsing failed (graceful fallback):", e);
    return {};
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
      return new Response(JSON.stringify({ error: "Only directors can use suggestions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit
    const allowed = await checkRateLimit(`sovra-suggest:${auth.directorId}`, 10, 60_000);
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse body
    const body = await req.json();
    const projectId = body.project_id;
    const limit = Math.min(Math.max(body.limit || 5, 1), 20);

    if (!projectId) {
      return new Response(JSON.stringify({ error: "project_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch project
    const { data: project, error: projErr } = await serviceClient
      .from("projects")
      .select("id, name, description, status, embedding")
      .eq("id", projectId)
      .eq("tenant_id", auth.tenantId)
      .single();

    if (projErr || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get existing contact IDs in project
    const { data: existingPc } = await serviceClient
      .from("project_contacts")
      .select("contact_id")
      .eq("project_id", projectId);

    const excludeIds = (existingPc || []).map((pc) => pc.contact_id);

    // Generate embedding on-the-fly if missing
    let projectEmbedding = project.embedding;
    if (!projectEmbedding) {
      // Get project contact names for richer embedding
      const { data: pcContacts } = await serviceClient
        .from("project_contacts")
        .select("contact:contacts(full_name)")
        .eq("project_id", projectId);

      const contactNames = (pcContacts || [])
        .map((pc: any) => pc.contact?.full_name)
        .filter(Boolean)
        .join(", ");

      const embeddingText = [
        project.name,
        project.description || "",
        `Status: ${project.status || ""}`,
        contactNames ? `Kontakty: ${contactNames}` : "",
      ]
        .filter(Boolean)
        .join(". ");

      const embedding = await generateEmbedding(embeddingText);
      if (!embedding) {
        return new Response(
          JSON.stringify({
            project_id: projectId,
            suggestions: [],
            error: "Could not generate project embedding",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Save for future use
      await serviceClient
        .from("projects")
        .update({ embedding: JSON.stringify(embedding) })
        .eq("id", projectId);

      projectEmbedding = embedding;
    }

    // Call similarity search function
    const { data: matches, error: matchErr } = await serviceClient.rpc(
      "match_contacts_by_project",
      {
        query_embedding: JSON.stringify(projectEmbedding),
        match_tenant_id: auth.tenantId,
        match_threshold: 0.6,
        match_count: limit,
        exclude_ids: excludeIds,
      }
    );

    if (matchErr) {
      console.error("match_contacts_by_project error:", matchErr);
      return new Response(
        JSON.stringify({ project_id: projectId, suggestions: [], error: matchErr.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const suggestions = (matches || []).map((m: any) => ({
      contact_id: m.id,
      full_name: m.full_name,
      company: m.company,
      position: m.position,
      similarity: m.similarity,
      reason: null as string | null,
    }));

    // Enrich with AI reasons (graceful — if fails, return without reasons)
    if (suggestions.length > 0) {
      const reasons = await generateReasons(
        { name: project.name, description: project.description },
        suggestions.map((s) => ({
          id: s.contact_id,
          full_name: s.full_name,
          company: s.company,
          position: s.position,
          similarity: s.similarity,
        }))
      );

      for (const s of suggestions) {
        s.reason = reasons[s.contact_id] || null;
      }
    }

    return new Response(
      JSON.stringify({ project_id: projectId, suggestions }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("sovra-suggest-contacts error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
