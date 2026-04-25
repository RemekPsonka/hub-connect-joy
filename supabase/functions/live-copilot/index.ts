// ODPRAWA-03 Faza D1 — live-copilot (read-only SSE sidepanel)
// Streaming context + suggested action + supporting questions per kontakt.
// 8 read-only tools (P0 master-spec 8.3), R1/R2/R3 anti-halucynacja guards,
// audit do ai_audit_log (tool_call_read + llm_response).

import { createClient as createClientRaw } from "npm:@supabase/supabase-js@2";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createClient = createClientRaw as unknown as (
  ...args: Parameters<typeof createClientRaw>
) => any;
import { verifyAuth, isAuthError, unauthorizedResponse } from "../_shared/auth.ts";
import { callLLM } from "../_shared/llm-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MODEL = "google/gemini-2.5-flash";

interface RequestBody {
  sessionId?: string;
  contactId?: string;
  dealTeamContactId?: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function safeSelect<T = any>(p: Promise<{ data: T | null; error: unknown }>): Promise<T[]> {
  try {
    const { data, error } = await p;
    if (error) {
      console.warn("[live-copilot] safeSelect error:", error);
      return [];
    }
    if (!data) return [];
    return Array.isArray(data) ? data : [data];
  } catch (e) {
    console.warn("[live-copilot] safeSelect throw:", e);
    return [];
  }
}

// ──────────────────────────────────────────────────────────────────────
// P0 context gathering — 8 read tools in parallel
// ──────────────────────────────────────────────────────────────────────
interface P0Context {
  dtc: unknown;
  recent_decisions: unknown[];
  open_tasks: unknown[];
  upcoming_meetings: unknown[];
  policies: unknown[];
  policy_renewals: unknown[];
  prev_session_decisions: unknown[];
  ownership: unknown[];
  gcal_today: unknown[];
  counts: Record<string, number>;
}

async function gatherP0Context(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  contactId: string,
  dealTeamContactId: string,
  teamId: string,
  tenantId: string,
  directorId: string | null,
): Promise<P0Context> {
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86_400_000).toISOString().slice(0, 10);
  const sevenDaysAhead = new Date(now.getTime() + 7 * 86_400_000).toISOString();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  const [
    dtcArr,
    decisions,
    tasks,
    meetings,
    prevSession,
  ] = await Promise.all([
    safeSelect(
      supabase
        .from("deal_team_contacts")
        .select(
          "id, contact_id, category, offering_stage, temperature, last_status_update, next_action_date, handshake_at, poa_signed_at, audit_done_at, contract_signed_at, expected_annual_premium_gr, potential_property_gr, potential_financial_gr, potential_communication_gr, potential_life_group_gr, assigned_to, contact:contacts(full_name, company, company_id, email, phone)",
        )
        .eq("id", dealTeamContactId)
        .maybeSingle(),
    ),
    safeSelect(
      supabase
        .from("meeting_decisions")
        .select("decision_type, meeting_date, notes, milestone_variant, next_action_date, prev_category, prev_offering_stage, prev_temperature, created_at")
        .eq("deal_team_contact_id", dealTeamContactId)
        .gte("meeting_date", fourteenDaysAgo)
        .order("meeting_date", { ascending: false })
        .limit(20),
    ),
    safeSelect(
      supabase
        .from("tasks")
        .select("id, title, status, priority, due_date, description")
        .eq("deal_team_contact_id", dealTeamContactId)
        .not("status", "in", '("completed","cancelled")')
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(20),
    ),
    safeSelect(
      supabase
        .from("unified_meetings")
        .select("id, type, scheduled_at, duration, location, status, source_table")
        .eq("contact_id_main", contactId)
        .gte("scheduled_at", now.toISOString())
        .lte("scheduled_at", sevenDaysAhead)
        .order("scheduled_at", { ascending: true })
        .limit(10),
    ),
    safeSelect(
      supabase
        .from("odprawa_sessions")
        .select("id, started_at, ended_at, status")
        .eq("team_id", teamId)
        .eq("status", "completed")
        .order("ended_at", { ascending: false })
        .limit(1),
    ),
  ]);

  const dtc = dtcArr[0] ?? null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const companyId = (dtc as any)?.contact?.company_id ?? null;

  const [policies, prevSessionDecisions, gcalToday] = await Promise.all([
    companyId
      ? safeSelect(
          supabase
            .from("insurance_policies")
            .select("id, policy_name, policy_type, insurer_name, start_date, end_date, premium, sum_insured, workflow_status, is_our_policy")
            .eq("company_id", companyId)
            .order("end_date", { ascending: false })
            .limit(10),
        )
      : Promise.resolve([] as unknown[]),
    prevSession[0] && (prevSession[0] as { id?: string }).id
      ? safeSelect(
          supabase
            .from("meeting_decisions")
            .select("decision_type, meeting_date, notes, milestone_variant")
            .eq("deal_team_contact_id", dealTeamContactId)
            .eq("odprawa_session_id", (prevSession[0] as { id: string }).id)
            .order("created_at", { ascending: false })
            .limit(5),
        )
      : Promise.resolve([] as unknown[]),
    directorId
      ? safeSelect(
          supabase
            .from("gcal_events")
            .select("summary, start_at, end_at, attendees")
            .eq("director_id", directorId)
            .gte("start_at", todayStart)
            .lt("start_at", tomorrowStart)
            .order("start_at", { ascending: true })
            .limit(20),
        )
      : Promise.resolve([] as unknown[]),
  ]);

  return {
    dtc,
    recent_decisions: decisions,
    open_tasks: tasks,
    upcoming_meetings: meetings,
    policies,
    policy_renewals: [], // table not present yet
    prev_session_decisions: prevSessionDecisions,
    ownership: [], // table not present yet
    gcal_today: gcalToday,
    counts: {
      decisions: decisions.length,
      tasks: tasks.length,
      meetings: meetings.length,
      policies: policies.length,
      prev_decisions: prevSessionDecisions.length,
      gcal: gcalToday.length,
    },
  };
}

// ──────────────────────────────────────────────────────────────────────
// LLM prompt
// ──────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Jesteś asystentem dyrektora sprzedaży na odprawie zespołu (CRM ubezpieczeniowy).
Otrzymujesz JSON z kontekstem JEDNEGO kontaktu. Zwróć ODPOWIEDŹ DOKŁADNIE w 3 sekcjach:

## Kontekst
- 3-4 bullet pointy z FAKTÓW z danych (etap, temperatura, ostatnie decyzje, otwarte zadania, polisy).
- Format daty: DD.MM.YYYY. Tylko daty obecne w danych wejściowych.

## Sugerowana akcja
Jedno zdanie po polsku — co dyrektor powinien dziś zrobić z tym kontaktem.

## Pytania wspierające
1. Pierwsze pytanie pomocnicze do rozmowy w zespole.
2. Drugie pytanie.

ZASADY ANTI-HALUCYNACJI:
- Milestone date = WYŁĄCZNIE z kolumn *_at (handshake_at, poa_signed_at, audit_done_at, contract_signed_at). Nie wymyślaj.
- Nie wymyślaj rozmów, spotkań ani dat — operujesz tylko na danych z input JSON.
- Kwoty PLN — TYLKO jeśli pojawiają się w policies/dtc (premium, expected_annual_premium_gr).
- Nie używaj zwrotów "dzwonił/spotkał się/rozmawiał" jeśli nie ma rekordu w recent_decisions/upcoming_meetings.
- Zwięźle, sentence case, bez emoji.

OPCJONALNIE — PROPOZYCJE AKCJI (write):
Jeżeli sugerowana akcja jest konkretna i wykonalna jako jedno z poniższych narzędzi, dołącz NA SAMYM KOŃCU odpowiedzi (po sekcji Pytania wspierające) blok kodu:

\`\`\`proposal
{ "proposal_id": "<UUID który zostanie podany niżej>", "tool": "<nazwa>", "args": { ... }, "rationale": "krótkie uzasadnienie po polsku" }
\`\`\`

Dostępne narzędzia (max 1 propozycja na odpowiedź):
- create_task — args: { "title": string, "due_date": "YYYY-MM-DD" | null, "description": string | null }
- update_contact_stage — args: { "category": "prospect"|"lead"|"client"|"deferred"|"lost" }
- update_contact_temperature — args: { "temperature": "cold"|"warm"|"hot"|"10x"|null }
- log_decision — args: { "decision": "push"|"pivot"|"park"|"kill", "notes": string | null }

ZASADY PROPOZYCJI:
- Tylko jeśli dane uzasadniają działanie. Nie proponuj akcji "na siłę".
- Brak bloku \`\`\`proposal\`\`\` jest poprawną odpowiedzią — preferuj brak nad zgadywaniem.
- JSON musi być valid (cudzysłowy podwójne, bez komentarzy, bez trailing comma).
- Pole proposal_id MUSI być dokładnie tym UUID, które otrzymasz w wiadomości użytkownika (NIE wymyślaj własnego).`;

// ──────────────────────────────────────────────────────────────────────
// R1/R2 validators (post-stream, on accumulated text)
// ──────────────────────────────────────────────────────────────────────
function detectR1Violations(text: string, ctx: P0Context): string[] {
  const violations: string[] = [];
  const re = /(dzwonił|spotkał się|rozmawiał|kontaktował)\s+(wczoraj|dzisiaj|w\s+(poniedziałek|wtorek|środę|czwartek|piątek)|\d{1,2}\.\d{1,2})/gi;
  let m: RegExpExecArray | null;
  const hasMeetingEvidence =
    ctx.recent_decisions.length > 0 || ctx.upcoming_meetings.length > 0 || ctx.open_tasks.length > 0;
  while ((m = re.exec(text)) !== null) {
    if (!hasMeetingEvidence) violations.push(m[0]);
  }
  return violations;
}

function detectR2Violations(text: string, ctx: P0Context): string[] {
  const violations: string[] = [];
  const re = /(\d[\d\s]{2,})\s*(zł|PLN)/gi;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allowed = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dtc = ctx.dtc as any;
  if (dtc?.expected_annual_premium_gr) {
    allowed.add(String(Math.round(dtc.expected_annual_premium_gr / 100)));
  }
  for (const p of ctx.policies as Array<{ premium?: number }>) {
    if (p?.premium) allowed.add(String(Math.round(p.premium)));
  }
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const num = m[1].replace(/\s/g, "");
    if (!allowed.has(num)) violations.push(m[0]);
  }
  return violations;
}

// ──────────────────────────────────────────────────────────────────────
// Handler
// ──────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const auth = await verifyAuth(req, supabase);
    if (isAuthError(auth)) return unauthorizedResponse(auth, corsHeaders);

    let body: RequestBody = {};
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }
    const { sessionId, contactId, dealTeamContactId } = body;
    if (!sessionId || !contactId || !dealTeamContactId) {
      return jsonResponse({ error: "sessionId, contactId, dealTeamContactId required" }, 400);
    }

    // Resolve session → team_id and verify membership
    const { data: session } = await supabase
      .from("odprawa_sessions")
      .select("id, team_id, started_by")
      .eq("id", sessionId)
      .maybeSingle();
    if (!session) return jsonResponse({ error: "Session not found" }, 404);

    const teamId = (session as { team_id: string }).team_id;

    if (auth.userType === "director" && auth.directorId) {
      const { data: m } = await supabase
        .from("deal_team_members")
        .select("id")
        .eq("team_id", teamId)
        .eq("director_id", auth.directorId)
        .maybeSingle();
      if (!m) return jsonResponse({ error: "Not a team member" }, 403);
    }

    // Gather P0
    const ctx = await gatherP0Context(
      supabase,
      contactId,
      dealTeamContactId,
      teamId,
      auth.tenantId,
      auth.directorId ?? null,
    );

    // Audit: tool_call_read
    await supabase.from("ai_audit_log").insert({
      tenant_id: auth.tenantId,
      team_id: teamId,
      odprawa_session_id: sessionId,
      user_id: auth.user.id,
      event_type: "tool_call_read",
      tool_name: "gather_p0_context",
      input: { sessionId, contactId, dealTeamContactId },
      output: { counts: ctx.counts },
    });

    // LLM streaming call
    const userContent = `Kontekst kontaktu (JSON):\n${JSON.stringify(
      {
        dtc: ctx.dtc,
        recent_decisions: ctx.recent_decisions,
        open_tasks: ctx.open_tasks,
        upcoming_meetings: ctx.upcoming_meetings,
        policies: ctx.policies,
        prev_session_decisions: ctx.prev_session_decisions,
        gcal_today: ctx.gcal_today,
      },
      null,
      2,
    )}`;

    const llmResult = await callLLM({
      model_hint: MODEL,
      stream: true,
      request_id: requestId,
      context: {
        function_name: "live-copilot",
        persona: "live-copilot",
        actor_id: auth.directorId ?? auth.user.id,
        tenant_id: auth.tenantId,
      },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    });

    if (llmResult.status === 429) {
      return jsonResponse({ error: "Rate limit exceeded", retryable: true }, 429);
    }
    if (llmResult.status === 402) {
      return jsonResponse({ error: "Lovable AI credits exhausted", retryable: false }, 402);
    }
    if (!llmResult.stream || llmResult.status >= 400) {
      return jsonResponse({ error: `LLM error: status=${llmResult.status}` }, 500);
    }

    // Tee the stream: pass-through to client + accumulate for validators + audit
    let accumulated = "";
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    const reader = llmResult.stream.getReader();
    let textBuffer = "";

    const passthrough = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
            // Accumulate parsed deltas for validators
            textBuffer += decoder.decode(value, { stream: true });
            let nl: number;
            while ((nl = textBuffer.indexOf("\n")) !== -1) {
              let line = textBuffer.slice(0, nl);
              textBuffer = textBuffer.slice(nl + 1);
              if (line.endsWith("\r")) line = line.slice(0, -1);
              if (!line.startsWith("data: ")) continue;
              const payload = line.slice(6).trim();
              if (payload === "[DONE]" || !payload) continue;
              try {
                const parsed = JSON.parse(payload);
                const delta = parsed?.choices?.[0]?.delta?.content;
                if (typeof delta === "string") accumulated += delta;
              } catch {
                // partial — leave for next chunk
                textBuffer = line + "\n" + textBuffer;
                break;
              }
            }
          }
          controller.close();

          // Post-stream: validators + audit
          const r1 = detectR1Violations(accumulated, ctx);
          const r2 = detectR2Violations(accumulated, ctx);
          await supabase.from("ai_audit_log").insert({
            tenant_id: auth.tenantId,
            team_id: teamId,
            odprawa_session_id: sessionId,
            user_id: auth.user.id,
            event_type: "llm_response",
            tool_name: "live-copilot",
            output: {
              length: accumulated.length,
              r1_violations: r1,
              r2_violations: r2,
            },
            llm_model: MODEL,
          });
          if (r1.length > 0 || r2.length > 0) {
            console.warn(
              `[live-copilot] anti-hallucination violations r1=${r1.length} r2=${r2.length} session=${sessionId}`,
            );
          }
          // Suppress unused encoder warning in production builds
          void encoder;
        } catch (e) {
          console.error("[live-copilot] stream error:", e);
          try {
            controller.error(e);
          } catch {
            // already closed
          }
        }
      },
    });

    return new Response(passthrough, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    console.error("live-copilot fatal:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
});