# ODPRAWA-03 — AI layer dla odprawy

## Pre-flight (recon — wynik)

| Pkt | Wynik |
|---|---|
| 0.1 LLM | `_shared/llm-provider.ts` istnieje (Lovable Gateway → Anthropic → OpenAI fallback, tool calling supported). **Wybór: `google/gemini-2.5-flash`** dla pre-brief i live (stabilna, tania, tool calling OK). |
| 0.2 pg_cron / pg_net | `pg_cron 1.6.4` ✅, `pg_net 0.19.5` ✅. Helper `public.schedule_edge_function(name, cron, path, body)` z Vault istnieje (sprint 19a). |
| 0.3 Sovra w SGU | Brak referencji w `src/pages/sgu/*` ani `src/components/sgu/*`. Sovra występuje wyłącznie w **globalnej** nawigacji: `App.tsx` (route `/sovra`), `AppSidebar.tsx` (link), `AppLayout.tsx` (auto-trigger), `Breadcrumbs.tsx`. **Decyzja:** ukrywamy link Sovra gdy ścieżka zaczyna się od `/sgu` (route + auto-trigger zostają — Sovra to feature CRM). |
| 0.4 Schema AI | `ai_conversations`, `ai_messages`, `ai_memory`, `ai_usage_log` (partycjonowany), `odprawa_sessions` ✅. Brak `ai_agenda_proposals` i `ai_audit_log` — utworzymy. `deal_team_contacts` ma `category`, `is_lost`, `last_status_update`, `offering_stage`, `lost_reason` ✅. RPC `get_odprawa_agenda(p_team_id, p_mode)` istnieje — modyfikujemy. |

**STOP-conditions: brak.** Sovra nie jest dependency dla `/sgu/*`, pg_cron włączony, schema kompatybilna.

---

## Plan — 4 sub-commity

### Sub-commit 1 — `chore(sgu): SOVRA-HIDE-IN-SGU-01`

**Pliki:** `src/components/layout/AppSidebar.tsx`

- W komponencie sidebara odczytaj `useLocation().pathname`.
- Jeśli `pathname.startsWith('/sgu')` → odfiltruj item `{ title: 'Sovra', url: '/sovra' }` z renderowanej listy.
- Route `/sovra`, `SovraReminderAutoTrigger` w `AppLayout`, breadcrumb — bez zmian (Sovra zostaje w CRM).

Smoke: na `/sgu/odprawa` link Sovra niewidoczny; na `/dashboard` widoczny.

---

### Sub-commit 2 — `feat(odprawa): ODPRAWA-03 Faza B+C — pre-brief AI agendy`

**B. Migracja `<ts>_ai_agenda_proposals_audit_log.sql`**

Tworzy:
- `ai_agenda_proposals(id, tenant_id, team_id, generated_at, generated_by, triggered_by, ranked_contacts jsonb, llm_provider, llm_model, llm_tokens_in, llm_tokens_out, llm_cost_cents, used_in_session_id)`. Index `(team_id, generated_at DESC)`.
- `ai_audit_log(id, tenant_id, team_id, odprawa_session_id, user_id, timestamp, event_type, tool_name, input jsonb, output jsonb, confirmed, error)`. Index `(odprawa_session_id, timestamp DESC)`.
- RLS: SELECT/ALL przez `tenant_id = get_current_tenant_id() AND is_deal_team_member(team_id)`. INSERT na `ai_audit_log` dla authenticated lub service_role.
- ROLLBACK comment.

**Modyfikacja `get_odprawa_agenda`:**
- Dorzuca pole `ai_reason text`.
- LEFT JOIN do najświeższego `ai_agenda_proposals` dla `team_id` z `generated_at > now() - interval '48 hours'`.
- Jeśli świeży proposal istnieje: `ranked_contacts[i].reason` → `ai_reason`, sortowanie wg pozycji w `ranked_contacts` (a fallback po obecnym `priority_rank`).
- Brak zmiany sygnatury wejścia. Wynik dodaje 1 kolumnę.

**C. Edge function `agenda-builder/index.ts`**

- Auth: `verifyAuth` lub `service_role` (cron). Rate-limit per user.
- Input: `{ teamId, triggeredBy: 'cron'|'manual', userId? }`.
- Logika:
  1. SELECT `deal_team_contacts` gdzie `team_id=:teamId AND COALESCE(is_lost,false)=false AND category != 'client'`.
  2. Score = `stuck_days * stage_weight + milestone_urgency - last_activity_decay` (formuła z briefu). Top 50.
  3. LLM call (`google/gemini-2.5-flash`, no streaming, tool_choice='none'): prompt po polsku, "1 zdanie DLACZEGO" per kontakt. Ograniczenie tokens, fallback przez `_shared/llm-provider.ts`.
  4. Anti-halucynacja: prompt zawiera **tylko** dane z DB (nazwa, stage, dni stuck, milestone status, lost_reason). LLM nie dostaje nic spoza kontekstu.
  5. INSERT `ai_agenda_proposals` z `ranked_contacts: [{contact_id, score, reason, stage, stuck_days}]`, llm metryki.
  6. INSERT `ai_audit_log(event_type='llm_response', tool_name='agenda-builder', tokens, cost)`.
- Output: `{ proposal_id, count, llm_tokens_used, llm_cost_cents }`.
- Errors → `event_type='llm_error'` w audit log + 500.

**Cron przez Vault helper:**
```sql
SELECT public.schedule_edge_function(
  'agenda_builder_sunday_18utc', '0 18 * * 0',
  '/functions/v1/agenda-builder',
  jsonb_build_object('triggeredBy','cron')
);
```
*Uwaga:* helper przyjmuje pojedynczy body — agenda-builder w trybie `cron` bez `teamId` musi sam zaiterować `deal_teams WHERE is_active=true`. Dorzucamy ten branch w funkcji edge.

**UI: przycisk "Wygeneruj agendę AI"**

- Nowy komponent `src/components/sgu/odprawa/AgendaAIRefreshButton.tsx`.
- Hook `useGenerateAgendaProposal(teamId)` — `supabase.functions.invoke('agenda-builder', { body: { teamId, triggeredBy: 'manual', userId }})`.
- Disabled gdy `generated_at` najnowszego proposal < 1h temu (anti-spam) — query `ai_agenda_proposals`.
- Po sukcesie: toast (sonner) + invalidate `['odprawa-agenda', teamId]`.
- Renderowane w `SGUOdprawa.tsx` w nagłówku karty "Agenda" (lewa kolumna).

**`AgendaList.tsx`:** wyrenderuj `ai_reason` jako `<p className="text-xs text-muted-foreground italic">` pod nazwą kontaktu.

**Smoke C:**
1. Klik "Wygeneruj agendę AI" → toast → po ~10-30s reload agendy.
2. `SELECT generated_by, llm_tokens_in, llm_tokens_out, jsonb_array_length(ranked_contacts) FROM ai_agenda_proposals WHERE team_id=? ORDER BY generated_at DESC LIMIT 1;` → `manual`, tokens > 0, length > 0.
3. Każdy wiersz w `AgendaList` ma kursywą uzasadnienie.
4. `SELECT * FROM ai_audit_log WHERE event_type='llm_response' ORDER BY timestamp DESC LIMIT 1;` → wpis z kosztem.

---

### Sub-commit 3 — `feat(odprawa): ODPRAWA-03 Faza D1 — live sidepanel (read-only)`

**Edge function `live-copilot/index.ts`** (READ tools only, streaming SSE)

- Input: `{ sessionId, contactId, dealTeamContactId }`.
- Auth: `verifyAuth` + sprawdzenie membership w `team_id` sesji.
- P0 context (8 pól, master-spec 8.3) — wszystkie SELECT-y serwerowe równolegle:
  - `deal_team_contacts` (full row),
  - `meeting_decisions` last 14d,
  - `tasks` open + overdue,
  - `unified_meetings` next 7d,
  - `insurance_policies` (jeśli klient) + renewals,
  - poprzednia odprawa (`odprawa_sessions` poprzednia + decyzje),
  - `ownership` (jeśli istnieje),
  - GCal directora today (jeśli token jest — opcjonalnie, fallback na pusty array).
- Jeden LLM call (`google/gemini-2.5-flash`, **streaming**), system prompt po polsku z **3 sekcjami** w odpowiedzi:
  - `## Kontekst` — 3-4 bullets z faktów,
  - `## Sugerowana akcja` — tekstowa, 1 zdanie (D1: jeszcze bez tool call!),
  - `## Pytania wspierające` — 2 pytania.
- Anti-halucynacja R1/R2/R3 wymuszona w **prompcie systemowym** + walidator po stronie edge:
  - R1: blacklist regex "dzwonił|spotkał się|rozmawiał (\d|wczoraj|dzisiaj)" — jeśli match nie znajduje pokrycia w `meeting_decisions/tasks/timeline` → strip + ostrzeżenie w streamie.
  - R2: liczby PLN tylko z policies/products. Walidator parsuje "X zł|X PLN" w streamie i odrzuca tokeny niedopasowane.
  - R3: prompt jawnie: "milestone date = TYLKO z kolumn `*_at`. Nie interpretuj milestone'u z maila."
- Każdy etap loguje `ai_audit_log(event_type='tool_call_read', tool_name='gather_p0_context')` i `event_type='llm_response'`.
- Output: SSE strumień tokenów (zgodnie z konwencją `useAIChat` / `ai-stream`).

**Hook `useAILiveContext(sessionId, contactId, dealTeamContactId)`**
- W `src/hooks/odprawa/useAILiveContext.ts`.
- Streaming via `streamAIChat`-like helper (custom URL → `/functions/v1/live-copilot`).
- Trzyma stan: `{ context: string, action: string, questions: string, isStreaming, error }` parsowany na bieżąco po nagłówkach `##`.
- Re-fetch przy zmianie `contactId`. Invalidate przy INSERT na `meeting_decisions`/`tasks` (subskrypcja realtime opcjonalna — w D1 wystarczy ręczne invalidate po `useLogDecision`).

**Komponent `AICopilotSidepanel.tsx`** (`src/components/sgu/odprawa/`)
- Props: `{ sessionId, contactId, dealTeamContactId }`.
- 3 sekcje (Card-based) z markdown rendering.
- Skeleton podczas streamu, error toast przy 429/402.
- D1: bez przycisków write — sugerowana akcja jako tekst.

**Layout `SGUOdprawa.tsx`**
- Zmiana grid: `lg:grid-cols-[280px_1fr]` → `xl:grid-cols-[280px_minmax(0,1fr)_360px]`. Na `lg` → 2-kol (sidepanel pod kartą).
- Prawa kolumna: `<AICopilotSidepanel sessionId={session.id} contactId={current.contact_id} dealTeamContactId={current.dtc_id} />`.

**Smoke D1:** klik kontakt → prawa kolumna streamuje 3 sekcje w <5s. `SELECT * FROM ai_audit_log WHERE odprawa_session_id=? ORDER BY timestamp DESC` → 2 wpisy (`tool_call_read` + `llm_response`).

---

### Sub-commit 4 — `feat(odprawa): ODPRAWA-03 Faza D2 — write tools z confirm dialog`

**`live-copilot` rozszerzenie:**
- LLM dostaje tools array (4 write):
  - `create_task(title, owner_id?, due_date, deal_team_contact_id)`,
  - `update_contact_stage(deal_team_contact_id, new_stage, reason)`,
  - `update_contact_temperature(deal_team_contact_id, new_temperature)`,
  - `log_decision(deal_team_contact_id, decision, notes)`.
- Tool calls **NIE wykonywane na serwerze**. Funkcja zwraca proposal w SSE (special event `tool_call_proposal`).
- INSERT `ai_audit_log(event_type='tool_call_write', tool_name, input, confirmed=null)`.
- Prompt zaktualizowany: "Jeśli pewna akcja jest oczywista, użyj tool calling. W przeciwnym wypadku tylko sugeruj tekstem."

**`AICopilotSidepanel`:**
- Parser SSE wyłapuje `tool_call_proposal` → renderuje przycisk "AI proponuje: …" z ikoną Sparkles.
- Klik → `<AlertDialog>` z opisem akcji + parametrami + `[Anuluj] [Akceptuj]`.
- Akceptacja → wywołuje odpowiedni hook (np. `useCreateTask`, `useLogDecision`, `useUpdateContactCategory`) z params z proposal. Po sukcesie → INSERT `ai_audit_log(event_type='user_confirm', confirmed=true, output=<task.id>)`.
- Anulowanie → INSERT `ai_audit_log(event_type='user_reject', confirmed=false)`. Opcjonalnie kolejny call do live-copilot z feedbackiem (D2 może być TODO).

**Smoke D2:**
1. Robert Karczewski → sidepanel → "AI proponuje: Stwórz zadanie 'Wyślij POA do prezesa'" (jeśli warunki, inaczej tekstowa sugestia).
2. Klik → dialog → akceptuj → toast + INSERT do `tasks`.
3. `SELECT event_type, tool_name, confirmed FROM ai_audit_log WHERE odprawa_session_id=? ORDER BY timestamp;` → sekwencja `tool_call_read`, `llm_response`, `tool_call_write`, `user_confirm`.

---

## Out of scope MVP-1
- **Watchdog (Faza 3 master-spec)** → MVP-3.
- **Voice input** → v2.
- **schedule_meeting via GCal** w write tools → v2.
- **Realtime invalidate** sidepanela na `meeting_decisions` INSERT — D1 ręczne, D2 TODO opcjonalne.
- **Cron `agenda-builder` w trybie cross-team iteration** — trzymamy MVP single-team (cron wywołuje 1× dla każdego active team przez SELECT loop wewnątrz edge function).

---

## Bezpieczeństwo i zgodność z project-knowledge
- ✅ Migration z `BEGIN/COMMIT` + `-- ROLLBACK:` comment.
- ✅ RLS na obu nowych tabelach.
- ✅ Brak `DROP`. Brak modyfikacji istniejących kolumn.
- ✅ LLM tylko przez `_shared/llm-provider.ts` — żadnych bezpośrednich wywołań OpenAI/Anthropic.
- ✅ `verify_jwt` (default Lovable) + `verifyAuth` w handlerze.
- ✅ Rate-limit (`_shared/rateLimit.ts`) na `agenda-builder` i `live-copilot`.
- ✅ Audit log per master-spec 8.4.
- ✅ Sovra zostaje w CRM (per OQ-5).
- ✅ Tailwind tokens, sentence-case PL, sonner toast, Skeleton.
- ✅ Typy z `Tables<>` + regen `types.ts` po migracji.
- ✅ ADR `docs/adr/0020-odprawa-ai-layer.md` — krótki, decyzje LLM/cron/audit.
