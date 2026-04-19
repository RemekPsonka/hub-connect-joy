// Sprint 14 — Cron-triggered: refresh gcal_events cache for all connected directors.
// Triggered every 15 minutes via pg_cron job `gcal_sync_events_15min`.
// Auth: requires service_role bearer (cron uses vault.service_role_key).

import { createClient } from "npm:@supabase/supabase-js@2";
import { getRefreshToken, refreshAccessToken, type GCalTokenRow } from "../_shared/gcal.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Verify caller is service_role (cron) — required because verify_jwt is disabled
  const authHeader = req.headers.get("Authorization") ?? "";
  const expected = `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`;
  if (authHeader !== expected) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const startedAt = Date.now();
  let totalEvents = 0;
  let directorsProcessed = 0;
  let errors = 0;

  try {
    const { data: tokens, error } = await supabase
      .from("gcal_tokens")
      .select(
        "id, tenant_id, director_id, refresh_token_encrypted, refresh_token_iv, deprecated_refresh_token_20260419, selected_calendars, scopes, connected_email",
      );

    if (error) throw error;

    for (const raw of tokens ?? []) {
      const row = raw as unknown as GCalTokenRow;
      try {
        const refresh = await getRefreshToken(supabase, row);
        if (!refresh) {
          console.warn(`[gcal-sync] director ${row.director_id} has no refresh token, skipping`);
          continue;
        }

        const tokenResult = await refreshAccessToken(refresh);
        if ("error" in tokenResult) {
          console.warn(`[gcal-sync] refresh failed for ${row.director_id}: ${tokenResult.error}`);
          if (tokenResult.error === "invalid_grant") {
            await supabase.from("gcal_tokens").delete().eq("id", row.id);
          }
          errors++;
          continue;
        }

        const calendarIds: string[] =
          row.selected_calendars && row.selected_calendars.length > 0
            ? row.selected_calendars
            : ["primary"];

        const calendarMap = await fetchCalendarList(tokenResult.access_token);

        const timeMin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        for (const calId of calendarIds) {
          try {
            const events = await fetchCalendarEvents(
              tokenResult.access_token,
              calId,
              timeMin,
              timeMax,
            );
            const calInfo = calendarMap.get(calId) ?? { name: calId, color: "#4285f4" };

            const rows = events.map((ev) => ({
              tenant_id: row.tenant_id,
              director_id: row.director_id,
              gcal_event_id: ev.id,
              calendar_id: calId,
              calendar_name: calInfo.name,
              calendar_color: calInfo.color,
              summary: ev.summary ?? "(Brak tytułu)",
              description: ev.description ?? null,
              location: ev.location ?? null,
              start_at: ev.start?.dateTime ?? (ev.start?.date ? `${ev.start.date}T00:00:00Z` : null),
              end_at: ev.end?.dateTime ?? (ev.end?.date ? `${ev.end.date}T00:00:00Z` : null),
              all_day: !ev.start?.dateTime,
              attendees: ev.attendees ?? [],
              html_link: ev.htmlLink ?? null,
              synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }));

            if (rows.length > 0) {
              const { error: upErr } = await supabase
                .from("gcal_events")
                .upsert(rows, { onConflict: "director_id,gcal_event_id,calendar_id" });
              if (upErr) {
                console.error(`[gcal-sync] upsert error ${row.director_id}/${calId}:`, upErr);
                errors++;
              } else {
                totalEvents += rows.length;
              }
            }
          } catch (e) {
            console.warn(`[gcal-sync] fetch failed ${row.director_id}/${calId}:`, e);
            errors++;
          }
        }

        directorsProcessed++;
      } catch (e) {
        console.error(`[gcal-sync] director ${row.director_id} failed:`, e);
        errors++;
      }
    }

    const summary = {
      ok: true,
      directors_processed: directorsProcessed,
      events_synced: totalEvents,
      errors,
      duration_ms: Date.now() - startedAt,
    };
    console.log("[gcal-sync] done:", summary);
    return jsonResponse(summary);
  } catch (e) {
    console.error("[gcal-sync] fatal:", e);
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});

interface RawGCalEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: unknown[];
  htmlLink?: string;
}

async function fetchCalendarList(
  accessToken: string,
): Promise<Map<string, { name: string; color: string }>> {
  const map = new Map<string, { name: string; color: string }>();
  try {
    const res = await fetch(`${GOOGLE_CALENDAR_API}/users/me/calendarList`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      for (const cal of data.items ?? []) {
        map.set(cal.id, {
          name: cal.summary || cal.id,
          color: cal.backgroundColor || "#4285f4",
        });
      }
    }
  } catch (e) {
    console.warn("calendarList failed:", e);
  }
  if (!map.has("primary")) map.set("primary", { name: "Kalendarz główny", color: "#4285f4" });
  return map;
}

async function fetchCalendarEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string,
): Promise<RawGCalEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });
  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Calendar API error ${res.status}: ${txt}`);
  }
  const data = await res.json();
  return (data.items ?? []) as RawGCalEvent[];
}
