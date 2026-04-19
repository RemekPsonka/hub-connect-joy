import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "zod";
import { verifyAuth, isAuthError, unauthorizedResponse } from "../_shared/auth.ts";
import { getValidAccessToken } from "../_shared/gcal.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("list-calendars") }),
  z.object({
    action: z.literal("get-events"),
    time_min: z.string(),
    time_max: z.string(),
    calendar_ids: z.array(z.string()).optional(),
  }),
]);

const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

interface GCalEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
  calendar_id: string;
  calendar_name: string;
  color: string;
  htmlLink: string;
}

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

  try {
    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse(
        { error: "Validation error", details: parsed.error.format() },
        400,
      );
    }

    const auth = await verifyAuth(req, supabase);
    if (isAuthError(auth)) return unauthorizedResponse(auth, corsHeaders);
    if (auth.userType !== "director" || !auth.directorId) {
      return jsonResponse({ error: "Only directors can access Google Calendar" }, 403);
    }

    const tokenResult = await getValidAccessToken(supabase, auth.directorId);
    if (!tokenResult.ok) {
      return jsonResponse({ error: tokenResult.reason, message: tokenResult.message }, 200);
    }

    const { accessToken, row } = tokenResult;
    const requestData = parsed.data;

    if (requestData.action === "list-calendars") {
      return await handleListCalendars(accessToken);
    }

    return await handleGetEvents(
      accessToken,
      requestData.time_min,
      requestData.time_max,
      requestData.calendar_ids,
      row.selected_calendars,
    );
  } catch (error) {
    console.error("gcal-events error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});

async function handleListCalendars(accessToken: string) {
  const res = await fetch(`${GOOGLE_CALENDAR_API}/users/me/calendarList`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    return jsonResponse({ error: "Failed to fetch calendars" }, 502);
  }
  const data = await res.json();
  const calendars = (data.items || []).map((cal: Record<string, unknown>) => ({
    id: cal.id as string,
    summary: (cal.summary as string) || (cal.id as string),
    backgroundColor: (cal.backgroundColor as string) || "#4285f4",
    accessRole: (cal.accessRole as string) || "reader",
    primary: !!(cal.primary as boolean),
  }));
  return jsonResponse({ calendars });
}

async function handleGetEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string,
  requestCalendarIds: string[] | undefined,
  storedSelectedCalendars: string[] | null,
) {
  const calendarIds: string[] =
    requestCalendarIds && requestCalendarIds.length > 0
      ? requestCalendarIds
      : storedSelectedCalendars && storedSelectedCalendars.length > 0
      ? storedSelectedCalendars
      : ["primary"];

  const allEvents: GCalEvent[] = [];
  let calendarsSynced = 0;
  const calendarMap = await fetchCalendarList(accessToken);

  for (const calendarId of calendarIds) {
    try {
      const events = await fetchCalendarEvents(accessToken, calendarId, timeMin, timeMax, calendarMap);
      allEvents.push(...events);
      calendarsSynced++;
    } catch (e) {
      console.warn(`Failed to fetch events for calendar ${calendarId}:`, e);
    }
  }

  allEvents.sort((a, b) => {
    const aTime = a.start.dateTime || a.start.date || "";
    const bTime = b.start.dateTime || b.start.date || "";
    return aTime.localeCompare(bTime);
  });

  return jsonResponse({ events: allEvents, calendars_synced: calendarsSynced });
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
      for (const cal of data.items || []) {
        map.set(cal.id, {
          name: cal.summary || cal.id,
          color: cal.backgroundColor || "#4285f4",
        });
      }
    }
  } catch (e) {
    console.warn("Failed to fetch calendar list:", e);
  }
  if (!map.has("primary")) {
    map.set("primary", { name: "Kalendarz główny", color: "#4285f4" });
  }
  return map;
}

async function fetchCalendarEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string,
  calendarMap: Map<string, { name: string; color: string }>,
): Promise<GCalEvent[]> {
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
    const errText = await res.text();
    throw new Error(`Calendar API error ${res.status}: ${errText}`);
  }
  const data = await res.json();
  const calInfo = calendarMap.get(calendarId) || { name: calendarId, color: "#4285f4" };
  return (data.items || []).map((event: Record<string, unknown>) => ({
    id: event.id as string,
    summary: (event.summary as string) || "(Brak tytułu)",
    description: event.description as string | undefined,
    start: event.start as { dateTime?: string; date?: string },
    end: event.end as { dateTime?: string; date?: string },
    location: event.location as string | undefined,
    calendar_id: calendarId,
    calendar_name: calInfo.name,
    color: calInfo.color,
    htmlLink: event.htmlLink as string,
  }));
}
