

# B-FIX.9 — Naprawa zapisu offering_stage + brak tasków na kartach Kanban

## Bug #1 — Save error: `deal_team_contacts_offering_stage_check`

**Przyczyna:** 3 dialogi zapisują legacy wartości `offering_stage`, które po migracji SGU-REFACTOR-IA są zakazane przez DB constraint:
- `ContactTasksSheet.tsx` line 461 → `'meeting_plan'`
- `MeetingScheduledDialog.tsx` line 53 → `'meeting_scheduled'`
- `MeetingOutcomeDialog.tsx` lines 74, 93 → `'meeting_done'`, `'meeting_plan'`

DB akceptuje tylko: `decision_meeting | handshake | power_of_attorney | audit | offer_sent | negotiation | won | lost`.

**Mapping legacy → nowe** (zgodnie z `OfferingKanbanBoard.tsx` linie 83-86):
- `meeting_plan`, `meeting_scheduled`, `meeting_done` → **`decision_meeting`**
- `audit_plan`, `audit_scheduled`, `audit_done` → `audit`
- `preparation` → `offer_sent`
- `accepted` → `won`

## Bug #2 — Taski nie pokazują się na kartach UnifiedKanban

**Przyczyna:** Mismatch klucza w mapie:
- `useActiveTaskContacts` używa `t.deal_team_contact_id` jako klucza (id z `deal_team_contacts.id`)
- `UnifiedKanban.tsx` linie 198, 411 wołają `taskInfoMap?.get(c.contact_id)` — to id z `contacts.id`

Te ID są różne (dwie różne tabele). Stąd `get()` zawsze zwraca `undefined` → wszystkie karty pokazują pasek `none` i pill `+`.

**Fix:** zmienić na `taskInfoMap?.get(c.id)` (gdzie `c.id` to `deal_team_contacts.id`).

## Pliki

| # | Plik | Zmiana |
|---|---|---|
| 1 | `src/components/deals-team/ContactTasksSheet.tsx` | Linia 461: `'meeting_plan'` → `'decision_meeting'` |
| 2 | `src/components/deals-team/MeetingScheduledDialog.tsx` | Linia 53: `'meeting_scheduled'` → `'decision_meeting'` |
| 3 | `src/components/deals-team/MeetingOutcomeDialog.tsx` | Linia 74: `'meeting_done'` → `'decision_meeting'`; linia 93: `'meeting_plan'` → `'decision_meeting'` |
| 4 | `src/components/sgu/sales/UnifiedKanban.tsx` | Linie 198 i 411: `taskInfoMap?.get(c.contact_id)` → `taskInfoMap?.get(c.id)` |

## Weryfikacja

```bash
npx tsc --noEmit  # exit 0
```

Manual smoke:
- W `ContactTasksSheet` na kontakcie kategorii `hot`/`top` → "Umów spotkanie" zapisuje się bez błędu, `offering_stage` = `decision_meeting`
- Karty na `/sgu/sprzedaz` z istniejącymi taskami pokazują kolorowy pasek + pill z licznikiem + awatary asystentek
- Karty z przeterminowanymi taskami pokazują czerwony pasek + mini-banner

## DoD

| Check | Stan |
|---|---|
| Brak `meeting_plan/meeting_scheduled/meeting_done` w `*.update`/`offeringStage:` | ✅ |
| `taskInfoMap.get(c.id)` zamiast `c.contact_id` | ✅ |
| `tsc --noEmit` exit 0 | ✅ |
| Zapis "Umów spotkanie" działa bez błędu constraint | ✅ |
| Taski widoczne na kartach Kanban | ✅ |

