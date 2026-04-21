

# B-FIX.5-snooze-ux — pasek "Odłożone" w SGU + auto-powrót cron

## Diagnoza stanu obecnego

W `src/components/sgu/sales/UnifiedKanban.tsx` filtr `snoozed_until` **już istnieje** (linie 473–479) — odłożone kontakty są wykluczane z grida. Czego brakuje:
1. Brak ekspozycji `snoozedContacts` jako osobnej listy → nie da się ich pokazać w pasku.
2. Brak komponentu `SnoozedContactsBar` nad gridem (jest gotowy w `src/components/deals-team/SnoozedContactsBar.tsx`, używany tylko w legacy `KanbanBoard`).
3. Brak edge function `return-snoozed-contacts` ani crona — odłożone nie wracają automatycznie po `snoozed_until`.

## Rozwiązanie — 1 PR, 3 zmiany

### Zmiana 1 — wydziel `snoozedContacts` w UnifiedKanban

**Plik:** `src/components/sgu/sales/UnifiedKanban.tsx` (linie 473–497)

Refactor `visible` → zwraca `{ activeForGrid, snoozedActive }`:
- `snoozedActive` = `!is_lost && snoozed_until && snoozed_until >= nowIso` (przyszłe i dzisiejsze odłożenia)
- `activeForGrid` = `!is_lost && (!snoozed_until || snoozed_until < nowIso)` + filtr search (jak teraz)
- Komentarz: dziś odłożone czekają na crona — pokazuje je pasek z badge "Czas wrócić".

`grouped` używa `activeForGrid` (bez zmian semantyki).

### Zmiana 2 — wpięcie `SnoozedContactsBar` nad gridem

Ten sam plik. Import:
```tsx
import { SnoozedContactsBar } from '@/components/deals-team/SnoozedContactsBar';
```

Wpięcie tuż przed `<DndContext>` (linia 626):
```tsx
<SnoozedContactsBar
  snoozedContacts={snoozedActive}
  teamId={teamId}
  onContactClick={(c) => setSheetContact(c)}
/>
```

Komponent `SnoozedContactsBar` jest gotowy: collapsible header z liczbą, grid kart z przyciskiem "Obudź" (czyści `snoozed_until/snooze_reason/snoozed_from_category` przez `supabase.from('deal_team_contacts').update`). Działa out-of-the-box z naszym schematem.

### Zmiana 3 — edge function `return-snoozed-contacts` + cron

**3a) Nowy plik:** `supabase/functions/return-snoozed-contacts/index.ts`

Service-role client. SELECT z `deal_team_contacts` gdzie `snoozed_until <= today` AND `snoozed_until IS NOT NULL`. Dla każdego rekordu UPDATE: `category = COALESCE(snoozed_from_category, '10x')`, `snoozed_until=NULL`, `snooze_reason=NULL`, `snoozed_from_category=NULL`. Zwraca `{ processed, results }`. CORS headers, brak JWT (cron-only).

**3b) Konfiguracja `verify_jwt = false`** w `supabase/config.toml` dla tej funkcji (cron wywołuje bez user JWT).

**3c) Cron** — wstawienie przez `supabase--read_query`/insert (zgodnie z mem `Scheduling pg_cron` używamy helpera `schedule_edge_function` z Vault):
```sql
SELECT public.schedule_edge_function(
  job_name => 'return-snoozed-contacts-daily',
  schedule => '0 6 * * *',  -- 06:00 UTC = 07:00/08:00 PL
  function_name => 'return-snoozed-contacts',
  body => '{}'::jsonb
);
```
Jeśli helper nie istnieje — fallback na klasyczny `cron.schedule` z `net.http_post` + `current_setting('app.settings.service_role_key')` (bez hardkodowania klucza w migracji).

## Pliki

| # | Plik | Akcja |
|---|---|---|
| 1 | `src/components/sgu/sales/UnifiedKanban.tsx` | EDIT — split visible→{activeForGrid, snoozedActive}, render `<SnoozedContactsBar>` nad gridem |
| 2 | `supabase/functions/return-snoozed-contacts/index.ts` | NEW — service-role worker przywracający kategorię |
| 3 | `supabase/config.toml` | EDIT — `[functions.return-snoozed-contacts]` `verify_jwt = false` |
| 4 | (cron) | INSERT przez insert-tool (nie migracja — zawiera service-role key) |

## Poza zakresem

- Port `SnoozedTeamView` (pełna tabela odłożonych) — pasek wystarczy.
- Zmiany w `deriveStage` ani w legacy `KanbanBoard.tsx`.
- Notyfikacje "X kontaktów wróciło dziś" — osobny sprint.

## DoD

| Check | Stan |
|---|---|
| `snoozedActive` wydzielone, grid używa `activeForGrid` | ⬜ |
| `SnoozedContactsBar` widoczny nad kolumnami w `/sgu/sprzedaz` gdy są odłożone | ⬜ |
| Klik "Obudź" na pasku → kontakt wraca do kanbana (existing logic) | ⬜ |
| Edge function `return-snoozed-contacts` wdrożona, manual curl zwraca `{processed:N}` | ⬜ |
| Cron `return-snoozed-contacts-daily` w `cron.job` (schedule `0 6 * * *`) | ⬜ |
| Smoke: `UPDATE ... SET snoozed_until=current_date WHERE id='ff95fb46…'` → trigger funkcji → Bogdan: `category='audit'`, `snoozed_until=NULL`, `snoozed_from_category=NULL` | ⬜ |
| `npx tsc --noEmit` exit 0 | ⬜ |

