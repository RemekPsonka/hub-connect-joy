

# Sprint 05 — Sovra 2.0 tool calling (FINAL z security fix)

## Korekta security
- `sovra-confirm` zostaje z **domyślnym `verify_jwt = true`** (nie dodajemy wpisu w `config.toml`).
- Pierwsza linia handlera: `verifyAuth(req, supabase)` z `_shared/auth.ts`. Następnie sprawdzenie `pending_action.actor_id === auth.directorId AND tenant_id === auth.tenantId` przed jakąkolwiek akcją.

## Plan w skrócie (reszta bez zmian)

### A. Migracja SQL
- `sovra_pending_actions` (tenant + actor + conversation, status, expires_at 15min, metadata jsonb) z RLS per `tenant_id + director_id`
- 5 RPC `SECURITY INVOKER`: `rpc_sovra_search_contacts/companies/deals`, `rpc_sovra_get_contact_details`, `rpc_sovra_analyze_pipeline`
- Schema fix: `companies.name`, `deal_team_contacts.team_id` + `category`
- GRANT EXECUTE TO authenticated
- Snapshot do `archive.schema_snapshot_20260418`

### B. Edge functions
- **`sovra/tools.ts`** — 11 toolów (OpenAI function-calling format):
  - Read (5): search_contacts/companies/deals, get_contact_details, analyze_pipeline → execute przez RPC
  - Write (4): create_contact, create_task (z wymaganym contact_id), create_note, update_deal_stage → INSERT do `sovra_pending_actions`
  - Stub (2): draft_email, create_calendar_event → pending_action z `metadata.integration_ready=false`
  - `humanSummary(name, args)` po polsku
- **`sovra/index.ts`** — pętla tool-calling (max 5 iter):
  - Stream + tools w body
  - Akumulacja `delta.tool_calls[].arguments` per index
  - Read tools → execute, persist `role:'tool'`, SSE event `{type:'tool_result',...}`
  - Write tool → pending_action, SSE event `{type:'pending_action',...}`, **break**
  - Fallback: jeśli streaming tool_calls się posypie → non-stream POST dla iteracji z toolami
- **`_shared/llm-provider.ts`** — dodać `tools` i `tool_choice` w `CallLLMOptions`
- **`sovra-confirm/index.ts`** (NOWY folder, **verify_jwt=true domyślnie**):
  - `verifyAuth` → 401 jeśli brak JWT
  - SELECT pending_action + check ownership (actor_id + tenant_id) + status='pending' + not expired
  - `cancel` → UPDATE status, INSERT tool message
  - `confirm` → switch po tool: INSERT contacts/tasks, append do contacts.notes, UPDATE deal_team_contacts. Stuby = no-op + status='confirmed'. Persist tool_results w `ai_messages`.
- **`_shared/prompts/sovra.v1.ts`** — dopisek o obowiązku tool callingu dla danych

### C. Frontend
- **`useSovraChat.ts`**: rozszerz `SovraMessage` o `pending_action?` i `tool_calls?`. Parser SSE rozpoznaje custom `type:'pending_action'|'tool_result'`. Nowa fn `confirmAction(id, decision)` → POST `/sovra-confirm` z auth headerem (React Query session) → reload ostatnich messages.
- **`SovraConfirmModal.tsx`** — shadcn `AlertDialog` z summary + loading state.
- **`SovraMessages.tsx`** — bańka pending_action z przyciskami Potwierdź/Anuluj (otwiera modal); tool_result jako neutralna bańka z ikoną.

### D. Config
- **NIE** dodajemy bloku `[functions.sovra-confirm]` — zostaje globalny `verify_jwt = true`.
- `sovra` zostaje z S04 (verify_jwt=false + walidacja w kodzie, bo streaming SSE).

## Kolejność
1. Migracja SQL (snapshot → pending_actions + RLS → 5 RPC + GRANT)
2. `_shared/llm-provider.ts` (tools w opts)
3. `sovra/tools.ts` + `sovra/index.ts` (pętla + SSE custom events)
4. `sovra-confirm/index.ts` (verifyAuth + ownership check + switch akcji)
5. `_shared/prompts/sovra.v1.ts` (dopisek)
6. FE: useSovraChat, SovraConfirmModal, SovraMessages
7. Smoke test: read tool, write tool z confirm, cancel, expired (TTL 15min)

## DoD
- [ ] sovra_pending_actions + RLS, 5 RPC działa
- [ ] Read tool → wynik w wiadomości
- [ ] Write tool → modal Potwierdź/Anuluj
- [ ] Confirm → INSERT + tool message + status='confirmed'
- [ ] Cancel → status='cancelled', brak insertu
- [ ] sovra-confirm wymaga JWT (curl bez auth → 401)
- [ ] sovra-confirm odrzuca cudzy pending_action (403)
- [ ] Stuby (draft_email, calendar) → confirmed bez side-effectu, metadata.integration_ready=false

## Ryzyka
- R1: Streaming `delta.tool_calls` Gemini — fallback non-stream gotowy
- R2: Format pól tool_calls Gemini vs OpenAI — mapper jeśli trzeba
- R3: `tasks.contact_id` wymagane w schemacie toola
- R4: cost pricing inline (TODO S10)

