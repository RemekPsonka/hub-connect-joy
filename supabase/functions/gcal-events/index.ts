import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "zod";
import { verifyAuth, isAuthError, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EventsSchema = z.object({
  time_min: z.string(),
  time_max: z.string(),
  calendar_ids: z.array(z.string()).optional(),
});

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

  const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

  try {
    // 1. Validate body
    const body = await req.json();
    const parsed = EventsSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse(
        { error: "Validation error", details: parsed.error.format() },
        400
      );
    }

    // 2. Authenticate
    const auth = await verifyAuth(req, serviceClient);
    if (isAuthError(auth)) {
      return unauthorizedResponse(auth, corsHeaders);
    }

    if (auth.userType !== "director" || !auth.directorId) {
      return jsonResponse({ error: "Only directors can access Google Calendar" }, 403);
    }

    // 3. Fetch tokens
    const { data: tokenRow, error: tokenError } = await serviceClient
      .from("gcal_tokens")
      .select("*")
      .eq("director_id", auth.directorId)
      .eq("tenant_id", auth.tenantId)
      .maybeSingle();

    if (tokenError) {
      console.error("Token fetch error:", tokenError);
      return jsonResponse({ error: "Database error" }, 500);
    }

    if (!tokenRow) {
      return jsonResponse(
        { error: "not_connected", message: "Połącz Google Calendar w ustawieniach" },
        200
      );
    }

    // 4. Check token expiry & auto-refresh
    let accessToken = tokenRow.access_token;
    const expiresAt = new Date(tokenRow.expires_at);

    if (expiresAt <= new Date()) {
      const refreshResult = await refreshAccessToken(
        tokenRow.refresh_token,
        clientId,
        clientSecret,
        serviceClient,
        auth.directorId,
        auth.tenantId
      );

      if (!refreshResult.success) {
        return jsonResponse(
          { error: refreshResult.error, message: refreshResult.message },
          200
        );
      }

      accessToken = refreshResult.accessToken!;
    }

    // 5. Determine which calendars to fetch
    const calendarIds: string[] =
      parsed.data.calendar_ids && parsed.data.calendar_ids.length > 0
        ? parsed.data.calendar_ids
        : tokenRow.selected_calendars && (tokenRow.selected_calendars as string[]).length > 0
        ? (tokenRow.selected_calendars as string[])
        : ["primary"];

    // 6. Fetch events from each calendar
    const allEvents: GCalEvent[] = [];
    let calendarsSynced = 0;

    // Fetch calendar list for names/colors
    const calendarMap = await fetchCalendarList(accessToken);

    for (const calendarId of calendarIds) {
      try {
        const events = await fetchCalendarEvents(
          accessToken,
          calendarId,
          parsed.data.time_min,
          parsed.data.time_max,
          calendarMap
        );
        allEvents.push(...events);
        calendarsSynced++;
      } catch (e) {
        console.warn(`Failed to fetch events for calendar ${calendarId}:`, e);
      }
    }

    // 7. Sort chronologically
    allEvents.sort((a, b) => {
      const aTime = a.start.dateTime || a.start.date || "";
      const bTime = b.start.dateTime || b.start.date || "";
      return aTime.localeCompare(bTime);
    });

    return jsonResponse({ events: allEvents, calendars_synced: calendarsSynced });
  } catch (error) {
    console.error("gcal-events error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});

// ─── Refresh access token ────────────────────────────────────────────
async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
  serviceClient: ReturnType<typeof createClient>,
  directorId: string,
  tenantId: string
): Promise<{ success: boolean; accessToken?: string; error?: string; message?: string }> {
  try {
    const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.access_token) {
      console.error("Token refresh failed:", data);

      // If user revoked access, clean up
      if (data.error === "invalid_grant") {
        await serviceClient
          .from("gcal_tokens")
          .delete()
          .eq("director_id", directorId)
          .eq("tenant_id", tenantId);

        return {
          success: false,
          error: "disconnected",
          message: "Dostęp do Google Calendar został cofnięty. Połącz ponownie w ustawieniach.",
        };
      }

      return {
        success: false,
        error: "refresh_failed",
        message: "Nie udało się odświeżyć tokena. Spróbuj ponownie połączyć Google Calendar.",
      };
    }

    // Update token in database
    const newExpiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();

    await serviceClient
      .from("gcal_tokens")
      .update({
        access_token: data.access_token,
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("director_id", directorId)
      .eq("tenant_id", tenantId);

    return { success: true, accessToken: data.access_token };
  } catch (e) {
    console.error("Refresh error:", e);
    return { success: false, error: "refresh_error", message: "Błąd odświeżania tokena" };
  }
}

// ─── Fetch calendar list for names/colors ────────────────────────────
async function fetchCalendarList(
  accessToken: string
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

  // Ensure primary always has a fallback
  if (!map.has("primary")) {
    map.set("primary", { name: "Kalendarz główny", color: "#4285f4" });
  }

  return map;
}

// ─── Fetch events for a single calendar ──────────────────────────────
async function fetchCalendarEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string,
  calendarMap: Map<string, { name: string; color: string }>
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
    { headers: { Authorization: `Bearer ${accessToken}` } }
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
