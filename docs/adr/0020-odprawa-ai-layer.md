# ADR 0020 — Warstwa AI dla Odprawy (ODPRAWA-03)

Data: 2026-04-25
Status: Accepted (MVP-1)

## Kontekst

Tryb Pracy SGU (`/sgu/odprawa`) potrzebuje wsparcia AI w dwóch miejscach:
1. **Pre-brief** — uszeregowanie kontaktów do omówienia DZIŚ z krótkim uzasadnieniem (`ai_reason`).
2. **Live copilot** — sidepanel ze streamingiem kontekstu, sugestii i pytań pomocniczych podczas sesji.

## Decyzje

### LLM stack
- Provider: `_shared/llm-provider.ts` (Lovable Gateway → Anthropic → OpenAI fallback).
- Model dla pre-brief i live copilot: `google/gemini-2.5-flash` (stabilna, tool calling, niski koszt).
- Brak bezpośrednich wywołań OpenAI/Anthropic z edge functions.

### Persistence
- `ai_agenda_proposals` — propozycja agendy per team (ranked_contacts JSONB + tokens + cost).
- `ai_audit_log` — każdy `tool_call_read`, `tool_call_write`, `llm_response`, `user_confirm`, `user_reject`.
- `get_odprawa_agenda` RPC: jeśli istnieje świeży proposal (<48h), używa jego sortowania i dorzuca `ai_reason`.

### Pre-brief (Faza C)
- **MVP-1: tylko on-demand** (manual button `AgendaAIRefreshButton` w nagłówku agendy).
- Cron `agenda_builder_daily_06` był zaplanowany przez `schedule_edge_function` (Vault helper), ale został wyłączony przed wdrożeniem. Powód: brak feedbacku czy auto-refresh dostarcza wartość — taniej zacząć od manual i dodać cron w MVP-1.1 jeśli zespół zgłosi potrzebę.
- Edge function `agenda-builder` zachowuje gałąź `service_role` (cron path) jako defensive code — gotowa do reaktywacji bez zmian w kodzie.

### Live copilot (Faza D)
- D1: SSE streaming, 8 read tools (P0 context: deal_team_contacts, decisions, tasks, meetings, policies, prev session, ownership, GCal today). Brak write tools.
- D2: 4 write tools (`create_task`, `update_contact_stage`, `update_contact_temperature`, `log_decision`) — propozycje przez SSE event `tool_call_proposal`, NIGDY auto-execute. Wymagany `<AlertDialog>` z confirm. Każda akcja → wpis do `ai_audit_log`.
- Anti-halucynacja: guards R1 (regex blacklist czasowników faktualnych), R2 (kwoty PLN tylko z policies/products), R3 (milestone date tylko z kolumn `*_at`).

## Konsekwencje

- ✅ Brak kosztów AI bez świadomej akcji użytkownika (bez crona).
- ✅ Każda akcja AI ma audit trail.
- ✅ Pełna izolacja per team (RLS via `is_deal_team_member`).
- ⚠️ Pre-brief wymaga ręcznego kliknięcia — UX trade-off za przewidywalny koszt.
- 🔁 Reaktywacja crona = jeden `SELECT public.schedule_edge_function('agenda_builder_daily_06', '0 6 * * *', '/functions/v1/agenda-builder', '{}'::jsonb);`.

## Out of scope (MVP-1)

- Watchdog (Faza 3 master-spec) → MVP-3.
- Voice input → v2.
- `schedule_meeting via GCal` w write tools → v2.