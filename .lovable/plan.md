# UNIFY-CONVERT-CLIENT (Sprint S2)

## Pre-flight raport

**A. Schemat `deal_team_contacts`** — wszystkie wymagane kolumny istnieją:
- `client_complexity jsonb`, `expected_annual_premium_gr bigint`
- `potential_property_gr`, `potential_financial_gr`, `potential_communication_gr`, `potential_life_group_gr` — wszystkie `bigint`
- `won_at timestamptz`, `offering_stage text`, `category text`, `assigned_to uuid`
- `deal_stage text` — istnieje (sprawdzę czy GENERATED przed RPC; jeśli tak, nie piszemy do niego)

**B. Realne wartości u istniejących klientów** (10 sample): JSON `client_complexity` i 4 bigint są w użyciu, ale niespójne — np. wszystkie `*_active=false` przy `potential_*_gr > 0`, oraz brak/zerowe `expected_annual_premium_gr` przy wypełnionych potencjałach. Backfill w S2 pomoże, ale **istniejące dane nie zostaną zmodyfikowane poza `client_complexity` JSON sync** (bigint pola zostają jak są).

**C. `deal_team_client_products` ISTNIEJE** — out of scope dla S2; nie dotykamy. `ConvertToClientDialog` (deals-team/) pisze do niej przez `useAddClientProduct`. **Dialog ten zostaje w repo** (S2b go usunie), ale wszystkie entry-pointy zostają przepięte na `WonPremiumBreakdownDialog`.

**Stan dialogów dziś (3 ścieżki)**:
1. `WonPremiumBreakdownDialog` (sgu/odprawa/) — używany w `SGUOdprawa.tsx` po K4.
2. `ConvertWonToClientDialog` (sgu/sales/) — używany w `UnifiedKanban` (DnD offering→client) i `OfferingKanbanBoard`. Robi tylko `category='client'` + `client_status='standard'`, BEZ obszarów.
3. `ConvertToClientDialog` (deals-team/) — używany w `ContactTasksSheet`, `MyTeamTasksView`, `TaskDetailSheet`. N produktów dynamicznie + wpisuje do `deal_team_client_products`.

## Implementacja

### 1. Migracja DB `<ts>_etap2_s2_convert_to_client.sql`

- `archive.deprecated_client_complexity_backup_2026_04_25` — pełen snapshot (id, category, client_complexity, expected_annual_premium_gr, 4× potential_*_gr, backed_up_at).
- `CREATE OR REPLACE FUNCTION convert_to_client(p_dtc_id uuid, p_areas jsonb)` — `SECURITY DEFINER`, `search_path=public`:
  - Parsuje 4 obszary `{property, financial, communication, life_group}` z `{active: bool, annualPremiumPln: number}`.
  - `RAISE EXCEPTION 'Konwersja na klienta wymaga zaznaczenia minimum jednego obszaru.'` jeśli wszystkie inactive.
  - UPDATE: `category='client'`, `won_at=COALESCE(won_at, now())`, `offering_stage='won'` (sprawdzę czy `deal_stage` jest GENERATED — jeśli tak, pomijam), `client_complexity` jsonb_build_object z 4 booleanami + zachowaniem `referrals_count`/`references_count`, 4 bigint potencjały (PLN×100 jeśli active else 0), `expected_annual_premium_gr` = suma aktywnych, `updated_at=now()`.
- Backfill: `UPDATE deal_team_contacts SET client_complexity = jsonb_build_object(...)` dla `category='client'` — sync booleanów z bigintami (fallback gdy JSON pusty).
- ROLLBACK comment: DROP FUNCTION + restore z backupa.

### 2. Hook `src/hooks/useConvertToClient.ts` (nowy)

- `ConvertAreaInput = { active: boolean; annualPremiumPln?: number }`
- `ConvertToClientInput = { dealTeamContactId; areas: { property?, financial?, communication?, life_group? } }`
- `useMutation` → `supabase.rpc('convert_to_client', { p_dtc_id, p_areas })`
- `onSuccess`: invalidate `['deal-team-contacts']`, `['clients']`, `['odprawa-agenda']`, `['sgu-clients-portfolio']`, `['unified-kanban-data']`.

### 3. Refactor `WonPremiumBreakdownDialog.tsx` (sgu/odprawa/)

Zachowuje kontrakt props `{ open, onOpenChange, contactId, teamId, current?, clientName? }`. Wewnątrz:
- 4 sekcje stałe (Majątek/Finanse/Komunikacja/Grupowe na życie), każda: `Checkbox` "Klient ma ten obszar" + `Input type="number"` "Roczna składka (PLN)".
- Pre-fill z `current` (`potential_*_gr / 100` → PLN, `*_active` → checkbox).
- Walidacja: min. 1 checkbox aktywny; submit disabled + helper text gdy 0.
- Suma roczna składek wyświetlana na dole.
- Submit: `useConvertToClient().mutateAsync({ dealTeamContactId: contactId, areas })` → `toast.success('Klient zarejestrowany')` → `onOpenChange(false)`.
- USUWAM: stary `useUpdateTeamContact` (zastąpiony RPC).

### 4. Wpięcie 4 entry-pointów (wszystkie → `WonPremiumBreakdownDialog`)

| Entry-point | Plik | Zmiana |
|---|---|---|
| Odprawa K4 | `pages/sgu/SGUOdprawa.tsx` | bez zmian — już używa canonical |
| Kanban DnD offering→client | `components/sgu/sales/UnifiedKanban.tsx` | zamień `ConvertWonToClientDialog` → `WonPremiumBreakdownDialog` (+ przekaż `current` z istniejącego contact) |
| Kanban "Offering → Won" button | `components/deals-team/offering/OfferingKanbanBoard.tsx` | zamień `ConvertWonToClientDialog` → `WonPremiumBreakdownDialog` |
| ContactTasksSheet "Klient" | `components/deals-team/ContactTasksSheet.tsx` | zamień `ConvertToClientDialog` → `WonPremiumBreakdownDialog` |
| MyTeamTasksView quick-action | `components/deals-team/MyTeamTasksView.tsx` | zamień `ConvertToClientDialog` → `WonPremiumBreakdownDialog` (zachować inline `tc.assigned_to` guard z S1) |
| TaskDetailSheet quick-action | `components/tasks/TaskDetailSheet.tsx` | zamień `ConvertToClientDialog` → `WonPremiumBreakdownDialog` |

`ContactActionButtons` nie zmienia się — emituje `onConvertToClient()`, rodzice powyżej decydują który dialog otworzyć (wszyscy teraz canonical).

### 5. Constraints

- `ConvertToClientDialog` (deals-team/) i `ConvertWonToClientDialog` (sgu/sales/) **zostają w repo** — usunięcie w S2b.
- `deal_team_client_products` **nie ruszone**.
- `deal_stage` GENERATED — nie piszemy bezpośrednio (`offering_stage='won'` wystarczy).
- Brak nowych pól dat start/end, brak nazw "życie/zdrowie/firma" — używamy realnych `property/financial/communication/life_group`.

## Done when

- Pre-flight raport powyżej (✓ już zrobiony).
- Backup `archive.deprecated_client_complexity_backup_2026_04_25` istnieje (count > 0).
- RPC `convert_to_client` z walidacją "min. 1 obszar".
- Backfill JSON sync booleanów z bigintami dla `category='client'`.
- `useConvertToClient` utworzony.
- `WonPremiumBreakdownDialog` refactor: 4 sekcje (checkbox + składka), brak dat.
- 6 entry-pointów (Odprawa K4 + 5 zamian) używa tego samego dialogu.
- `tsc` + `eslint` clean.
- Smoke: konwersja z odprawy K4, z karty (ContactTasksSheet), z DnD (UnifiedKanban), oraz blokada "0 obszarów" → toast.
