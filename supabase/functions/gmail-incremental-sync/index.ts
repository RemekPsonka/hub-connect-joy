// Sprint 16 — Incremental Gmail sync via history.list (cron, service-role)
import { createClient } from "npm:@supabase/supabase-js@2";
import { getValidAccessToken } from "../_shared/gcal.ts";
import { parseGmailMessage, extractAllEmails } from "../_shared/gmail-parse.ts";

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

interface HistoryRecord {
  messagesAdded?: Array<{ message: { id: string; threadId: string; labelIds?: string[] } }>;
  messagesDeleted?: Array<{ message: { id: string } }>;
  labelsAdded?: Array<{ message: { id: string }; labelIds: string[] }>;
  labelsRemoved?: Array<{ message: { id: string }; labelIds: string[] }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: tokens } = await supabase
    .from("gcal_tokens")
    .select("director_id, gmail_history_id")
    .not("gmail_history_id", "is", null);

  const results: Array<{ director_id: string; processed: number; error?: string }> = [];

  for (const t of (tokens ?? []) as Array<{ director_id: string; gmail_history_id: string }>) {
    try {
      const tok = await getValidAccessToken(supabase, t.director_id);
      if (!tok.ok) {
        results.push({ director_id: t.director_id, processed: 0, error: tok.message });
        continue;
      }

      // Build contact lookup once per director
      const { data: contacts } = await supabase
        .from("contacts")
        .select("id, email, email_secondary")
        .eq("director_id", t.director_id);
      const contactMap = new Map<string, string>();
      for (const c of (contacts ?? []) as Array<{ id: string; email: string | null; email_secondary: string | null }>) {
        if (c.email) contactMap.set(c.email.toLowerCase(), c.id);
        if (c.email_secondary) contactMap.set(c.email_secondary.toLowerCase(), c.id);
      }

      let pageToken: string | undefined;
      let processed = 0;
      let latestHistoryId = t.gmail_history_id;
      const startId = t.gmail_history_id;

      do {
        const url = `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${startId}${pageToken ? `&pageToken=${pageToken}` : ""}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${tok.accessToken}` } });
        if (res.status === 404) {
          // history too old → user needs full re-sync
          await supabase
            .from("gcal_tokens")
            .update({ gmail_history_id: null })
            .eq("director_id", t.director_id);
          break;
        }
        if (res.status === 429) {
          results.push({ director_id: t.director_id, processed, error: "rate_limited" });
          break;
        }
        if (!res.ok) {
          const err = await res.text();
          results.push({ director_id: t.director_id, processed, error: err });
          break;
        }
        const data = await res.json();
        if (data.historyId) latestHistoryId = String(data.historyId);

        const records: HistoryRecord[] = data.history ?? [];

        // Collect adds (dedupe by id)
        const addIds = new Set<string>();
        const deleteIds = new Set<string>();
        const labelChanges: Map<string, Set<string>> = new Map(); // messageId -> labels (final state TBD via fetch)

        for (const rec of records) {
          for (const a of rec.messagesAdded ?? []) addIds.add(a.message.id);
          for (const d of rec.messagesDeleted ?? []) deleteIds.add(d.message.id);
          for (const l of rec.labelsAdded ?? []) labelChanges.set(l.message.id, new Set());
          for (const l of rec.labelsRemoved ?? []) labelChanges.set(l.message.id, new Set());
        }

        // Deletions
        if (deleteIds.size > 0) {
          await supabase
            .from("gmail_messages")
            .delete()
            .eq("director_id", t.director_id)
            .in("gmail_message_id", [...deleteIds]);
        }

        // Adds (and label-only changes) → fetch full
        const fetchIds = new Set<string>([...addIds, ...labelChanges.keys()]);
        fetchIds.forEach((id) => deleteIds.has(id) && fetchIds.delete(id));

        const ids = [...fetchIds];
        for (let i = 0; i < ids.length; i += 10) {
          const slice = ids.slice(i, i + 10);
          const raws = await Promise.all(
            slice.map((id) =>
              fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`, {
                headers: { Authorization: `Bearer ${tok.accessToken}` },
              }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
            ),
          );

          for (const raw of raws) {
            if (!raw) continue;
            const msg = parseGmailMessage(raw);
            if (!msg.thread_id) continue;

            const addresses = [
              ...extractAllEmails(msg.from),
              ...extractAllEmails(msg.to),
              ...extractAllEmails(msg.cc),
            ];
            let contactId: string | null = null;
            for (const a of addresses) {
              const hit = contactMap.get(a);
              if (hit) {
                contactId = hit;
                break;
              }
            }

            const { data: threadRow } = await supabase
              .from("gmail_threads")
              .upsert(
                {
                  tenant_id: tok.row.tenant_id,
                  director_id: t.director_id,
                  gmail_thread_id: msg.thread_id,
                  subject: msg.subject,
                  snippet: msg.snippet,
                  last_message_at: msg.date,
                  contact_id: contactId,
                  label_ids: msg.labels,
                  is_unread: msg.is_unread,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "director_id,gmail_thread_id" },
              )
              .select("id")
              .single();

            if (!threadRow) continue;

            await supabase.from("gmail_messages").upsert(
              {
                tenant_id: tok.row.tenant_id,
                director_id: t.director_id,
                thread_id: threadRow.id,
                gmail_message_id: msg.message_id,
                from: msg.from,
                to: msg.to,
                cc: msg.cc,
                bcc: msg.bcc,
                subject: msg.subject,
                body_plain: msg.body_plain,
                body_html: msg.body_html,
                date: msg.date,
                labels: msg.labels,
                raw_headers: msg.headers,
              },
              { onConflict: "director_id,gmail_message_id" },
            );
            processed++;
          }
        }

        pageToken = data.nextPageToken;
      } while (pageToken);

      if (latestHistoryId !== t.gmail_history_id) {
        await supabase
          .from("gcal_tokens")
          .update({ gmail_history_id: latestHistoryId })
          .eq("director_id", t.director_id);
      }

      results.push({ director_id: t.director_id, processed });
    } catch (e) {
      results.push({ director_id: t.director_id, processed: 0, error: (e as Error).message });
    }
  }

  return jsonResponse({ ok: true, results });
});
