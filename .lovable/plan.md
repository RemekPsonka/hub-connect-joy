# BLOK 1 — Domknięcie lejka SGU (drift + OS2 verify + B-FIX.13) — REVISED

## Odpowiedzi na 3 zastrzeżenia Remka (2026-04-23)

### 1. Linia 248-252 w `TaskDetailSheet.tsx` — DLACZEGO NIE WYMAGA FIXA
To **inny case**: linia 248-252 to handler `handleColumnChange` (zmiana etapu workflow przez dropdown). Jedyne co robi to `setMeetingDecisionOpen(true); return;` — **przerywa przed `updateContact.mutate`** i otwiera dialog. Cała decyzja (go/postponed/dead) i ewentualne zamknięcie taska dzieje się w `onSuccess` dialogu (linie 375-382). Patch części B dotyka właśnie tego `onSuccess` i to jest jedyne miejsce gdzie task dostaje `status='completed'`. Linia 248-252 **nie zamyka tasku** — tylko otwiera dialog. Bug jest tylko w 375-382.

### 2. `MeetingDecisionDialog.onSuccess` sygnatura — wybór: opcja (a) update wszystkich callerów
Pre-flight `grep -rn "MeetingDecisionDialog" src/` daje **3 callerów**:
- `src/components/tasks/TaskDetailSheet.tsx:370` — `onSuccess={async () => { ...; updateTask({status:'completed'}) }}` (TO JEST BUG — zamyka dla każdej decyzji)
- `src/components/deals-team/ContactTasksSheet.tsx:764` — `onSuccess={() => setShowMeetingDecision(false)}` (no-op po stronie taska)
- `src/components/sgu/sales/UnifiedKanban.tsx:865` — **brak `onSuccess`** (dialog sam wywoła `?.()`, bezpieczne)

**Decyzja:** opcja (a) — zmieniam sygnaturę na `onSuccess?: (decisionType: DecisionType) => void` (NIE optional `decisionType?`, tylko required arg). Update'uję wszystkich callerów:
- `MeetingDecisionDialog.tsx` linia 215: `onSuccess?.(decisionType)` (mam już `decisionType` w scope)
- `ContactTasksSheet.tsx:769` — `onSuccess={() => setShowMeetingDecision(false)}` → `onSuccess={(_decisionType) => setShowMeetingDecision(false)}` (ignoruje arg, bez zmian behavior)
- `UnifiedKanban.tsx:865` — bez zmian (nie ma onSuccess)
- `TaskDetailSheet.tsx:375` — `onSuccess={async (decisionType) => { ...; if (decisionType === 'go') updateTask({status:'completed'}) }}`

Eksportuję typ `DecisionType` z `MeetingDecisionDialog.tsx` żeby caller mógł go zaimportować.

### 3. RLS na `meeting_decisions` — komentarz append-only
Dopisuję w migracji jasny komentarz:
```sql
-- INTENCJONALNIE BRAK POLICY UPDATE/DELETE: tabela append-only (audit trail decyzji
-- spotkaniowych). Decyzja jest zdarzeniem historycznym — korekta = nowa decyzja
-- (kolejny INSERT), nigdy edycja istniejącej. Trigger trg_apply_meeting_decision
-- ustawia stan deal_team_contacts wyłącznie na podstawie tych nieedytowalnych zdarzeń.
-- NIE DODAWAJ policies UPDATE/DELETE bez explicite zgody product ownera.
```

---

## Cel
Załatać 3 luki po SGU-REFACTOR-IA / HOTFIX-OS1 zanim ruszymy dalej:
- **A** — schema drift: `meeting_decisions` + `meeting_questions` w live, brak w migracjach (P0).
- **B** — HOTFIX-OS2: zamykanie taska po decyzji spotkaniowej tylko dla `decisionType === 'go'`.
- **C** — B-FIX.13 dokończenie: backfill (no-op) + AFTER UPDATE trigger propagujący opiekuna.

## Pliki dotykane (4)

| Plik | Status | LOC |
|---|---|---|
| `supabase/migrations/20260423120000_schema_drift_meeting_tables.sql` | NEW | ~120 |
| `supabase/migrations/20260423120100_bfix13_backfill_and_propagation.sql` | NEW | ~50 |
| `src/components/deals-team/MeetingDecisionDialog.tsx` | EDIT (export type + signature + call) | +3/-1 |
| `src/components/tasks/TaskDetailSheet.tsx` | EDIT (warunkowe close) | +5/-3 |
| `src/components/deals-team/ContactTasksSheet.tsx` | EDIT (caller arg) | +1/-1 |

Razem ~180 LOC.

## CZĘŚĆ A — migracja schema drift
Idempotentnie odtworzyć z live: `meeting_decisions` (15 kolumn z `tenant_id`, `team_id`, `meeting_date`, `next_action_date`, `postponed_until`, `dead_reason` itd.) + `meeting_questions` (15 kolumn z `question_text`, `status text DEFAULT 'open'`, `ask_count`, `last_asked_*`). RLS policies: SELECT + INSERT (z `created_by = auth.uid()` w WITH CHECK) + UPDATE tylko na `meeting_questions`. Komentarz "append-only" na `meeting_decisions`. Trigger `set_meeting_questions_updated_at` (BEFORE UPDATE). Indeksy na FK. **NIE replikujemy** triggera `trg_apply_meeting_decision` ani funkcji `apply_meeting_decision()` — są w `20260422171024_*.sql`. **NIE tworzymy enuma** `meeting_question_status` — w live jest text, zostaje text (decyzja Remka).

## CZĘŚĆ B — HOTFIX-OS2 patch
1. `MeetingDecisionDialog.tsx`:
   - Dodaj `export type DecisionType = 'go' | 'postponed' | 'dead';` (linia 35).
   - Zmień `onSuccess?: () => void` → `onSuccess?: (decisionType: DecisionType) => void` (linia 56).
   - Linia 215: `onSuccess?.()` → `onSuccess?.(decisionType)` (`decisionType` jest już w scope, non-null bo guard `if (!decisionType || !isValid) return`).
2. `ContactTasksSheet.tsx:769` — `onSuccess={() => setShowMeetingDecision(false)}` → `onSuccess={(_decisionType) => setShowMeetingDecision(false)}`.
3. `TaskDetailSheet.tsx:375-382` — warunkowe zamknięcie:
   ```ts
   onSuccess={async (decisionType) => {
     setMeetingDecisionOpen(false);
     if (decisionType !== 'go') return;
     try { await updateTask.mutateAsync({ id: taskId, status: 'completed' }); }
     catch (err) { console.error('[HOTFIX-OS2] Failed to close task after meeting decision', err); }
   }}
   ```
   Import: `import { MeetingDecisionDialog, type DecisionType } from '@/components/deals-team/MeetingDecisionDialog';` (linia 158).

`UnifiedKanban.tsx:865` bez zmian (nie używa `onSuccess`).

## CZĘŚĆ C — backfill + propagation trigger
Migracja `20260423120100_bfix13_backfill_and_propagation.sql`:
1. Backfill UPDATE z `RAISE NOTICE` (no-op przy obecnym count=0, ale zostaje dla przyszłych edge case'ów).
2. Funkcja `propagate_assigned_to_to_open_tasks()` — `SECURITY DEFINER`, `search_path=public`.
3. Trigger `trg_propagate_assigned_to` — `AFTER UPDATE OF assigned_to ON deal_team_contacts FOR EACH ROW WHEN (NEW.assigned_to IS DISTINCT FROM OLD.assigned_to)`.
4. ROLLBACK w komentarzu.

## Acceptance criteria

**A:** plik migracji idempotentny; `\d+ meeting_decisions` po reset = live (15 kol, RLS ON, 2 policy SELECT+INSERT, append-only komentarz); `\d+ meeting_questions` = live (15 kol, RLS ON, 3 policy + trigger updated_at); `tsc --noEmit` clean.

**B:** `decisionType='go'` → task completed; `'postponed'` → task zostaje; `'dead'` → task zostaje. Wszyscy 3 callerzy `MeetingDecisionDialog` kompilują się i działają (ContactTasksSheet zamyka dialog, UnifiedKanban no-op, TaskDetailSheet warunkowo zamyka task).

**C:** backfill no-op; `pg_trigger WHERE tgname='trg_propagate_assigned_to'` = 1; manualny smoke (po deploy): zmiana `dtc.assigned_to` → propagacja do otwartych tasków natychmiast.

## Backlog (nie ten sprint)
- Milestone timestampy (`meeting_scheduled_at`, `handshake_at`, `poa_signed_at`)
- Process continuity CHECK (`next_action_at NOT NULL` gdy stage=offering)
- Odprawa SGU (greenfield, BLOK 3)
- Decyzja: czy `meeting_questions.status` → enum (osobna migracja, wymaga konwersji danych)

