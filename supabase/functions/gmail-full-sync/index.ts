// Sprint 16 — Initial Gmail full sync (last N days, paginated, resumable)
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { requireAuth } from "../_shared/auth.ts";
import { getValidAccessToken } from "../_shared/gcal.ts";
import { parseGmailMessage, extractAllEmails, extractEmail } from "../_shared/gmail-parse.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const Body = z.object({
  days_back: z.number().int().min(1).max(365).optional().default(30),
  page_token: z.string().optional(),
  max_messages: z.number().int().min(1).max(500).optional().default(300),
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

async function gmailGet(accessToken: string, path: string): Promise<Response> {
  return await fetch(`https://gmail.googleapis.com${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function fetchMessage(accessToken: string, id: string) {
  const r = await gmailGet(accessToken, `/gmail/v1/users/me/messages/${id}?format=full`);
  if (!r.ok) return null;
  return await r.json();
}

async function buildContactLookup(supabase: ReturnType<typeof createClient>, directorId: string) {
  const { data } = await supabase
    .from("contacts")
    .select("id, email, email_secondary")
    .eq("director_id", directorId);
  const map = new Map<string, string>();
  for (const c of (data ?? []) as Array<{ id: string; email: string | null; email_secondary: string | null }>) {
    if (c.email) map.set(c.email.toLowerCase(), c.id);
    if (c.email_secondary) map.set(c.email_secondary.toLowerCase(), c.id);
  }
  return map;
}

function findContactId(map: Map<string, string>, addresses: string[]): string | null {
  for (const a of addresses) {
    const hit = map.get(a);
    if (hit) return hit;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const auth = await requireAuth(req);
  if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status);
  if (auth.userType !== "director" || !auth.directorId) {
    return jsonResponse({ error: "director_only" }, 403);
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonResponse({ error: parsed.error.flatten() }, 400);
  const { days_back, page_token, max_messages } = parsed.data;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const tok = await getValidAccessToken(supabase, auth.directorId);
  if (!tok.ok) return jsonResponse({ error: tok.message }, 400);

  const contactMap = await buildContactLookup(supabase, auth.directorId);

  let pageToken: string | undefined = page_token;
  let processed = 0;
  let nextPage: string | undefined;
  const q = encodeURIComponent(`newer_than:${days_back}d`);

  while (processed < max_messages) {
    const url = `/gmail/v1/users/me/messages?q=${q}&maxResults=100${pageToken ? `&pageToken=${pageToken}` : ""}`;
    const listRes = await gmailGet(tok.accessToken, url);
    if (!listRes.ok) {
      const err = await listRes.text();
      return jsonResponse({ error: `gmail_list_failed: ${err}` }, 500);
    }
    const list = await listRes.json();
    const ids: string[] = (list.messages ?? []).map((m: { id: string }) => m.id);
    if (ids.length === 0) {
      nextPage = undefined;
      break;
    }

    // Batch in groups of 10
    for (let i = 0; i < ids.length && processed < max_messages; i += 10) {
      const slice = ids.slice(i, Math.min(i + 10, ids.length, i + (max_messages - processed)));
      const raws = await Promise.all(slice.map((id) => fetchMessage(tok.accessToken, id)));

      for (const raw of raws) {
        if (!raw) continue;
        const parsedMsg = parseGmailMessage(raw);
        if (!parsedMsg.thread_id) continue;

        const addresses = [
          ...extractAllEmails(parsedMsg.from),
          ...extractAllEmails(parsedMsg.to),
          ...extractAllEmails(parsedMsg.cc),
        ];
        const contactId = findContactId(contactMap, addresses);

        // Upsert thread
        const { data: threadRow, error: threadErr } = await supabase
          .from("gmail_threads")
          .upsert(
            {
              tenant_id: tok.row.tenant_id,
              director_id: auth.directorId,
              gmail_thread_id: parsedMsg.thread_id,
              subject: parsedMsg.subject,
              snippet: parsedMsg.snippet,
              last_message_at: parsedMsg.date,
              contact_id: contactId,
              label_ids: parsedMsg.labels,
              is_unread: parsedMsg.is_unread,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "director_id,gmail_thread_id" },
          )
          .select("id")
          .single();

        if (threadErr || !threadRow) {
          console.error("thread upsert failed", threadErr);
          continue;
        }

        await supabase.from("gmail_messages").upsert(
          {
            tenant_id: tok.row.tenant_id,
            director_id: auth.directorId,
            thread_id: threadRow.id,
            gmail_message_id: parsedMsg.message_id,
            from: parsedMsg.from,
            to: parsedMsg.to,
            cc: parsedMsg.cc,
            bcc: parsedMsg.bcc,
            subject: parsedMsg.subject,
            body_plain: parsedMsg.body_plain,
            body_html: parsedMsg.body_html,
            date: parsedMsg.date,
            labels: parsedMsg.labels,
            raw_headers: parsedMsg.headers,
          },
          { onConflict: "director_id,gmail_message_id" },
        );

        processed++;
      }
    }

    pageToken = list.nextPageToken;
    if (!pageToken) {
      nextPage = undefined;
      break;
    }
    if (processed >= max_messages) {
      nextPage = pageToken;
      break;
    }
  }

  // Recompute message_count per affected threads (cheap MVP: skip; rely on triggers later)
  // Persist historyId only when the entire backfill is complete (no nextPage).
  if (!nextPage) {
    const profileRes = await gmailGet(tok.accessToken, "/gmail/v1/users/me/profile");
    if (profileRes.ok) {
      const profile = await profileRes.json();
      await supabase
        .from("gcal_tokens")
        .update({
          gmail_history_id: profile.historyId ?? null,
          gmail_initial_synced_at: new Date().toISOString(),
        })
        .eq("id", tok.row.id);
    }

    await supabase.from("audit_log").insert({
      tenant_id: tok.row.tenant_id,
      actor_id: auth.directorId,
      entity_type: "contact",
      action: "email_full_synced",
      metadata: { days_back, processed },
    });
  }

  return jsonResponse({ ok: true, processed, has_more: !!nextPage, next_page_token: nextPage ?? null });
});
