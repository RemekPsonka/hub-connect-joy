import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyAuth, isAuthError, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Constants ───────────────────────────────────────────────────────
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// ─── System Prompt ───────────────────────────────────────────────────
const SOVRA_DEBRIEF_SYSTEM_PROMPT = `Jesteś Sovra — AI asystentka projektowa. Twoim zadaniem jest przetworzenie surowych notatek ze spotkania w ustrukturyzowany debrief.

ZASADY:
- Action items muszą być konkretne i actionable — nie ogólniki
- Jeśli z kontekstu wiadomo kto był na spotkaniu — użyj ich imion w follow_ups
- Priorytet action item: jeśli deadline < 3 dni → high/critical
- suggested_deadline: oblicz sensowny deadline na podstawie kontekstu (domyślnie +7 dni od dziś, format YYYY-MM-DD)
- NIE wymyślaj informacji których nie ma w tekście
- Jeśli tekst jest chaotyczny — uporządkuj, ale zachowaj wszystkie fakty
- summary: 2-3 zdania podsumowania
- key_points: najważniejsze punkty ze spotkania
- decisions: podjęte decyzje (może być pusta tablica)
- raw_note_cleaned: poprawione literówki, ustrukturyzowana, ale bez zmiany sensu
- meeting_sentiment: ocena ogólnego sentymentu spotkania
- Odpowiadaj po polsku`;

// ─── Helpers ─────────────────────────────────────────────────────────
function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── Rate Limiting via Upstash REST API ──────────────────────────────
async function checkRateLimit(directorId: string): Promise<{ allowed: boolean }> {
  const redisUrl = Deno.env.get("UPSTASH_REDIS_REST_URL");
  const redisToken = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

  if (!redisUrl || !redisToken) {
    console.warn("Upstash Redis not configured, skipping rate limit");
    return { allowed: true };
  }

  const key = `sovra-debrief:${directorId}`;
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  try {
    const pipelineBody = [
      ["ZREMRANGEBYSCORE", key, "0", String(windowStart)],
      ["ZCARD", key],
    ];

    const res = await fetch(`${redisUrl}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pipelineBody),
    });

    if (!res.ok) {
      console.warn("Redis pipeline error, allowing request:", res.status);
      return { allowed: true };
    }

    const results = await res.json();
    const currentCount = results[1]?.result ?? 0;

    if (currentCount >= RATE_LIMIT_MAX) {
      return { allowed: false };
    }

    // Add current timestamp
    await fetch(`${redisUrl}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["ZADD", key, String(now), `${now}-${crypto.randomUUID().slice(0, 8)}`],
        ["EXPIRE", key, "3600"],
      ]),
    });

    return { allowed: true };
  } catch (e) {
    console.warn("Rate limit check failed, allowing request:", e);
    return { allowed: true };
  }
}

// ─── Google Calendar Token Refresh ───────────────────────────────────
async function refreshGoogleToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
  serviceClient: ReturnType<typeof createClient>,
  directorId: string,
  tenantId: string
): Promise<string | null> {
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
      return null;
    }

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

    return data.access_token;
  } catch (e) {
    console.error("Google token refresh error:", e);
    return null;
  }
}

// ─── Fetch single GCal event details ─────────────────────────────────
interface GCalEventDetails {
  summary: string;
  start_time: string;
  end_time: string;
  location?: string;
  attendees: string[];
  description?: string;
}

async function fetchGCalEventDetails(
  serviceClient: ReturnType<typeof createClient>,
  directorId: string,
  tenantId: string,
  eventId: string,
  calendarId: string
): Promise<GCalEventDetails | null> {
  try {
    const { data: tokenRow } = await serviceClient
      .from("gcal_tokens")
      .select("*")
      .eq("director_id", directorId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (!tokenRow) return null;

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

    let accessToken = tokenRow.access_token;
    const expiresAt = new Date(tokenRow.expires_at);

    if (expiresAt <= new Date()) {
      const refreshed = await refreshGoogleToken(
        tokenRow.refresh_token,
        clientId,
        clientSecret,
        serviceClient,
        directorId,
        tenantId
      );
      if (!refreshed) return null;
      accessToken = refreshed;
    }

    const res = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!res.ok) {
      console.warn("Failed to fetch GCal event:", res.status);
      return null;
    }

    const event = await res.json();
    return {
      summary: event.summary || "(Brak tytułu)",
      start_time: event.start?.dateTime || event.start?.date || "",
      end_time: event.end?.dateTime || event.end?.date || "",
      location: event.location,
      attendees: (event.attendees || []).map((a: { email?: string; displayName?: string }) =>
        a.displayName || a.email || ""
      ).filter(Boolean),
      description: event.description?.slice(0, 500),
    };
  } catch (e) {
    console.error("fetchGCalEventDetails error:", e);
    return null;
  }
}

// ─── Build Context String ────────────────────────────────────────────
function buildDebriefContext(opts: {
  directorName: string;
  rawText: string;
  eventDetails?: GCalEventDetails | null;
  projectInfo?: { name: string; status: string; tasks: Array<{ title: string; status: string }> } | null;
  contacts?: Array<{ full_name: string; company?: string; position?: string }>;
}): string {
  const today = new Date().toISOString().split("T")[0];
  let text = `DANE DO ANALIZY DEBRIEFU\nDzisiejsza data: ${today}\nImię użytkownika: ${opts.directorName}\n\n`;

  if (opts.eventDetails) {
    text += `=== SPOTKANIE Z KALENDARZA ===\n`;
    text += `Tytuł: ${opts.eventDetails.summary}\n`;
    text += `Czas: ${opts.eventDetails.start_time} – ${opts.eventDetails.end_time}\n`;
    if (opts.eventDetails.location) text += `Miejsce: ${opts.eventDetails.location}\n`;
    if (opts.eventDetails.attendees.length > 0) {
      text += `Uczestnicy: ${opts.eventDetails.attendees.join(", ")}\n`;
    }
    if (opts.eventDetails.description) {
      text += `Opis wydarzenia: ${opts.eventDetails.description}\n`;
    }
    text += "\n";
  }

  if (opts.projectInfo) {
    text += `=== KONTEKST PROJEKTU ===\n`;
    text += `Nazwa: ${opts.projectInfo.name}\nStatus: ${opts.projectInfo.status}\n`;
    if (opts.projectInfo.tasks.length > 0) {
      text += `Otwarte zadania:\n`;
      for (const t of opts.projectInfo.tasks.slice(0, 10)) {
        text += `- ${t.title} [${t.status}]\n`;
      }
    }
    text += "\n";
  }

  if (opts.contacts && opts.contacts.length > 0) {
    text += `=== UCZESTNICY (z CRM) ===\n`;
    for (const c of opts.contacts) {
      text += `- ${c.full_name}`;
      if (c.position) text += `, ${c.position}`;
      if (c.company) text += ` (${c.company})`;
      text += "\n";
    }
    text += "\n";
  }

  text += `=== SUROWE NOTATKI UŻYTKOWNIKA ===\n${opts.rawText}\n`;

  return text;
}

// ─── Tool definition for structured output ───────────────────────────
const DEBRIEF_TOOL = {
  type: "function" as const,
  function: {
    name: "analyze_debrief",
    description: "Analizuj surowe notatki ze spotkania i zwróć ustrukturyzowany debrief.",
    parameters: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "2-3 zdania podsumowania spotkania",
        },
        key_points: {
          type: "array",
          items: { type: "string" },
          description: "Lista kluczowych punktów ze spotkania",
        },
        decisions: {
          type: "array",
          items: { type: "string" },
          description: "Lista podjętych decyzji (może być pusta)",
        },
        action_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Krótki tytuł zadania" },
              description: { type: "string", description: "Szczegółowy opis co trzeba zrobić" },
              priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
              suggested_deadline: { type: "string", description: "YYYY-MM-DD lub null" },
              suggested_assignee_hint: { type: "string", description: "Wskazówka kto powinien to zrobić" },
            },
            required: ["title", "description", "priority", "suggested_assignee_hint"],
            additionalProperties: false,
          },
          description: "Lista proponowanych zadań",
        },
        follow_ups: {
          type: "array",
          items: {
            type: "object",
            properties: {
              contact_name: { type: "string" },
              action: { type: "string", description: "Co trzeba zrobić z tą osobą" },
              urgency: { type: "string", enum: ["high", "medium", "low"] },
            },
            required: ["contact_name", "action", "urgency"],
            additionalProperties: false,
          },
          description: "Lista follow-upów z konkretnymi osobami",
        },
        meeting_sentiment: {
          type: "string",
          enum: ["positive", "neutral", "negative"],
          description: "Ogólny sentyment spotkania",
        },
        next_meeting_suggested: {
          type: "boolean",
          description: "Czy sugerowane jest kolejne spotkanie",
        },
        raw_note_cleaned: {
          type: "string",
          description: "Oczyszczona wersja notatki — poprawione literówki, ustrukturyzowana",
        },
      },
      required: [
        "summary",
        "key_points",
        "decisions",
        "action_items",
        "follow_ups",
        "meeting_sentiment",
        "next_meeting_suggested",
        "raw_note_cleaned",
      ],
      additionalProperties: false,
    },
  },
};

// ─── Fallback result ─────────────────────────────────────────────────
function fallbackResult(rawText: string) {
  return {
    summary: "Nie udało się przetworzyć notatki automatycznie. Poniżej surowy tekst.",
    key_points: [] as string[],
    decisions: [] as string[],
    action_items: [] as Array<Record<string, unknown>>,
    follow_ups: [] as Array<Record<string, unknown>>,
    meeting_sentiment: "neutral",
    next_meeting_suggested: false,
    raw_note_cleaned: rawText,
  };
}

// ─── Main Handler ────────────────────────────────────────────────────
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

  try {
    // 1. Authenticate
    const auth = await verifyAuth(req, serviceClient);
    if (isAuthError(auth)) {
      return unauthorizedResponse(auth, corsHeaders);
    }

    if (auth.userType !== "director" || !auth.directorId) {
      return jsonResponse({ error: "Sovra jest dostępna tylko dla dyrektorów" }, 403);
    }

    const { directorId, tenantId } = auth;

    // 2. Parse & validate body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const rawText = body.raw_text as string | undefined;
    if (!rawText || typeof rawText !== "string" || rawText.length < 10 || rawText.length > 5000) {
      return jsonResponse({ error: "raw_text musi mieć od 10 do 5000 znaków" }, 400);
    }

    const gcalEventId = body.gcal_event_id as string | undefined;
    const gcalCalendarId = body.gcal_calendar_id as string | undefined;
    const projectId = body.project_id as string | undefined;
    const contactIds = body.contact_ids as string[] | undefined;

    // 3. Rate limit
    const rateLimit = await checkRateLimit(directorId);
    if (!rateLimit.allowed) {
      return jsonResponse(
        { error: "rate_limit", message: "Max 10 debriefów na godzinę. Spróbuj za chwilę." },
        429
      );
    }

    // 4. Fetch context in parallel
    const [directorRow, eventDetails, projectInfo, contactsData] = await Promise.all([
      // Director name
      serviceClient
        .from("directors")
        .select("full_name")
        .eq("id", directorId)
        .single()
        .then(({ data }) => data),

      // GCal event (if provided)
      gcalEventId && gcalCalendarId
        ? fetchGCalEventDetails(serviceClient, directorId, tenantId, gcalEventId, gcalCalendarId)
        : Promise.resolve(null),

      // Project info (if provided)
      projectId
        ? (async () => {
            const { data: proj } = await serviceClient
              .from("projects")
              .select("name, status")
              .eq("id", projectId)
              .eq("tenant_id", tenantId)
              .single();

            if (!proj) return null;

            const { data: tasks } = await serviceClient
              .from("tasks")
              .select("title, status")
              .eq("project_id", projectId)
              .eq("tenant_id", tenantId)
              .neq("status", "done")
              .limit(10);

            return {
              name: proj.name,
              status: proj.status || "unknown",
              tasks: (tasks || []) as Array<{ title: string; status: string }>,
            };
          })()
        : Promise.resolve(null),

      // Contacts (if provided)
      contactIds && contactIds.length > 0
        ? serviceClient
            .from("contacts")
            .select("full_name, company, position")
            .in("id", contactIds.slice(0, 10))
            .eq("tenant_id", tenantId)
            .then(({ data }) => data || [])
        : Promise.resolve([]),
    ]);

    const directorName = directorRow?.full_name?.split(" ")[0] || "Użytkowniku";

    // 5. Build context string
    const contextString = buildDebriefContext({
      directorName,
      rawText,
      eventDetails,
      projectInfo,
      contacts: contactsData as Array<{ full_name: string; company?: string; position?: string }>,
    });

    // 6. Call AI Gateway with tool calling
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      console.error("LOVABLE_API_KEY not configured");
      return jsonResponse({ error: "AI service not configured" }, 500);
    }

    let debriefResult: Record<string, unknown>;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000); // 45s timeout

      const aiResponse = await fetch(AI_GATEWAY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SOVRA_DEBRIEF_SYSTEM_PROMPT },
            { role: "user", content: contextString },
          ],
          tools: [DEBRIEF_TOOL],
          tool_choice: { type: "function", function: { name: "analyze_debrief" } },
          temperature: 0.4,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!aiResponse.ok) {
        if (aiResponse.status === 429) {
          return jsonResponse({ error: "rate_limit", message: "Zbyt wiele zapytań AI. Spróbuj za chwilę." }, 429);
        }
        if (aiResponse.status === 402) {
          return jsonResponse({ error: "payment_required", message: "Wymagana płatność — doładuj kredyty AI." }, 402);
        }
        const errText = await aiResponse.text();
        console.error("AI Gateway error:", aiResponse.status, errText);
        debriefResult = fallbackResult(rawText);
      } else {
        const aiData = await aiResponse.json();

        // Parse tool call response
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          try {
            const args = typeof toolCall.function.arguments === "string"
              ? JSON.parse(toolCall.function.arguments)
              : toolCall.function.arguments;
            debriefResult = args;
          } catch (parseErr) {
            console.error("Failed to parse tool call arguments:", parseErr);
            debriefResult = fallbackResult(rawText);
          }
        } else {
          // Fallback: try to parse content as JSON (some models return content instead)
          const content = aiData.choices?.[0]?.message?.content;
          if (content) {
            try {
              // Strip markdown code block if present
              const cleaned = content.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "");
              debriefResult = JSON.parse(cleaned);
            } catch {
              console.warn("AI returned non-tool, non-JSON content");
              debriefResult = fallbackResult(rawText);
            }
          } else {
            debriefResult = fallbackResult(rawText);
          }
        }
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        console.error("AI Gateway timeout (45s)");
      } else {
        console.error("AI Gateway call failed:", e);
      }
      debriefResult = fallbackResult(rawText);
    }

    // 7. Save session to sovra_sessions
    const sessionTitle =
      eventDetails?.summary
        ? `Debrief: ${eventDetails.summary.slice(0, 50)}`
        : `Debrief: ${rawText.slice(0, 50)}${rawText.length > 50 ? "…" : ""}`;

    const { data: session } = await serviceClient
      .from("sovra_sessions")
      .insert({
        tenant_id: tenantId,
        director_id: directorId,
        type: "debrief",
        title: sessionTitle,
        content: {
          ...debriefResult,
          raw_text: rawText,
          gcal_event_id: gcalEventId || null,
          project_id: projectId || null,
          contact_ids: contactIds || [],
        },
        tasks_created: 0,
        notes_created: 0,
        metadata: {
          event_details: eventDetails || null,
          project_name: projectInfo?.name || null,
        },
      })
      .select("id")
      .single();

    // 8. Save project note if project_id provided
    let noteId: string | null = null;
    if (projectId && debriefResult.raw_note_cleaned) {
      const { data: note } = await serviceClient
        .from("project_notes")
        .insert({
          tenant_id: tenantId,
          project_id: projectId,
          content: debriefResult.raw_note_cleaned as string,
          source: "sovra_debrief",
          created_by: directorId,
        })
        .select("id")
        .single();

      noteId = note?.id || null;

      // Update notes_created count
      if (noteId && session?.id) {
        await serviceClient
          .from("sovra_sessions")
          .update({ notes_created: 1 })
          .eq("id", session.id);
      }
    }

    // 9. Return response
    return jsonResponse({
      session_id: session?.id || null,
      summary: debriefResult.summary,
      key_points: debriefResult.key_points || [],
      decisions: debriefResult.decisions || [],
      action_items: debriefResult.action_items || [],
      follow_ups: debriefResult.follow_ups || [],
      meeting_sentiment: debriefResult.meeting_sentiment || "neutral",
      next_meeting_suggested: debriefResult.next_meeting_suggested || false,
      raw_note_cleaned: debriefResult.raw_note_cleaned || rawText,
      note_saved: !!noteId,
      note_id: noteId,
    });
  } catch (error) {
    console.error("sovra-debrief error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
