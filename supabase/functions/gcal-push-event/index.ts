// Sprint 14 — Push event to Google Calendar
// POST { calendar_id?, summary, description?, start, end, attendees?[], location? }

import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "zod";
import { verifyAuth, isAuthError, unauthorizedResponse } from "../_shared/auth.ts";
import { getValidAccessToken, GCAL_WRITE_SCOPE } from "../_shared/gcal.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

const BodySchema = z.object({
  calendar_id: z.string().optional(),
  summary: z.string().min(1).max(500),
  description: z.string().max(8000).optional(),
  location: z.string().max(500).optional(),
  start: z.string().min(1), // ISO 8601
  end: z.string().min(1),
  attendees: z.array(z.string().email()).optional(),
  all_day: z.boolean().optional(),
});

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const auth = await verifyAuth(req, supabase);
  if (isAuthError(auth)) return unauthorizedResponse(auth, corsHeaders);
  if (auth.userType !== "director" || !auth.directorId) {
    return jsonResponse({ error: "Only directors can push calendar events" }, 403);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(
      { error: "Validation error", details: parsed.error.flatten().fieldErrors },
      400,
    );
  }

  const tokenResult = await getValidAccessToken(supabase, auth.directorId);
  if (!tokenResult.ok) {
    return jsonResponse({ error: tokenResult.reason, message: tokenResult.message }, 200);
  }

  const { row, accessToken } = tokenResult;
  const grantedScopes = row.scopes ?? [];
  if (grantedScopes.length > 0 && !grantedScopes.includes(GCAL_WRITE_SCOPE)) {
    return jsonResponse(
      {
        error: "missing_scope",
        message: "Brak uprawnień zapisu w Google Calendar. Połącz ponownie w ustawieniach.",
      },
      200,
    );
  }

  const calendarId = parsed.data.calendar_id
    ?? (row.selected_calendars && row.selected_calendars.length > 0
      ? row.selected_calendars[0]
      : "primary");

  const eventBody: Record<string, unknown> = {
    summary: parsed.data.summary,
    description: parsed.data.description,
    location: parsed.data.location,
    start: parsed.data.all_day
      ? { date: parsed.data.start.slice(0, 10) }
      : { dateTime: parsed.data.start },
    end: parsed.data.all_day
      ? { date: parsed.data.end.slice(0, 10) }
      : { dateTime: parsed.data.end },
  };
  if (parsed.data.attendees && parsed.data.attendees.length > 0) {
    eventBody.attendees = parsed.data.attendees.map((email) => ({ email }));
  }

  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventBody),
    },
  );

  const data = await res.json();
  if (!res.ok) {
    console.error("[gcal-push-event] Google API error:", data);
    return jsonResponse(
      { error: "google_api_error", details: data },
      res.status >= 500 ? 502 : 400,
    );
  }

  // Cache the new event locally
  try {
    await supabase.from("gcal_events").upsert(
      {
        tenant_id: row.tenant_id,
        director_id: row.director_id,
        gcal_event_id: data.id,
        calendar_id: calendarId,
        summary: data.summary ?? parsed.data.summary,
        description: data.description ?? null,
        location: data.location ?? null,
        start_at: data.start?.dateTime ?? (data.start?.date ? `${data.start.date}T00:00:00Z` : null),
        end_at: data.end?.dateTime ?? (data.end?.date ? `${data.end.date}T00:00:00Z` : null),
        all_day: !data.start?.dateTime,
        attendees: data.attendees ?? [],
        html_link: data.htmlLink ?? null,
        synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "director_id,gcal_event_id,calendar_id" },
    );
  } catch (e) {
    console.warn("[gcal-push-event] cache upsert failed (non-fatal):", e);
  }

  return jsonResponse({
    ok: true,
    event_id: data.id,
    html_link: data.htmlLink,
    summary: data.summary,
  });
});
