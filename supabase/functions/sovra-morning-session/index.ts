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
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_CONTEXT_LENGTH = 12000; // ~4000 tokens approx

// ─── System Prompt ───────────────────────────────────────────────────
const SOVRA_MORNING_SYSTEM_PROMPT = `Jesteś Sovra — inteligentna asystentka projektowa w systemie CRM. Mówisz po polsku.

STYL KOMUNIKACJI:
- Pewna siebie, konkretna, rzeczowa
- Profesjonalna ale z ciepłem — nie zimna, nie nadmiernie entuzjastyczna
- Zwracasz się po imieniu do użytkownika
- Używasz emoji oszczędnie (max 3-4 na cały brief)
- Zorientowana na działanie — mówisz CO zrobić, nie tylko CO jest
- Krótkie zdania, bez lania wody

FORMAT PORANNEGO BRIEFU:
1. POWITANIE — krótkie, z imieniem, nawiązanie do dnia tygodnia lub pory roku
2. PODSUMOWANIE WCZORAJ — co udało się zrobić (tasks done yesterday), krótko
3. PRIORYTETY NA DZIŚ — TOP 3 najważniejsze zadania z uzasadnieniem priorytetyzacji
4. SPOTKANIA — lista dzisiejszych spotkań z czasami i krótkimi wskazówkami przygotowawczymi
5. ZALEGŁOŚCI — jeśli są overdue tasks, wymień z łagodnym ale konkretnym przypomnieniem
6. PROJEKTY — status aktywnych projektów, 1 zdanie na projekt
7. MOTYWACJA — jedno krótkie zdanie motywujące na koniec

ZASADY:
- Jeśli brak spotkań — napisz 'Dziś bez spotkań — pełny focus na zadania.'
- Jeśli brak zaległości — napisz 'Czysto, żadnych zaległości. Tak trzymaj.'
- Jeśli jest piątek — dodaj wzmiankę o planowaniu na przyszły tydzień
- Jeśli jest poniedziałek — dodaj energetyczne powitanie nowego tygodnia
- Priorytetyzuj: deadline dziś > overdue > high priority > reszta
- NIE wymyślaj danych — używaj TYLKO tego co dostałeś w kontekście`;

// ─── Helpers ─────────────────────────────────────────────────────────
function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function todayDate(): string {
  return new Date().toISOString().split("T")[0];
}

function yesterdayDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "\n...(skrócono ze względu na limit)";
}

// ─── Rate Limiting via Upstash REST API ──────────────────────────────
async function checkRateLimit(directorId: string): Promise<{ allowed: boolean; remaining: number }> {
  const redisUrl = Deno.env.get("UPSTASH_REDIS_REST_URL");
  const redisToken = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

  if (!redisUrl || !redisToken) {
    console.warn("Upstash Redis not configured, skipping rate limit");
    return { allowed: true, remaining: RATE_LIMIT_MAX };
  }

  const key = `sovra-morning:${directorId}`;
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  try {
    // Pipeline: ZREMRANGEBYSCORE (cleanup old) + ZADD (add current) + ZCARD (count)
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
      return { allowed: true, remaining: RATE_LIMIT_MAX };
    }

    const results = await res.json();
    const currentCount = results[1]?.result ?? 0;

    if (currentCount >= RATE_LIMIT_MAX) {
      return { allowed: false, remaining: 0 };
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

    return { allowed: true, remaining: RATE_LIMIT_MAX - currentCount - 1 };
  } catch (e) {
    console.warn("Rate limit check failed, allowing request:", e);
    return { allowed: true, remaining: RATE_LIMIT_MAX };
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

// ─── Fetch Today's Google Calendar Events ────────────────────────────
interface SimpleGCalEvent {
  summary: string;
  start_time: string;
  end_time: string;
  location?: string;
  calendar_name: string;
}

async function fetchTodayGCalEvents(
  serviceClient: ReturnType<typeof createClient>,
  directorId: string,
  tenantId: string
): Promise<SimpleGCalEvent[]> {
  try {
    const { data: tokenRow } = await serviceClient
      .from("gcal_tokens")
      .select("*")
      .eq("director_id", directorId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (!tokenRow) return [];

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
      if (!refreshed) return [];
      accessToken = refreshed;
    }

    // Get today's time range
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

    // Determine calendars to fetch
    const calendarIds: string[] =
      (tokenRow.selected_calendars as string[] | null)?.length
        ? (tokenRow.selected_calendars as string[])
        : ["primary"];

    // Fetch calendar names
    const calendarMap = new Map<string, string>();
    try {
      const calRes = await fetch(`${GOOGLE_CALENDAR_API}/users/me/calendarList`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (calRes.ok) {
        const calData = await calRes.json();
        for (const cal of calData.items || []) {
          calendarMap.set(cal.id, cal.summary || cal.id);
        }
      }
    } catch (_e) {
      // Ignore calendar list errors
    }

    const allEvents: SimpleGCalEvent[] = [];

    for (const calendarId of calendarIds) {
      try {
        const params = new URLSearchParams({
          timeMin: todayStart,
          timeMax: todayEnd,
          singleEvents: "true",
          orderBy: "startTime",
          maxResults: "50",
        });

        const res = await fetch(
          `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (res.ok) {
          const data = await res.json();
          for (const event of data.items || []) {
            allEvents.push({
              summary: event.summary || "(Brak tytułu)",
              start_time: event.start?.dateTime || event.start?.date || "",
              end_time: event.end?.dateTime || event.end?.date || "",
              location: event.location,
              calendar_name: calendarMap.get(calendarId) || calendarId,
            });
          }
        }
      } catch (e) {
        console.warn(`Failed to fetch events for ${calendarId}:`, e);
      }
    }

    // Sort by start time
    allEvents.sort((a, b) => a.start_time.localeCompare(b.start_time));
    return allEvents;
  } catch (e) {
    console.error("fetchTodayGCalEvents error:", e);
    return [];
  }
}

// ─── Build Context String ────────────────────────────────────────────
interface ContextData {
  directorName: string;
  tasksToday: Array<{ id: string; title: string; priority?: string; due_date?: string; project_name?: string }>;
  tasksOverdue: Array<{ id: string; title: string; priority?: string; due_date?: string; project_name?: string }>;
  tasksDoneYesterday: Array<{ id: string; title: string }>;
  activeProjects: Array<{ id: string; name: string; status?: string }>;
  todayEvents: SimpleGCalEvent[];
  unreadReminders: Array<{ id: string; message: string; type: string }>;
  recentNotes: Array<{ content?: string; project_name?: string; created_at?: string }>;
}

function buildContextString(ctx: ContextData): string {
  const now = new Date();
  const dayNames = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];
  const dayOfWeek = dayNames[now.getDay()];

  let text = `DANE KONTEKSTOWE DLA PORANNEGO BRIEFU
Dzień: ${dayOfWeek}, ${todayDate()}
Imię użytkownika: ${ctx.directorName}

`;

  // Tasks done yesterday
  text += `=== ZADANIA ZROBIONE WCZORAJ (${ctx.tasksDoneYesterday.length}) ===\n`;
  if (ctx.tasksDoneYesterday.length === 0) {
    text += "Brak ukończonych zadań wczoraj.\n";
  } else {
    for (const t of ctx.tasksDoneYesterday.slice(0, 10)) {
      text += `- ${t.title}\n`;
    }
  }

  // Tasks today
  text += `\n=== ZADANIA NA DZIŚ (${ctx.tasksToday.length}) ===\n`;
  if (ctx.tasksToday.length === 0) {
    text += "Brak zadań na dziś.\n";
  } else {
    for (const t of ctx.tasksToday.slice(0, 15)) {
      const priority = t.priority ? ` [${t.priority}]` : "";
      const project = t.project_name ? ` (projekt: ${t.project_name})` : "";
      text += `- ${t.title}${priority}${project}\n`;
    }
  }

  // Overdue tasks
  text += `\n=== ZADANIA ZALEGŁE (${ctx.tasksOverdue.length}) ===\n`;
  if (ctx.tasksOverdue.length === 0) {
    text += "Brak zaległych zadań.\n";
  } else {
    for (const t of ctx.tasksOverdue.slice(0, 10)) {
      const dueInfo = t.due_date ? ` (termin: ${t.due_date})` : "";
      text += `- ${t.title}${dueInfo}\n`;
    }
  }

  // Events
  text += `\n=== SPOTKANIA DZIŚ (${ctx.todayEvents.length}) ===\n`;
  if (ctx.todayEvents.length === 0) {
    text += "Brak spotkań na dziś.\n";
  } else {
    for (const e of ctx.todayEvents.slice(0, 10)) {
      const time = e.start_time.includes("T")
        ? e.start_time.split("T")[1]?.slice(0, 5)
        : "cały dzień";
      const endTime = e.end_time.includes("T")
        ? e.end_time.split("T")[1]?.slice(0, 5)
        : "";
      const location = e.location ? ` | Miejsce: ${e.location}` : "";
      text += `- ${time}${endTime ? `–${endTime}` : ""}: ${e.summary} (${e.calendar_name})${location}\n`;
    }
  }

  // Active projects
  text += `\n=== AKTYWNE PROJEKTY (${ctx.activeProjects.length}) ===\n`;
  if (ctx.activeProjects.length === 0) {
    text += "Brak aktywnych projektów.\n";
  } else {
    for (const p of ctx.activeProjects.slice(0, 10)) {
      text += `- ${p.name} [status: ${p.status || "brak"}]\n`;
    }
  }

  // Reminders
  if (ctx.unreadReminders.length > 0) {
    text += `\n=== NIEPRZECZYTANE PRZYPOMNIENIA (${ctx.unreadReminders.length}) ===\n`;
    for (const r of ctx.unreadReminders.slice(0, 5)) {
      text += `- [${r.type}] ${r.message}\n`;
    }
  }

  // Recent notes
  if (ctx.recentNotes.length > 0) {
    text += `\n=== OSTATNIE NOTATKI ===\n`;
    for (const n of ctx.recentNotes.slice(0, 3)) {
      const project = n.project_name ? ` (${n.project_name})` : "";
      const content = (n.content || "").slice(0, 100);
      text += `- ${content}${project}\n`;
    }
  }

  return truncate(text, MAX_CONTEXT_LENGTH);
}

// ─── Generate Fallback Brief ─────────────────────────────────────────
function generateFallbackBrief(ctx: ContextData): string {
  let brief = `Dzień dobry, ${ctx.directorName}. Nie udało mi się wygenerować pełnego briefu. Oto Twoje dane na dziś:\n\n`;

  if (ctx.tasksToday.length > 0) {
    brief += `📋 **Zadania na dziś (${ctx.tasksToday.length}):**\n`;
    for (const t of ctx.tasksToday.slice(0, 5)) {
      brief += `- ${t.title}\n`;
    }
    brief += "\n";
  }

  if (ctx.tasksOverdue.length > 0) {
    brief += `⚠️ **Zaległe (${ctx.tasksOverdue.length}):**\n`;
    for (const t of ctx.tasksOverdue.slice(0, 5)) {
      brief += `- ${t.title} (termin: ${t.due_date || "?"})\n`;
    }
    brief += "\n";
  }

  if (ctx.todayEvents.length > 0) {
    brief += `📅 **Spotkania dziś (${ctx.todayEvents.length}):**\n`;
    for (const e of ctx.todayEvents.slice(0, 5)) {
      const time = e.start_time.includes("T")
        ? e.start_time.split("T")[1]?.slice(0, 5)
        : "cały dzień";
      brief += `- ${time}: ${e.summary}\n`;
    }
    brief += "\n";
  }

  if (ctx.activeProjects.length > 0) {
    brief += `🗂 **Aktywne projekty (${ctx.activeProjects.length}):**\n`;
    for (const p of ctx.activeProjects.slice(0, 5)) {
      brief += `- ${p.name}\n`;
    }
  }

  if (ctx.tasksToday.length === 0 && ctx.tasksOverdue.length === 0 && ctx.todayEvents.length === 0) {
    brief += "Czysty dzień — czas na planowanie nowych rzeczy.\n";
  }

  return brief;
}

// ─── Call Lovable AI Gateway ─────────────────────────────────────────
async function callAIGateway(contextString: string): Promise<string | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    console.error("LOVABLE_API_KEY not configured");
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const res = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SOVRA_MORNING_SYSTEM_PROMPT },
          { role: "user", content: contextString },
        ],
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text();
      console.error("AI Gateway error:", res.status, errText);
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      console.error("AI Gateway timeout (30s)");
    } else {
      console.error("AI Gateway call failed:", e);
    }
    return null;
  }
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

    // 2. Rate limit check
    const rateLimit = await checkRateLimit(directorId);
    if (!rateLimit.allowed) {
      return jsonResponse(
        {
          error: "rate_limit",
          message: "Możesz wygenerować max 3 briefy na godzinę. Spróbuj ponownie za chwilę.",
        },
        429
      );
    }

    // 3. Get director name
    const { data: directorRow } = await serviceClient
      .from("directors")
      .select("full_name")
      .eq("id", directorId)
      .single();

    const directorName = directorRow?.full_name?.split(" ")[0] || "Użytkowniku";

    // 4. Fetch all context data in parallel
    const today = todayDate();
    const yesterday = yesterdayDate();

    const [
      tasksToday,
      tasksOverdue,
      tasksDoneYesterday,
      activeProjects,
      todayEvents,
      unreadReminders,
      recentNotes,
    ] = await Promise.all([
      // A) Tasks due today
      serviceClient
        .from("tasks")
        .select("id, title, priority, due_date, projects(name)")
        .eq("tenant_id", tenantId)
        .eq("assigned_to", directorId)
        .eq("due_date", today)
        .neq("status", "done")
        .order("priority", { ascending: true })
        .limit(20)
        .then(({ data }) =>
          (data || []).map((t: Record<string, unknown>) => ({
            id: t.id as string,
            title: t.title as string,
            priority: t.priority as string | undefined,
            due_date: t.due_date as string | undefined,
            project_name: (t.projects as Record<string, unknown> | null)?.name as string | undefined,
          }))
        ),

      // B) Overdue tasks
      serviceClient
        .from("tasks")
        .select("id, title, priority, due_date, projects(name)")
        .eq("tenant_id", tenantId)
        .eq("assigned_to", directorId)
        .lt("due_date", today)
        .not("status", "in", '("done","cancelled")')
        .order("due_date", { ascending: true })
        .limit(15)
        .then(({ data }) =>
          (data || []).map((t: Record<string, unknown>) => ({
            id: t.id as string,
            title: t.title as string,
            priority: t.priority as string | undefined,
            due_date: t.due_date as string | undefined,
            project_name: (t.projects as Record<string, unknown> | null)?.name as string | undefined,
          }))
        ),

      // C) Tasks done yesterday
      serviceClient
        .from("tasks")
        .select("id, title")
        .eq("tenant_id", tenantId)
        .eq("assigned_to", directorId)
        .eq("status", "done")
        .gte("updated_at", `${yesterday}T00:00:00`)
        .lt("updated_at", `${today}T00:00:00`)
        .limit(10)
        .then(({ data }) => data || []),

      // D) Active projects
      serviceClient
        .from("projects")
        .select("id, name, status")
        .eq("tenant_id", tenantId)
        .in("status", ["new", "in_progress", "analysis"])
        .limit(15)
        .then(({ data }) => data || []),

      // E) Today's Google Calendar events
      fetchTodayGCalEvents(serviceClient, directorId, tenantId),

      // F) Unread reminders
      serviceClient
        .from("sovra_reminders")
        .select("id, message, type")
        .eq("director_id", directorId)
        .eq("tenant_id", tenantId)
        .is("sent_at", null)
        .lte("scheduled_at", new Date().toISOString())
        .limit(10)
        .then(({ data }) => data || []),

      // G) Recent project notes
      serviceClient
        .from("project_notes")
        .select("content, created_at, projects(name)")
        .eq("created_by", directorId)
        .order("created_at", { ascending: false })
        .limit(5)
        .then(({ data }) =>
          (data || []).map((n: Record<string, unknown>) => ({
            content: n.content as string | undefined,
            created_at: n.created_at as string | undefined,
            project_name: (n.projects as Record<string, unknown> | null)?.name as string | undefined,
          }))
        ),
    ]);

    // 5. Build context
    const contextData: ContextData = {
      directorName,
      tasksToday,
      tasksOverdue,
      tasksDoneYesterday,
      activeProjects,
      todayEvents,
      unreadReminders,
      recentNotes,
    };

    const contextString = buildContextString(contextData);

    // 6. Call AI Gateway
    const aiBrief = await callAIGateway(contextString);
    const isFallback = !aiBrief;
    const briefText = aiBrief || generateFallbackBrief(contextData);

    // 7. Save session
    const sessionTitle = `Poranny brief - ${today}`;
    const { data: session } = await serviceClient
      .from("sovra_sessions")
      .insert({
        tenant_id: tenantId,
        director_id: directorId,
        type: "morning",
        title: sessionTitle,
        content: {
          brief_text: briefText,
          tasks_today_count: tasksToday.length,
          tasks_overdue_count: tasksOverdue.length,
          events_count: todayEvents.length,
          projects_count: activeProjects.length,
          tasks_done_yesterday_count: tasksDoneYesterday.length,
        },
        tasks_created: 0,
        notes_created: 0,
        metadata: {
          fallback: isFallback,
          context_data: {
            tasks_today_ids: tasksToday.map((t) => t.id),
            tasks_overdue_ids: tasksOverdue.map((t) => t.id),
            project_ids: activeProjects.map((p) => p.id),
            events_count: todayEvents.length,
          },
        },
      })
      .select("id")
      .single();

    // 8. Mark reminders as sent
    let remindersClearedCount = 0;
    if (unreadReminders.length > 0) {
      const reminderIds = unreadReminders.map((r) => r.id);
      const { count } = await serviceClient
        .from("sovra_reminders")
        .update({ sent_at: new Date().toISOString() })
        .in("id", reminderIds);
      remindersClearedCount = count || unreadReminders.length;
    }

    // 9. Return response
    return jsonResponse({
      session_id: session?.id || null,
      brief: briefText,
      data: {
        tasks_today: tasksToday,
        tasks_overdue: tasksOverdue,
        events: todayEvents,
        projects: activeProjects,
        reminders_cleared: remindersClearedCount,
      },
    });
  } catch (error) {
    console.error("sovra-morning-session error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
