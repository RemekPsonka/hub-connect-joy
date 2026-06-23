## Diagnoza

Cognor został dodany przez **„Dodaj do lejka SGU" w karcie kontaktu → `PushToSGUDialog`** (nie przez „Dodaj firmę" w SGU). Dialog pozwala wybrać dowolny etap, w tym `stage='offering'` + substage `offering_stage='power_of_attorney'`, ale **nie ustawia markera czasowego** `poa_signed_at` ani `k1_meeting_done_at`.

`deriveKanbanColumn` (w `src/lib/sgu/deriveKanbanColumn.ts`) wymaga markerów czasowych, żeby zakwalifikować rekord do kolumn `hot/top/lead`. Dla kombinacji (category=`offering`, offering_stage=`power_of_attorney`, poa_signed_at=NULL, k1_meeting_done_at=NULL, next_meeting_date=NULL) **zwraca `null`** → kontakt znika z Kanbanu. W „Klientach" też go nie ma (category≠`client`). To „martwa strefa".

DB potwierdza: 1 rekord Cognor (`8c90a277-…`), team SGU, is_lost=false, dokładnie ta kombinacja.

## Plan naprawy (3 kroki)

### 1) Natychmiastowe odzyskanie Cognora (migracja SQL)
Backfill markera POA na podstawie obecnego `offering_stage` — żeby rekord trafił do kolumny **Hot**:

```sql
UPDATE public.deal_team_contacts
SET poa_signed_at = COALESCE(poa_signed_at, updated_at, created_at)
WHERE team_id = (SELECT id FROM deal_teams WHERE is_sgu = true LIMIT 1)
  AND is_lost = false
  AND category = 'offering'
  AND offering_stage = 'power_of_attorney'
  AND poa_signed_at IS NULL;
```
Analogiczny backfill dla `offering_stage IN ('meeting_done','handshake')` → `k1_meeting_done_at`, oraz `meeting_scheduled` → `next_meeting_date := updated_at`. Z `-- ROLLBACK:` resetującym te pola dla wstawionych rekordów (lista id w komentarzu).

### 2) Bezpiecznik w `deriveKanbanColumn` — żaden aktywny rekord nie znika
W `src/lib/sgu/deriveKanbanColumn.ts` dodać fallback po pętli ifów, żeby zwracać kolumnę po samym `offering_stage` (gdy markery puste) oraz dla `category='offering'`:

- `offering_stage IN ('power_of_attorney','negotiation','closing')` → `'hot'`
- `offering_stage IN ('meeting_done','handshake','proposal','decision_meeting')` → `'top'`
- `offering_stage = 'meeting_scheduled'` → `'lead'`
- `category = 'offering'` (bez wyższego dopasowania) → `'hot'`
- `category IN ('hot','top','10x','audit')` → mapa 1:1 na kolumnę (`top` dla `audit`)
- Ostatecznie pozostały `null` tylko dla `lost/client/won` (jak dziś).

Dodać unit test w `src/lib/__tests__/` z 6–8 przypadkami brzegowymi (w tym Cognor‑case).

### 3) `PushToSGUDialog` — nie zostawiaj rekordów bez markera
Plik: `src/components/sgu/PushToSGUDialog.tsx`. Przy `stage='offering'` dialog powinien dorzucić właściwy timestamp do payloadu wysyłanego do `sgu-push-contact`:
- substage `power_of_attorney` → `poa_signed_at = now()`
- substage `meeting_done | handshake | proposal | decision_meeting` → `k1_meeting_done_at = now()`
- substage `meeting_scheduled` → `next_meeting_date = today`

Analogicznie po stronie edge `supabase/functions/sgu-push-contact/index.ts` — uzupełnić insert/update o te pola, gdy stage=`offering` (nawet jeśli klient nie wyśle markera). To gwarantuje, że żaden nowy rekord nie wpadnie w martwą strefę.

## Weryfikacja
1. Po migracji: `SELECT id, category, offering_stage, poa_signed_at FROM deal_team_contacts WHERE id='8c90a277-…'` → `poa_signed_at` ustawione.
2. `npx tsc --noEmit` + `npm run test` (`deriveKanbanColumn` testy).
3. Manualny check: `/sgu/sprzedaz` — Cognor widoczny w kolumnie **Hot**.
4. Redeploy `sgu-push-contact`.

## Notatka
Nie zmieniamy reguł biznesowych Kanbanu (5 kolumn, mapowania `KANBAN_COLUMN_*`), tylko fallbacki. Stage→substage→marker pozostaje single source of truth; bezpiecznik chroni przed kolejnymi sytuacjami typu „dodałem przez X, zniknął".
