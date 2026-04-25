// ODPRAWA-03 Faza C — agenda-builder
// Generuje AI-rankowaną agendę odprawy dla deal_team i zapisuje do ai_agenda_proposals.
// Tryby: manual (z UI, JWT) | cron (wszystkie aktywne teamy, service_role).

import { createClient as createClientRaw } from "npm:@supabase/supabase-js@2";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createClient = createClientRaw as unknown as (...args: Parameters<typeof createClientRaw>) => any;
import { verifyAuth, isAuthError, unauthorizedResponse } from "../_shared/auth.ts";
import { callLLM, calcCostCents } from "../_shared/llm-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MODEL = "google/gemini-2.5-flash";
const MAX_CONTACTS_INPUT = 50;
const MAX_RANKED_OUTPUT = 25;

interface ContactCandidate {
  contact_id: string;
  contact_name: string;
  company: string | null;
  stage: string | null;
  temperature: string | null;
  last_status_update: string | null;
  next_action_date: string | null;
  active_tasks: number;
  overdue_tasks: number;
  days_since_update: number | null;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24));
}

async function gatherCandidates(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  teamId: string,
): Promise<ContactCandidate[]> {
  const { data: dtcs, error } = await supabase
    .from("deal_team_contacts")
    .select("id, contact_id, category, temperature, last_status_update, next_action_date, is_lost")
    .eq("team_id", teamId)
    .eq("is_lost", false)
    .order("last_status_update", { ascending: true, nullsFirst: true })
    .limit(MAX_CONTACTS_INPUT);

  if (error) throw error;
  if (!dtcs?.length) return [];

  const contactIds = dtcs.map((d: any) => d.contact_id);
  const dtcIds = dtcs.map((d: any) => d.id);

  const [contactsRes, tasksRes] = await Promise.all([
    supabase
      .from("contacts")
      .select("id, first_name, last_name, company, company_id")
      .in("id", contactIds),
    supabase
      .from("tasks")
      .select("deal_team_contact_id, status, due_date")
      .in("deal_team_contact_id", dtcIds)
      .not("status", "in", '("completed","cancelled")'),
  ]);

  const companyIds = (contactsRes.data ?? [])
    .map((c: any) => c.company_id)
    .filter(Boolean);
  const companiesRes = companyIds.length
    ? await supabase.from("companies").select("id, name").in("id", companyIds)
    : { data: [] };

  const contactMap = new Map<string, any>(
    (contactsRes.data ?? []).map((c: any) => [c.id, c]),
  );
  const companyMap = new Map<string, string>(
    (companiesRes.data ?? []).map((c: any) => [c.id, c.name]),
  );

  const taskAgg = new Map<string, { active: number; overdue: number }>();
  const now = Date.now();
  for (const t of tasksRes.data ?? []) {
    const agg = taskAgg.get(t.deal_team_contact_id) ?? { active: 0, overdue: 0 };
    agg.active += 1;
    if (t.due_date && new Date(t.due_date).getTime() < now) agg.overdue += 1;
    taskAgg.set(t.deal_team_contact_id, agg);
  }

  return dtcs.map((d: any): ContactCandidate => {
    const c = contactMap.get(d.contact_id);
    const name = c
      ? [c.first_name, c.last_name].filter(Boolean).join(" ") || "Bez nazwy"
      : "Bez nazwy";
    const company = c?.company_id ? companyMap.get(c.company_id) ?? c?.company ?? null : c?.company ?? null;
    const t = taskAgg.get(d.id) ?? { active: 0, overdue: 0 };
    return {
      contact_id: d.contact_id,
      contact_name: name,
      company,
      stage: d.category,
      temperature: d.temperature,
      last_status_update: d.last_status_update,
      next_action_date: d.next_action_date,
      active_tasks: t.active,
      overdue_tasks: t.overdue,
      days_since_update: daysSince(d.last_status_update),
    };
  });
}

const SYSTEM_PROMPT = `Jesteś asystentem dyrektora sprzedaży na odprawie zespołowej (CRM ubezpieczeniowy).
Z listy kontaktów wybierz TOP ${MAX_RANKED_OUTPUT} do omówienia DZIŚ. Priorytetyzuj:
1. Kontakty 10x (temperature=10x lub stage=10x) — zawsze.
2. Klienci na etapie 'offering' bez aktywnych zadań i bez next_action_date (utknięte).
3. Zadania przeterminowane.
4. Brak aktywności >14 dni dla aktywnych szans.

Dla każdego kontaktu napisz JEDNO zdanie po polsku (max 80 znaków) — KONKRETNE uzasadnienie
oparte na danych wejściowych. NIE wymyślaj faktów których nie ma w danych. NIE używaj kwot PLN.
Format daty DD.MM.`;

async function rankWithLLM(
  candidates: ContactCandidate[],
  context: { tenant_id: string; team_id: string; actor_id?: string; request_id: string },
): Promise<{
  ranked: { contact_id: string; reason: string }[];
  tokens_in: number;
  tokens_out: number;
  cost_cents: number;
  provider: string;
}> {
  const tools = [
    {
      type: "function",
      function: {
        name: "submit_ranking",
        description: "Zwraca posortowaną listę top kontaktów do omówienia.",
        parameters: {
          type: "object",
          properties: {
            ranked: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  contact_id: { type: "string", description: "UUID kontaktu z wejścia" },
                  reason: { type: "string", description: "Krótkie uzasadnienie po polsku" },
                },
                required: ["contact_id", "reason"],
                additionalProperties: false,
              },
            },
          },
          required: ["ranked"],
          additionalProperties: false,
        },
      },
    },
  ];

  const userContent = `Kontakty (JSON):\n${JSON.stringify(candidates, null, 2)}`;

  const result = await callLLM({
    model_hint: MODEL,
    stream: false,
    request_id: context.request_id,
    tools,
    tool_choice: "required",
    context: {
      function_name: "agenda-builder",
      persona: "agenda-ranker",
      actor_id: context.actor_id,
      tenant_id: context.tenant_id,
    },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
  });

  if (result.status >= 400 || !result.text) {
    throw new Error(`LLM call failed: status=${result.status}`);
  }

  // Parse tool call from text fallback OR from raw response
  let ranked: { contact_id: string; reason: string }[] = [];
  try {
    // result.text could be JSON args from tool call (provider-dependent)
    const parsed = JSON.parse(result.text);
    if (Array.isArray(parsed?.ranked)) ranked = parsed.ranked;
    else if (Array.isArray(parsed)) ranked = parsed;
  } catch {
    // Try extracting JSON object
    const match = result.text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const p = JSON.parse(match[0]);
        if (Array.isArray(p?.ranked)) ranked = p.ranked;
      } catch {
        // give up — empty list will be persisted with error
      }
    }
  }

  // Validate: every contact_id must exist in candidates
  const valid = new Set(candidates.map((c) => c.contact_id));
  ranked = ranked
    .filter((r) => r?.contact_id && valid.has(r.contact_id))
    .slice(0, MAX_RANKED_OUTPUT);

  return {
    ranked,
    tokens_in: result.tokens_in ?? 0,
    tokens_out: result.tokens_out ?? 0,
    cost_cents: result.cost_cents ?? calcCostCents(MODEL, result.tokens_in ?? 0, result.tokens_out ?? 0),
    provider: result.provider ?? "lovable",
  };
}

async function buildForTeam(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  teamId: string,
  tenantId: string,
  generatedBy: "manual" | "cron",
  triggeredBy: string | null,
  requestId: string,
): Promise<{ proposal_id: string | null; ranked_count: number; error?: string }> {
  const candidates = await gatherCandidates(supabase, teamId);
  if (candidates.length === 0) {
    return { proposal_id: null, ranked_count: 0, error: "no_candidates" };
  }

  let llmRes;
  try {
    llmRes = await rankWithLLM(candidates, {
      tenant_id: tenantId,
      team_id: teamId,
      actor_id: triggeredBy ?? undefined,
      request_id: requestId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const { data: row } = await supabase
      .from("ai_agenda_proposals")
      .insert({
        tenant_id: tenantId,
        team_id: teamId,
        generated_by: generatedBy,
        triggered_by: triggeredBy,
        ranked_contacts: [],
        llm_provider: null,
        llm_model: MODEL,
        error: msg.slice(0, 500),
      })
      .select("id")
      .maybeSingle();
    return { proposal_id: row?.id ?? null, ranked_count: 0, error: msg };
  }

  const { data: row, error: insErr } = await supabase
    .from("ai_agenda_proposals")
    .insert({
      tenant_id: tenantId,
      team_id: teamId,
      generated_by: generatedBy,
      triggered_by: triggeredBy,
      ranked_contacts: llmRes.ranked,
      llm_provider: llmRes.provider,
      llm_model: MODEL,
      llm_tokens_in: llmRes.tokens_in,
      llm_tokens_out: llmRes.tokens_out,
      llm_cost_cents: llmRes.cost_cents,
    })
    .select("id")
    .maybeSingle();

  if (insErr) {
    return { proposal_id: null, ranked_count: 0, error: insErr.message };
  }

  // audit
  await supabase.from("ai_audit_log").insert({
    tenant_id: tenantId,
    team_id: teamId,
    user_id: triggeredBy,
    event_type: "llm_response",
    tool_name: "agenda-builder.submit_ranking",
    output: { ranked_count: llmRes.ranked.length, proposal_id: row?.id },
    llm_model: MODEL,
    llm_tokens_in: llmRes.tokens_in,
    llm_tokens_out: llmRes.tokens_out,
    llm_cost_cents: llmRes.cost_cents,
  });

  return { proposal_id: row?.id ?? null, ranked_count: llmRes.ranked.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    // Path A: cron (service_role) — iterate all active teams
    if (token && token === serviceRoleKey) {
      const { data: teams } = await serviceClient
        .from("deal_teams")
        .select("id, tenant_id")
        .eq("active", true);

      const results: Array<{ team_id: string; ranked: number; error?: string }> = [];
      for (const t of teams ?? []) {
        const r = await buildForTeam(serviceClient, t.id, t.tenant_id, "cron", null, requestId);
        results.push({ team_id: t.id, ranked: r.ranked_count, error: r.error });
      }
      return jsonResponse({ ok: true, mode: "cron", results });
    }

    // Path B: manual (JWT)
    const auth = await verifyAuth(req, serviceClient);
    if (isAuthError(auth)) return unauthorizedResponse(auth, corsHeaders);

    let body: { team_id?: string } = {};
    try {
      body = await req.json();
    } catch {
      // no body
    }
    const teamId = body.team_id;
    if (!teamId) return jsonResponse({ error: "team_id required" }, 400);

    // Membership check via RLS-safe RPC
    const { data: membershipOk } = await serviceClient.rpc("is_deal_team_member", { p_team_id: teamId });
    if (!membershipOk) return jsonResponse({ error: "Not a team member" }, 403);

    const r = await buildForTeam(
      serviceClient,
      teamId,
      auth.tenantId,
      "manual",
      auth.directorId ?? auth.user.id,
      requestId,
    );

    if (r.error && r.ranked_count === 0) {
      return jsonResponse({ ok: false, error: r.error, proposal_id: r.proposal_id }, 200);
    }
    return jsonResponse({ ok: true, proposal_id: r.proposal_id, ranked: r.ranked_count });
  } catch (e) {
    console.error("agenda-builder error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
});