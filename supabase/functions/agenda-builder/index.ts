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
  created_at: string | null;
  days_since_created: number | null;
  last_note: { date: string; text: string } | null;
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
    .select("id, contact_id, category, temperature, last_status_update, next_action_date, is_lost, created_at")
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

  // Pobierz ostatnie notatki z odprawy per team_contact_id (action='note_added')
  const notesRes = await supabase
    .from("deal_team_activity_log")
    .select("team_contact_id, created_at, new_value")
    .in("team_contact_id", dtcIds)
    .eq("action", "note_added")
    .order("created_at", { ascending: false });

  const lastNoteMap = new Map<string, { date: string; text: string }>();
  for (const row of notesRes.data ?? []) {
    if (lastNoteMap.has(row.team_contact_id)) continue; // pierwsza = najnowsza
    const text =
      row.new_value && typeof row.new_value === "object"
        ? String((row.new_value as Record<string, unknown>).note ?? "")
        : "";
    if (text) {
      lastNoteMap.set(row.team_contact_id, { date: row.created_at, text });
    }
  }

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
      created_at: d.created_at ?? null,
      days_since_created: daysSince(d.created_at),
      last_note: lastNoteMap.get(d.id) ?? null,
    };
  });
}

const SECTION_PRIORITY: Record<string, number> = {
  urgent: 0,
  "10x": 1,
  stalled: 2,
  followup: 3,
  new_prospects: 4,
};

const SECTION_META: Record<string, { label: string; icon: string }> = {
  urgent: { label: "Pilne dziś", icon: "🔥" },
  "10x": { label: "10x", icon: "🎯" },
  stalled: { label: "Stalled", icon: "⚠️" },
  followup: { label: "Follow-upy", icon: "📞" },
  new_prospects: { label: "Nowi prospekci", icon: "🆕" },
};

const SYSTEM_PROMPT = `Jesteś asystentem dyrektora sprzedaży na odprawie zespołowej (CRM ubezpieczeniowy).
Z listy do ${MAX_CONTACTS_INPUT} kontaktów pogrupuj wybranych w sekcje pre-briefu (max ${MAX_RANKED_OUTPUT} kontaktów łącznie):

🔥 urgent ("Pilne dziś") — overdue_tasks > 0, lub kontakt czeka >7 dni na akcję mimo aktywnego taska.
🎯 10x ("10x") — temperature='10x' lub stage='10x'. Zawsze tu, jeśli nie pasuje do urgent.
⚠️ stalled ("Stalled") — days_since_update > 14, brak active_tasks lub brak next_action_date. Ryzyko utraty.
📞 followup ("Follow-upy") — kontakt z aktywnym taskiem na dziś/jutro (next_action_date w ciągu 2 dni), nie pasuje do urgent/10x.
🆕 new_prospects ("Nowi prospekci") — days_since_created < 7 i brak interakcji (last_status_update IS NULL lub days_since_update > 5).

Reguły:
- Każdy contact_id MAX w 1 sekcji. Priorytet: urgent > 10x > stalled > followup > new_prospects.
- Pomiń puste sekcje (NIE dołączaj ich do output).
- Per kontakt: 1 zdanie uzasadnienia po polsku (max 80 znaków), oparte WYŁĄCZNIE na danych wejściowych.
- Jeśli kandydat ma 'last_note' (notatka z poprzedniej odprawy), uwzględnij ją w klasyfikacji i — gdy istotna — wpleć jej sens w uzasadnienie.
- NIE wymyślaj faktów. NIE używaj kwot PLN. Format daty DD.MM.
- W polach 'label' i 'icon' używaj DOKŁADNIE: 🔥 "Pilne dziś", 🎯 "10x", ⚠️ "Stalled", 📞 "Follow-upy", 🆕 "Nowi prospekci".`;

async function rankWithLLM(
  candidates: ContactCandidate[],
  context: { tenant_id: string; team_id: string; actor_id?: string; request_id: string },
): Promise<{
  sections: { key: string; label: string; icon: string; contacts: { contact_id: string; reason: string }[] }[];
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
        name: "submit_grouped_agenda",
        description: "Zwraca pogrupowane sekcje kontaktów do omówienia na odprawie.",
        parameters: {
          type: "object",
          properties: {
            sections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  key: {
                    type: "string",
                    enum: ["urgent", "10x", "stalled", "followup", "new_prospects"],
                  },
                  label: { type: "string", description: "Etykieta PL" },
                  icon: { type: "string", description: "Emoji ikona" },
                  contacts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        contact_id: { type: "string", description: "UUID kontaktu z wejścia" },
                        reason: { type: "string", description: "1 zdanie PL, max 80 znaków" },
                      },
                      required: ["contact_id", "reason"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["key", "label", "icon", "contacts"],
                additionalProperties: false,
              },
            },
          },
          required: ["sections"],
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

  // Parse tool call output
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parsed: any = null;
  try {
    parsed = JSON.parse(result.text);
  } catch {
    const match = result.text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        parsed = null;
      }
    }
  }

  const valid = new Set(candidates.map((c) => c.contact_id));
  const seen = new Set<string>();
  let sectionsOut: { key: string; label: string; icon: string; contacts: { contact_id: string; reason: string }[] }[] = [];
  let rankedFlat: { contact_id: string; reason: string }[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawSections: any[] = Array.isArray(parsed?.sections) ? parsed.sections : [];

  if (rawSections.length > 0) {
    // Sort sections by priority so dedup picks the higher-priority section
    const sorted = [...rawSections].sort((a, b) => {
      const pa = SECTION_PRIORITY[a?.key] ?? 99;
      const pb = SECTION_PRIORITY[b?.key] ?? 99;
      return pa - pb;
    });

    for (const s of sorted) {
      const key = String(s?.key ?? "");
      if (!(key in SECTION_PRIORITY)) continue;
      const meta = SECTION_META[key];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contacts: { contact_id: string; reason: string }[] = Array.isArray(s?.contacts) ? s.contacts : [];
      const cleaned: { contact_id: string; reason: string }[] = [];
      for (const c of contacts) {
        const cid = c?.contact_id;
        if (!cid || !valid.has(cid) || seen.has(cid)) continue;
        seen.add(cid);
        cleaned.push({
          contact_id: cid,
          reason: String(c?.reason ?? "").slice(0, 200),
        });
        rankedFlat.push({ contact_id: cid, reason: String(c?.reason ?? "").slice(0, 200) });
        if (rankedFlat.length >= MAX_RANKED_OUTPUT) break;
      }
      if (cleaned.length > 0) {
        sectionsOut.push({
          key,
          label: typeof s?.label === "string" && s.label.trim() ? s.label : meta.label,
          icon: typeof s?.icon === "string" && s.icon.trim() ? s.icon : meta.icon,
          contacts: cleaned,
        });
      }
      if (rankedFlat.length >= MAX_RANKED_OUTPUT) break;
    }
  } else if (Array.isArray(parsed?.ranked)) {
    // Legacy fallback: model returned old shape
    for (const r of parsed.ranked) {
      if (!r?.contact_id || !valid.has(r.contact_id) || seen.has(r.contact_id)) continue;
      seen.add(r.contact_id);
      rankedFlat.push({ contact_id: r.contact_id, reason: String(r?.reason ?? "").slice(0, 200) });
      if (rankedFlat.length >= MAX_RANKED_OUTPUT) break;
    }
  }

  return {
    sections: sectionsOut,
    ranked: rankedFlat,
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
      grouped_sections: llmRes.sections.length > 0 ? llmRes.sections : null,
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
    tool_name: "agenda-builder.submit_grouped_agenda",
    output: {
      ranked_count: llmRes.ranked.length,
      sections_count: llmRes.sections.length,
      total_contacts: llmRes.sections.reduce((acc, s) => acc + s.contacts.length, 0),
      proposal_id: row?.id,
    },
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
        .eq("is_active", true);

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

    // Membership check (service_role bypasses RLS, so check explicitly)
    if (auth.directorId) {
      const { data: m } = await serviceClient
        .from("deal_team_members")
        .select("id")
        .eq("team_id", teamId)
        .eq("director_id", auth.directorId)
        .maybeSingle();
      if (!m) return jsonResponse({ error: "Not a team member" }, 403);
    }

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