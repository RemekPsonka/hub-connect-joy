# CLEANUP-BUGS-01 — STATUS: ✅ COMPLETED

## Wyniki

| Krok | Status | Walidacja |
|------|--------|-----------|
| A — SGU-CLIENTS-REDIRECT (#25) | ✅ FIXED | `App.tsx`: dodano `<Route path="/sgu/clients" element={<Navigate to="/sgu/klienci" replace />} />` |
| B — NEXTSTEP-OWNER-FIX-02 (#21) | ✅ FIXED | `AddClientTaskDialog.tsx`, `ClientRenewalsTab.tsx`: lookup `directors.id` przed INSERT, `owner_id=ownerDirectorId` |
| C — AGENDA-NAME-SYNC (#22) | ⚠️ SKIP — false positive | RPC poprawnie używa `COALESCE(co.name, c.company)`. Tester pomylił Robert Kamiński (kaminski.org) vs Robert Karczewski (Rex-Bud). Ticket zamknięty bez fixu. |
| D — KANBAN-CLIENT-FILTER (#24) | ✅ FIXED | `UnifiedKanban.tsx`: usunięta kolumna 'client'. `SalesHeader.tsx`: usunięte KPI 'Klienci' + dead code (`expectedPortfolioPLN`, `formatPLN`, `Star`). |
| E — TASK-AUTOCOMPLETE (#23) | ✅ FIXED + zweryfikowane SQL | Migracja: trigger `apply_meeting_decision` zamyka tylko konkretny `follow_up_task_id` i tylko dla `decision_type IN ('go','dead')`. Smoke push → task pozostaje `open` (przedtem `completed` w ~0s). |

## Side discovery (pre-existing, nie fixowane w tym sprincie)

- **#26**: Trigger `apply_meeting_decision` ma `NEW.lost_reason` w branchu `dead`, ale kolumna w `meeting_decisions` nazywa się `dead_reason` → INSERT z `decision_type='dead'` rzuca `42703`. Bug w trigerze (poza E/#23 scope). Do osobnego ticketu.
- Pre-existing build errors w edge functions (`ai-stream`, `gcal-auth`, `gcal-sync-events`, `sovra`, `sovra-reminder-trigger`) — nie dotyczą tej zmiany.

---

# TRIGGER-DEAD-REASON-FIX (#27) — STATUS: ✅ COMPLETED

Naprawiony trigger `apply_meeting_decision` dla `decision_type='dead'`:

- **#27a**: `NEW.lost_reason` → `NEW.dead_reason` (kolumna na `meeting_decisions` to `dead_reason`).
- **#27b** (ujawnione przez smoke): usunięto `SET deal_stage='lost'` — `deal_stage` jest `GENERATED ALWAYS` z `category` → ręczny UPDATE rzucał `428C9` i blokował CAŁĄ decyzję `dead`. Trigger w starej formie był niegrywalny.

## Smoke test

1. INSERT `meeting_decisions(decision_type='dead', dead_reason='SMOKE TEST #27 — dead_reason fix')` na kontakcie Osiewicz.
2. SELECT po triggerze:
   - `lost_reason='SMOKE TEST #27 — dead_reason fix'` ✅
   - `is_lost=true`, `category='lost'`, `deal_stage='lost'` (auto), `status='disqualified'`, `lost_at=now()` ✅
3. Cleanup: DELETE testowej decyzji + przywrócenie Osiewicza (`is_lost=false`, `category='prospect'`, `status='active'`). Zweryfikowane SELECT-em.

## Pliki

- nowa migracja `apply_meeting_decision` (CREATE OR REPLACE z fix #27a + #27b)

## Pominięte z brief ODPRAWA-TEMPLATES-01 (już wdrożone wcześniej, sprawdzone w plikach)

- Templates "Co dalej?" + `visibleWhen` POA/Oferta — `NextStepDialog.tsx` linie 60–98, render 264–292
- Prefilled title + offering_stage update — `openWithTemplate` + linia ~230
- OperationalActions: tylko Notatka + 10x — `OperationalActions.tsx` (komentarz potwierdza migrację)
- Etykiety milestone (K1 Spotkanie / K2 Handshake / K2+ Pełnomocnictwo / K3 Audyt / K4 Polisa wygrana) — `useContactTimelineState.ts` linie 100–106
- Trigger selective task close (#23) — wcześniejsza migracja CLEANUP-BUGS-01

## Pliki

- `src/App.tsx` (A: import Navigate + redirect route)
- `src/components/sgu/clients/AddClientTaskDialog.tsx` (B: owner_id=director.id)
- `src/components/sgu/clients/ClientRenewalsTab.tsx` (B: owner_id=director.id)
- `src/components/sgu/sales/UnifiedKanban.tsx` (D: usunięta kolumna client)
- `src/components/sgu/headers/SalesHeader.tsx` (D: usunięte KPI Klienci + dead code)
- `supabase/migrations/<ts>_fix_apply_meeting_decision_task_completion.sql` (E)

## Smoke results

- **A**: nawigacja `/sgu/clients` → `/sgu/klienci` (po deploy preview)
- **B**: zmiany kodu, smoke ręczny po deploy preview
- **D**: build clean, kanban ma 3 kolumny + 4 KPI cards (Prospekci/Leady/Ofertowanie/Odłożone)
- **E**: SQL smoke `decision_type='push' + follow_up_task_id` → task `status=open` ✅
