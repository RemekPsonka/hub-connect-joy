import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyAuth, isAuthError, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Constants ───────────────────────────────────────────────────────
const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_CONTEXT_LENGTH = 10000;
const MAX_HISTORY_MESSAGES = 20;

// ─── System Prompt ───────────────────────────────────────────────────
const SOVRA_CHAT_SYSTEM_PROMPT = `Jesteś Sovra — AI asystentka projektowa w systemie CRM ConnectHub. Mówisz po polsku.

OSOBOWOŚĆ:
- Pewna siebie i konkretna — dajesz jasne rekomendacje, nie wahasz się
- Rzeczowa ale z ciepłem — nie jesteś robotem, ale nie jesteś też nadmiernie radosna
- Proaktywna — sugerujesz działania zanim user poprosi
- Znasz kontekst projektów, zadań i kontaktów użytkownika

MOŻLIWOŚCI:
- Analiza statusu projektów i priorytetyzacja zadań
- Sugestie kto powinien być zaangażowany w projekt (na bazie kontaktów CRM)
- Podsumowania i briefy na żądanie
- Pomoc w planowaniu dnia/tygodnia
- Analiza relacji z kontaktami i sugestie follow-upów

MOŻLIWOŚCI NARZĘDZI:
- Możesz TWORZYĆ zadania — użyj narzędzia create_task
- Możesz ZAPISYWAĆ notatki projektowe — użyj narzędzia add_project_note
- Możesz ZMIENIAĆ STATUS zadania — użyj narzędzia update_task_status
- Możesz ZMIENIAĆ STATUS projektu — użyj narzędzia update_project_status

ZASADY UŻYWANIA NARZĘDZI:
- Kiedy user prosi o stworzenie zadania — STWÓRZ JE od razu, nie pytaj o potwierdzenie
- Kiedy user mówi "dodaj notatkę do projektu X" — ZAPISZ JĄ
- Kiedy user mówi "zmień status na done" — ZMIEŃ od razu
- Po wykonaniu akcji — potwierdź co zrobiłeś krótkim komunikatem
- Możesz wywołać wiele narzędzi naraz (np. 3 taski na raz)
- Jeśli brakuje kluczowych danych do akcji (np. nie wiesz do którego projektu) — ZAPYTAJ usera
- Jeśli user podaje kontekst projektu w rozmowie — użyj jego ID do project_id

OGRANICZENIA:
- NIE wymyślaj danych — używaj TYLKO kontekstu który dostałeś
- Jeśli nie masz informacji — powiedz wprost i zasugeruj gdzie szukać
- Odpowiadaj zwięźle — max 300 słów na odpowiedź, chyba że user prosi o więcej

FORMAT ODPOWIEDZI:
- Używaj markdown do struktury (## nagłówki, **bold**, - listy) ale oszczędnie
- Emoji max 2-3 na odpowiedź
- Jeśli sugerujesz kontakt — formatuj: 👤 **[imię]** — [powód sugestii]`;

// ─── Tool Definitions ────────────────────────────────────────────────
const TOOLS = [
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Utwórz nowe zadanie w CRM. Używaj gdy user prosi o stworzenie taska, zadania, todo.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Tytuł zadania" },
          description: { type: "string", description: "Szczegółowy opis zadania" },
          priority: {
            type: "string",
            enum: ["low", "medium", "high", "urgent"],
            description: "Priorytet zadania (domyślnie medium)",
          },
          due_date: { type: "string", description: "Termin wykonania w formacie YYYY-MM-DD" },
          project_id: { type: "string", description: "UUID projektu do którego przypisać zadanie" },
          status: {
            type: "string",
            enum: ["pending", "in_progress"],
            description: "Status początkowy (domyślnie pending)",
          },
        },
        required: ["title"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_project_note",
      description: "Dodaj notatkę do projektu. Używaj gdy user prosi o zapisanie notatki w projekcie.",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "UUID projektu" },
          content: { type: "string", description: "Treść notatki" },
        },
        required: ["project_id", "content"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_task_status",
      description: "Zmień status zadania. Używaj gdy user prosi o zmianę statusu taska.",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "UUID zadania" },
          status: {
            type: "string",
            enum: ["pending", "in_progress", "done", "cancelled"],
            description: "Nowy status",
          },
        },
        required: ["task_id", "status"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_project_status",
      description: "Zmień status projektu. Używaj gdy user prosi o zmianę statusu projektu.",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "UUID projektu" },
          status: {
            type: "string",
            enum: ["new", "analysis", "in_progress", "waiting", "done", "cancelled"],
            description: "Nowy status",
          },
        },
        required: ["project_id", "status"],
        additionalProperties: false,
      },
    },
  },
];

// ─── Tool Executors ──────────────────────────────────────────────────
type ServiceClient = ReturnType<typeof createClient>;

interface ToolResult {
  tool: string;
  success: boolean;
  result: Record<string, unknown>;
}

async function executeCreateTask(
  client: ServiceClient,
  tenantId: string,
  directorId: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  try {
    const { data, error } = await client.from("tasks").insert({
      tenant_id: tenantId,
      title: args.title as string,
      description: (args.description as string) || null,
      priority: (args.priority as string) || "medium",
      due_date: (args.due_date as string) || null,
      project_id: (args.project_id as string) || null,
      owner_id: directorId,
      assigned_to: directorId,
      status: (args.status as string) || "pending",
      visibility: "private",
    }).select("id, title").single();

    if (error) throw error;
    return { tool: "create_task", success: true, result: { task_id: data.id, title: data.title } };
  } catch (e) {
    console.error("executeCreateTask error:", e);
    return { tool: "create_task", success: false, result: { error: (e as Error).message } };
  }
}

async function executeAddProjectNote(
  client: ServiceClient,
  tenantId: string,
  directorId: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  try {
    // Verify project belongs to tenant
    const { data: project, error: pErr } = await client
      .from("projects")
      .select("id, name")
      .eq("id", args.project_id as string)
      .eq("tenant_id", tenantId)
      .single();

    if (pErr || !project) {
      return { tool: "add_project_note", success: false, result: { error: "Projekt nie znaleziony" } };
    }

    const { data, error } = await client.from("project_notes").insert({
      tenant_id: tenantId,
      project_id: args.project_id as string,
      content: args.content as string,
      created_by: directorId,
      source: "sovra_chat",
    }).select("id").single();

    if (error) throw error;
    return { tool: "add_project_note", success: true, result: { note_id: data.id, project_name: project.name } };
  } catch (e) {
    console.error("executeAddProjectNote error:", e);
    return { tool: "add_project_note", success: false, result: { error: (e as Error).message } };
  }
}

async function executeUpdateTaskStatus(
  client: ServiceClient,
  tenantId: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  try {
    const { data, error } = await client
      .from("tasks")
      .update({ status: args.status as string })
      .eq("id", args.task_id as string)
      .eq("tenant_id", tenantId)
      .select("id, title, status")
      .single();

    if (error) throw error;
    if (!data) return { tool: "update_task_status", success: false, result: { error: "Zadanie nie znalezione" } };
    return { tool: "update_task_status", success: true, result: { task_id: data.id, title: data.title, new_status: data.status } };
  } catch (e) {
    console.error("executeUpdateTaskStatus error:", e);
    return { tool: "update_task_status", success: false, result: { error: (e as Error).message } };
  }
}

async function executeUpdateProjectStatus(
  client: ServiceClient,
  tenantId: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  try {
    const { data, error } = await client
      .from("projects")
      .update({ status: args.status as string })
      .eq("id", args.project_id as string)
      .eq("tenant_id", tenantId)
      .select("id, name, status")
      .single();

    if (error) throw error;
    if (!data) return { tool: "update_project_status", success: false, result: { error: "Projekt nie znaleziony" } };
    return { tool: "update_project_status", success: true, result: { project_id: data.id, project_name: data.name, new_status: data.status } };
  } catch (e) {
    console.error("executeUpdateProjectStatus error:", e);
    return { tool: "update_project_status", success: false, result: { error: (e as Error).message } };
  }
}

async function executeToolCall(
  client: ServiceClient,
  tenantId: string,
  directorId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  switch (toolName) {
    case "create_task":
      return executeCreateTask(client, tenantId, directorId, args);
    case "add_project_note":
      return executeAddProjectNote(client, tenantId, directorId, args);
    case "update_task_status":
      return executeUpdateTaskStatus(client, tenantId, args);
    case "update_project_status":
      return executeUpdateProjectStatus(client, tenantId, args);
    default:
      return { tool: toolName, success: false, result: { error: `Unknown tool: ${toolName}` } };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────
function jsonResponse(body: Record<string, unknown>, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extraHeaders },
  });
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "\n...(skrócono)";
}

// ─── Rate Limiting ───────────────────────────────────────────────────
async function checkRateLimit(directorId: string): Promise<{ allowed: boolean }> {
  const redisUrl = Deno.env.get("UPSTASH_REDIS_REST_URL");
  const redisToken = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

  if (!redisUrl || !redisToken) {
    console.warn("Upstash Redis not configured, skipping rate limit");
    return { allowed: true };
  }

  const key = `sovra-chat:${directorId}`;
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
        ["EXPIRE", key, "120"],
      ]),
    });

    return { allowed: true };
  } catch (e) {
    console.warn("Rate limit check failed, allowing request:", e);
    return { allowed: true };
  }
}

// ─── Context Fetching ────────────────────────────────────────────────
interface CRMContext {
  directorName: string;
  activeProjects: Array<{ id: string; name: string; status: string | null }>;
  recentTasks: Array<{ id: string; title: string; status: string | null; priority: string | null; due_date: string | null; project_name?: string }>;
  specificContext?: string;
}

async function fetchCRMContext(
  serviceClient: ServiceClient,
  directorId: string,
  tenantId: string,
  contextType: string,
  contextId?: string
): Promise<CRMContext> {
  // Base data — always fetched
  const [dirInfo, projects, tasks] = await Promise.all([
    serviceClient
      .from("directors")
      .select("full_name, role")
      .eq("id", directorId)
      .single()
      .then(({ data }) => data),
    serviceClient
      .from("projects")
      .select("id, name, status")
      .eq("tenant_id", tenantId)
      .in("status", ["new", "in_progress", "analysis"])
      .limit(10)
      .then(({ data }) => data || []),
    serviceClient
      .from("tasks")
      .select("id, title, status, priority, due_date, projects(name)")
      .eq("tenant_id", tenantId)
      .eq("assigned_to", directorId)
      .neq("status", "done")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(15)
      .then(({ data }) =>
        (data || []).map((t: Record<string, unknown>) => ({
          id: t.id as string,
          title: t.title as string,
          status: t.status as string | null,
          priority: t.priority as string | null,
          due_date: t.due_date as string | null,
          project_name: (t.projects as Record<string, unknown> | null)?.name as string | undefined,
        }))
      ),
  ]);

  const result: CRMContext = {
    directorName: dirInfo?.full_name?.split(" ")[0] || "Użytkowniku",
    activeProjects: projects,
    recentTasks: tasks,
  };

  // Specific context based on type
  if (contextType === "project" && contextId) {
    const [project, projectTasks] = await Promise.all([
      serviceClient
        .from("projects")
        .select("id, name, status, description, color, start_date, target_end_date")
        .eq("id", contextId)
        .eq("tenant_id", tenantId)
        .single()
        .then(({ data }) => data),
      serviceClient
        .from("tasks")
        .select("id, title, status, priority, due_date, assigned_to")
        .eq("project_id", contextId)
        .eq("tenant_id", tenantId)
        .neq("status", "done")
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(20)
        .then(({ data }) => data || []),
    ]);

    if (project) {
      result.specificContext = `\n=== AKTYWNY KONTEKST: PROJEKT ===
Nazwa: ${project.name}
ID projektu: ${project.id}
Status: ${project.status || "brak"}
Opis: ${project.description || "brak opisu"}
Start: ${project.start_date || "nie ustalono"}
Deadline: ${project.target_end_date || "nie ustalono"}
Zadania w projekcie (${projectTasks.length}):
${projectTasks.map((t) => `- [ID: ${t.id}] ${t.title} [${t.status}] priorytet: ${t.priority || "brak"}, termin: ${t.due_date || "brak"}`).join("\n")}`;
    }
  } else if (contextType === "contact" && contextId) {
    const contact = await serviceClient
      .from("contacts")
      .select("id, full_name, company, position, email, phone, profile_summary, tags, notes")
      .eq("id", contextId)
      .eq("tenant_id", tenantId)
      .single()
      .then(({ data }) => data);

    if (contact) {
      const tags = Array.isArray(contact.tags) ? contact.tags.join(", ") : "";
      result.specificContext = `\n=== AKTYWNY KONTEKST: KONTAKT ===
Imię: ${contact.full_name}
Firma: ${contact.company || "brak"}
Stanowisko: ${contact.position || "brak"}
Email: ${contact.email || "brak"}
Telefon: ${contact.phone || "brak"}
Tagi: ${tags || "brak"}
Profil: ${contact.profile_summary || "brak"}
Notatki: ${contact.notes || "brak"}`;
    }
  } else if (contextType === "task" && contextId) {
    const task = await serviceClient
      .from("tasks")
      .select("id, title, description, status, priority, due_date, projects(name)")
      .eq("id", contextId)
      .eq("tenant_id", tenantId)
      .single()
      .then(({ data }) => data);

    if (task) {
      const projectName = (task.projects as Record<string, unknown> | null)?.name as string | undefined;
      result.specificContext = `\n=== AKTYWNY KONTEKST: ZADANIE ===
ID zadania: ${task.id}
Tytuł: ${task.title}
Opis: ${task.description || "brak"}
Status: ${task.status}
Priorytet: ${task.priority || "brak"}
Termin: ${task.due_date || "nie ustalono"}
Projekt: ${projectName || "brak"}`;
    }
  }

  return result;
}

function buildContextString(ctx: CRMContext): string {
  const now = new Date();
  const dayNames = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];
  const dayOfWeek = dayNames[now.getDay()];
  const today = now.toISOString().split("T")[0];

  let text = `DANE KONTEKSTOWE
Dzień: ${dayOfWeek}, ${today}
Imię użytkownika: ${ctx.directorName}

=== AKTYWNE PROJEKTY (${ctx.activeProjects.length}) ===
${ctx.activeProjects.length === 0 ? "Brak aktywnych projektów." : ctx.activeProjects.map((p) => `- [ID: ${p.id}] ${p.name} [${p.status}]`).join("\n")}

=== ZADANIA DO ZROBIENIA (${ctx.recentTasks.length}) ===
${ctx.recentTasks.length === 0 ? "Brak zadań." : ctx.recentTasks.map((t) => {
    const project = t.project_name ? ` (${t.project_name})` : "";
    return `- [ID: ${t.id}] ${t.title} [${t.status}] priorytet: ${t.priority || "brak"}, termin: ${t.due_date || "brak"}${project}`;
  }).join("\n")}`;

  if (ctx.specificContext) {
    text += "\n" + ctx.specificContext;
  }

  return truncate(text, MAX_CONTEXT_LENGTH);
}

// ─── Conversation History ────────────────────────────────────────────
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

async function loadConversationHistory(
  serviceClient: ServiceClient,
  sessionId: string,
  directorId: string
): Promise<ChatMessage[]> {
  const { data } = await serviceClient
    .from("sovra_sessions")
    .select("content")
    .eq("id", sessionId)
    .eq("director_id", directorId)
    .single();

  if (!data?.content) return [];

  const content = data.content as Record<string, unknown>;
  const messages = content.messages as Array<{ role: string; content: string }> | undefined;
  if (!Array.isArray(messages)) return [];

  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
}

// ─── SSE Content Extraction ──────────────────────────────────────────
function extractContentFromSSE(rawText: string): string {
  let content = "";
  for (const line of rawText.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data: ")) continue;
    const jsonStr = trimmed.slice(6);
    if (jsonStr === "[DONE]") continue;
    try {
      const parsed = JSON.parse(jsonStr);
      const delta = parsed.choices?.[0]?.delta?.content;
      if (delta) content += delta;
    } catch {
      // skip malformed
    }
  }
  return content;
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
      return jsonResponse({ error: "Invalid JSON" }, 400);
    }

    const message = body.message as string | undefined;
    if (!message || typeof message !== "string" || message.length === 0 || message.length > 2000) {
      return jsonResponse({ error: "message is required (1-2000 chars)" }, 400);
    }

    const sessionId = (body.session_id as string) || null;
    const contextType = (body.context_type as string) || "general";
    const contextId = (body.context_id as string) || undefined;

    // Validate enums
    if (!["general", "project", "contact", "task"].includes(contextType)) {
      return jsonResponse({ error: "Invalid context_type" }, 400);
    }

    // 3. Rate limit
    const rateLimit = await checkRateLimit(directorId);
    if (!rateLimit.allowed) {
      return jsonResponse(
        { error: "Limit wiadomości — max 10 na minutę. Spróbuj za chwilę." },
        429
      );
    }

    // 4. Fetch CRM context + conversation history in parallel
    const [crmContext, previousMessages] = await Promise.all([
      fetchCRMContext(serviceClient, directorId, tenantId, contextType, contextId),
      sessionId ? loadConversationHistory(serviceClient, sessionId, directorId) : Promise.resolve([]),
    ]);

    const contextString = buildContextString(crmContext);

    // 5. Build messages array
    const aiMessages: Array<Record<string, unknown>> = [
      { role: "system", content: SOVRA_CHAT_SYSTEM_PROMPT },
      { role: "system", content: `AKTUALNY KONTEKST:\n${contextString}` },
      ...previousMessages,
      { role: "user", content: message },
    ];

    // 6. Call AI Gateway — Step 1: Non-streaming with tools
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return jsonResponse({ error: "AI not configured" }, 500);
    }

    const initialResponse = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: aiMessages,
        tools: TOOLS,
        temperature: 0.7,
        stream: false,
      }),
    });

    if (!initialResponse.ok) {
      const errText = await initialResponse.text();
      console.error("AI Gateway error:", initialResponse.status, errText);

      if (initialResponse.status === 429) {
        return jsonResponse({ error: "Przekroczono limit zapytań AI. Spróbuj za chwilę." }, 429);
      }
      if (initialResponse.status === 402) {
        return jsonResponse({ error: "Wymagana płatność — doładuj kredyty AI." }, 402);
      }

      return jsonResponse({ error: "Błąd komunikacji z AI" }, 500);
    }

    const initialData = await initialResponse.json();
    const assistantChoice = initialData.choices?.[0];

    if (!assistantChoice) {
      return jsonResponse({ error: "Brak odpowiedzi od AI" }, 500);
    }

    const toolCalls = assistantChoice.message?.tool_calls;
    let toolResults: ToolResult[] = [];
    let tasksCreated = 0;
    let notesCreated = 0;

    // 7. If AI wants to call tools — execute them
    if (toolCalls && Array.isArray(toolCalls) && toolCalls.length > 0) {
      console.log(`Executing ${toolCalls.length} tool calls`);

      // Execute all tool calls
      const toolPromises = toolCalls.map(async (tc: Record<string, unknown>) => {
        const fn = tc.function as { name: string; arguments: string };
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(fn.arguments);
        } catch {
          console.error("Failed to parse tool args:", fn.arguments);
        }
        return executeToolCall(serviceClient, tenantId, directorId, fn.name, args);
      });

      toolResults = await Promise.all(toolPromises);

      tasksCreated = toolResults.filter((r) => r.tool === "create_task" && r.success).length;
      notesCreated = toolResults.filter((r) => r.tool === "add_project_note" && r.success).length;

      // Build tool result messages for the second AI call
      const toolMessages: Array<Record<string, unknown>> = [];

      // Add the assistant message with tool_calls
      toolMessages.push({
        role: "assistant",
        content: assistantChoice.message.content || null,
        tool_calls: toolCalls,
      });

      // Add tool results
      for (let i = 0; i < toolCalls.length; i++) {
        const tc = toolCalls[i] as Record<string, unknown>;
        toolMessages.push({
          role: "tool",
          tool_call_id: tc.id as string,
          content: JSON.stringify(toolResults[i]?.result || { error: "Unknown error" }),
        });
      }

      // 8. Second AI call — streaming with tool results
      const followUpMessages = [...aiMessages, ...toolMessages];

      const streamResponse = await fetch(AI_GATEWAY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: followUpMessages,
          temperature: 0.7,
          stream: true,
        }),
      });

      if (!streamResponse.ok) {
        console.error("AI follow-up stream error:", streamResponse.status);
        return jsonResponse({ error: "Błąd komunikacji z AI" }, 500);
      }

      // Stream response with tool_results SSE event prepended
      const responseSessionId = sessionId || crypto.randomUUID();
      const aiBodyReader = streamResponse.body!.getReader();
      const decoder = new TextDecoder();
      let accumulatedSSE = "";

      const outputStream = new ReadableStream({
        async start(controller) {
          try {
            // Send tool_results event FIRST
            const toolResultsEvent = `data: ${JSON.stringify({ type: "tool_results", actions: toolResults })}\n\n`;
            controller.enqueue(new TextEncoder().encode(toolResultsEvent));

            // Then stream AI response
            while (true) {
              const { done, value } = await aiBodyReader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              accumulatedSSE += chunk;
              controller.enqueue(new TextEncoder().encode(chunk));
            }
          } catch (e) {
            console.error("Stream error:", e);
          } finally {
            // Save session
            try {
              const assistantText = extractContentFromSSE(accumulatedSSE);
              if (assistantText) {
                if (sessionId) {
                  const { data: existing } = await serviceClient
                    .from("sovra_sessions")
                    .select("content")
                    .eq("id", sessionId)
                    .eq("director_id", directorId)
                    .single();

                  const existingContent = (existing?.content as Record<string, unknown>) || {};
                  const existingMessages = (existingContent.messages as unknown[]) || [];

                  const newMessages = [
                    { role: "user", content: message, timestamp: new Date().toISOString() },
                    { role: "assistant", content: assistantText, timestamp: new Date().toISOString(), tool_results: toolResults },
                  ];

                  await serviceClient
                    .from("sovra_sessions")
                    .update({
                      content: { messages: [...existingMessages, ...newMessages] },
                      ended_at: new Date().toISOString(),
                      tasks_created: (existingContent.tasks_created as number || 0) + tasksCreated,
                      notes_created: (existingContent.notes_created as number || 0) + notesCreated,
                    })
                    .eq("id", sessionId)
                    .eq("director_id", directorId);
                } else {
                  const title = message.length > 50 ? message.slice(0, 50) + "…" : message;

                  await serviceClient.from("sovra_sessions").insert({
                    id: responseSessionId,
                    tenant_id: tenantId,
                    director_id: directorId,
                    type: "chat",
                    title,
                    content: {
                      messages: [
                        { role: "user", content: message, timestamp: new Date().toISOString() },
                        { role: "assistant", content: assistantText, timestamp: new Date().toISOString(), tool_results: toolResults },
                      ],
                    },
                    tasks_created: tasksCreated,
                    notes_created: notesCreated,
                  });
                }
              }
            } catch (e) {
              console.error("Session save error:", e);
            }

            controller.close();
          }
        },
      });

      return new Response(outputStream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "X-Sovra-Session-Id": responseSessionId,
        },
      });
    }

    // 9. No tool calls — simple text response, stream it
    // Re-do call with streaming since initial was non-streaming
    const responseSessionId = sessionId || crypto.randomUUID();

    // If the initial response already has content, we can use it directly
    const directContent = assistantChoice.message?.content;
    if (directContent) {
      // Stream the already-received content as SSE
      const sseLines = [
        `data: ${JSON.stringify({ choices: [{ delta: { content: directContent } }] })}\n\n`,
        `data: [DONE]\n\n`,
      ];

      const outputStream = new ReadableStream({
        async start(controller) {
          try {
            for (const line of sseLines) {
              controller.enqueue(new TextEncoder().encode(line));
            }
          } finally {
            // Save session
            try {
              if (sessionId) {
                const { data: existing } = await serviceClient
                  .from("sovra_sessions")
                  .select("content")
                  .eq("id", sessionId)
                  .eq("director_id", directorId)
                  .single();

                const existingContent = (existing?.content as Record<string, unknown>) || {};
                const existingMessages = (existingContent.messages as unknown[]) || [];

                const newMessages = [
                  { role: "user", content: message, timestamp: new Date().toISOString() },
                  { role: "assistant", content: directContent, timestamp: new Date().toISOString() },
                ];

                await serviceClient
                  .from("sovra_sessions")
                  .update({
                    content: { messages: [...existingMessages, ...newMessages] },
                    ended_at: new Date().toISOString(),
                  })
                  .eq("id", sessionId)
                  .eq("director_id", directorId);
              } else {
                const title = message.length > 50 ? message.slice(0, 50) + "…" : message;

                await serviceClient.from("sovra_sessions").insert({
                  id: responseSessionId,
                  tenant_id: tenantId,
                  director_id: directorId,
                  type: "chat",
                  title,
                  content: {
                    messages: [
                      { role: "user", content: message, timestamp: new Date().toISOString() },
                      { role: "assistant", content: directContent, timestamp: new Date().toISOString() },
                    ],
                  },
                  tasks_created: 0,
                  notes_created: 0,
                });
              }
            } catch (e) {
              console.error("Session save error:", e);
            }

            controller.close();
          }
        },
      });

      return new Response(outputStream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "X-Sovra-Session-Id": responseSessionId,
        },
      });
    }

    // Fallback: no content and no tool calls
    return jsonResponse({ error: "Brak odpowiedzi od AI" }, 500);
  } catch (error) {
    console.error("sovra-chat error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
