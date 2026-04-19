// Sprint 16 — Daily Gmail labels sync (cron, service-role)
import { createClient } from "npm:@supabase/supabase-js@2";
import { getValidAccessToken } from "../_shared/gcal.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

interface GmailLabel {
  id: string;
  name: string;
  type?: string;
  color?: { textColor?: string; backgroundColor?: string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: tokens } = await supabase
    .from("gcal_tokens")
    .select("director_id, tenant_id");

  const results: Array<{ director_id: string; count: number; error?: string }> = [];

  for (const t of (tokens ?? []) as Array<{ director_id: string; tenant_id: string }>) {
    try {
      const tok = await getValidAccessToken(supabase, t.director_id);
      if (!tok.ok) {
        results.push({ director_id: t.director_id, count: 0, error: tok.message });
        continue;
      }
      const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/labels", {
        headers: { Authorization: `Bearer ${tok.accessToken}` },
      });
      if (!res.ok) {
        results.push({ director_id: t.director_id, count: 0, error: `gmail_${res.status}` });
        continue;
      }
      const data = await res.json();
      const labels: GmailLabel[] = data.labels ?? [];

      let count = 0;
      for (const l of labels) {
        await supabase.from("gmail_labels").upsert(
          {
            tenant_id: t.tenant_id,
            director_id: t.director_id,
            gmail_label_id: l.id,
            name: l.name,
            type: l.type ?? null,
            color: l.color ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "director_id,gmail_label_id" },
        );
        count++;
      }
      results.push({ director_id: t.director_id, count });
    } catch (e) {
      results.push({ director_id: t.director_id, count: 0, error: (e as Error).message });
    }
  }

  return jsonResponse({ ok: true, results });
});
