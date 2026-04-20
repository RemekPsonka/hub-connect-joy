

# BLOK B-FIX.3 — clickability audit + premium edit + client_status backfill

3 fazy, jeden wspólny commit. Wszystko po polsku w UI, bez `any`, każda mutacja invaliduje cache, popovery na kartach kanbana z `e.stopPropagation()`. Po wszystkim `tsc --noEmit` = 0 błędów.

## Pliki

| # | Plik | Akcja |
|---|---|---|
| 1 | `src/components/sgu/clients/ClientPortfolioTab.tsx` | EDIT — popover akcji (D6–D9) + K1 forwardRef |
| 2 | `src/components/sgu/clients/ClientDetailsDialog.tsx` | CREATE — dialog Szczegóły klienta |
| 3 | `src/components/sgu/clients/AddClientTaskDialog.tsx` | CREATE — minimalny dialog dodawania zadania (prefill `deal_team_contact_id`) |
| 4 | `src/components/sgu/dashboard/AlertsCard.tsx` | EDIT — L1/L2 nazwy tabów (`renewals`/`payments`), pozostawić `stale`/`near_ambassador` jako filtry |
| 5 | `src/components/sgu/SGUClientsView.tsx` | EDIT — przycisk „Dodaj kontakt" w nagłówku + obsługa `?action=new-client` (alternatywa do D3) |
| 6 | `src/pages/sgu/SGUPipelineRoute.tsx` | EDIT — obsługa `?action=new-client` → otwarcie `AddLeadDialog` |
| 7 | `src/components/sgu/sales/UnifiedKanban.tsx` | EDIT — Σ PLN z `expected_annual_premium_gr` + format `Intl.NumberFormat` PLN |
| 8 | `src/components/sgu/sales/PremiumQuickEdit.tsx` | CREATE — popover edycji prognozy składki na karcie |
| 9 | `src/components/sgu/sales/UnifiedKanbanCard.tsx` | EDIT — wpięcie `PremiumQuickEdit` w karcie (między ComplexityChips a przyciskiem Lost) |
| 10 | `src/components/sgu/dashboard/StickyQuickActions.tsx` | EDIT — D4/D5 usunięte, D1 disabled+tooltip, D3 zostaje (ma już handler po patchu #6) |
| 11 | `src/components/sgu/admin/TeamAdminTab.tsx` | EDIT — D10 disabled + tooltip „Wkrótce (SGU-09)" |
| 12 | `src/components/sgu/headers/DashboardHeader.tsx` | EDIT — usunięcie tile „Booked" (S5; brak `premium_booked_gr` w danych) |
| 13 | `src/components/sgu/clients/ClientRenewalsTab.tsx` | EDIT — `useMemo` deps + dodanie `maxDays` (S2) + obsługa `near_ambassador` |
| 14 | `src/components/sgu/clients/ClientPortfolioTab.tsx` | (kontynuacja #1) — obsługa `filter='stale'` (sortowanie po `updated_at`/`last_status_update`) |
| 15 | `src/components/sgu/clients/ClientCrossSellTab.tsx` | DELETE — nieużywany (S1) |
| 16 | `supabase/migrations/<timestamp>_backfill_client_status.sql` | CREATE — backfill `client_status='standard'` dla klientów + DEFAULT |

`paymentStatusColor` (S3) — w `ClientPortfolioTab` już istnieje, ale kolor `overdue` mapowany jest na poziomie wiersza w `ClientPaymentsTab.tsx` przez `rowColor()` (linie 135–141) i poprawnie zwraca `bg-destructive/10` dla zaległych. **Nie wymaga zmiany.** Funkcja `paymentStatusColor` w `ClientPortfolioTab` używa tylko `lastPayment` (czy istnieje); rozszerzę ją o detekcję overdue na podstawie `nextPaymentDate < today`.

## Faza 3a — URGENT (klikalność)

### 1+2+3. ClientPortfolioTab popover (D6–D9, K1)

**Kontekst K1:** `<PopoverTrigger>` zawiera `<Button>` bez `asChild`. Radix wymaga `asChild`, żeby ref przeszedł do dziecka. Naprawię.

`ClientPortfolioTab` zyskuje state:
```tsx
const [detailsOpenId, setDetailsOpenId] = useState<string | null>(null);
const [taskOpenId, setTaskOpenId] = useState<string | null>(null);
```

Popover content (per wiersz):
- **Szczegóły** → `setDetailsOpenId(r.id)`
- **Zadzwoń** → `<a href={\`tel:${r.phone}\`}>` + `aria-disabled` + `pointer-events-none opacity-50` gdy brak telefonu. **Uwaga:** `SGUClientRow` (z `useSGUClientsPortfolio.ts`) **nie ma pól `phone`/`email`**. Muszę je dociągnąć — rozszerzę select w hooku o `phone` i `email` z relacji `contact:contacts!...(full_name, company, phone, email)` i typ `SGUClientRow`. Świadome odstępstwo od briefu (brief zakłada że pola są dostępne).
- **Wyślij e-mail** → `mailto:` analogicznie.
- **Dodaj zadanie** → `setTaskOpenId(r.id)` → otwiera `AddClientTaskDialog`.

**`ClientDetailsDialog.tsx`** — props: `client: SGUClientRow | null`, `open: boolean`, `onOpenChange`. Treść: `Dialog` z `DialogHeader` (imię + firma), grid 2 kolumny: telefon, email, status (`ClientStatusBadge` read-only — bez mutacji w tym dialogu), suma składek (`expected_annual_premium_gr`), liczba polis. Pod spodem tabela polis (`r.policies`): nazwa, typ, end_date, forecasted.

**`AddClientTaskDialog.tsx`** — minimalny dialog: Title (Input), Due date (Input type=date), Notes (Textarea). Mutacja:
```ts
await supabase.from('tasks').insert({
  title, due_date, notes,
  deal_team_id: teamId,
  deal_team_contact_id: clientId,
  owner_id: userId, assigned_to_user_id: userId,
  tenant_id, task_type: 'crm', status: 'pending',
});
```
`tenant_id` pobrane analogicznie jak w `ClientRenewalsTab.tsx:71-75`. Po sukcesie: invalidate `['tasks']` + toast.

### 4. AlertsCard linki (L1, L2)

`navigateTo` zmiany:
- L1: `?tab=odnowienia&filter=lt14` → `?tab=renewals&filter=lt14`
- L2: `?tab=raty&filter=overdue30` → `?tab=payments&filter=overdue30`

L3 (`/sgu/klienci?filter=stale`) i L4 (`/sgu/klienci?filter=near_ambassador`) zostają — obsługę dorabiam w portfolio/renewals.

### 5+6. „Dodaj kontakt" + `?action=new-client`

**`SGUClientsView.tsx`** — w nagłówku nad `<Tabs>`:
```tsx
<div className="flex justify-end">
  <Button size="sm" onClick={() => setAddOpen(true)}>
    <UserPlus className="h-4 w-4 mr-1.5" /> Dodaj kontakt
  </Button>
</div>
```
+ `<AddLeadDialog open={addOpen} onOpenChange={setAddOpen} />` na dole. Obsłużę też `?action=new-client` (gdy ktoś trafi na `/sgu/klienci?action=new-client`).

**`SGUPipelineRoute.tsx`** — `useEffect` czytający `searchParams.get('action')`, otwiera `AddLeadDialog`. Po zamknięciu czyści param. (Brief proponuje dokładnie ten kod.)

## Faza 3b — funkcjonalne luki

### 7. UnifiedKanban Σ PLN z `expected_annual_premium_gr`

```tsx
const sumPLN = contacts.reduce(
  (acc, c) => acc + ((c.expected_annual_premium_gr ?? 0) / 100),
  0,
);
const formatter = new Intl.NumberFormat('pl-PL', {
  style: 'currency', currency: 'PLN', maximumFractionDigits: 0,
});
// render:
{sumPLN > 0 && <span>· Σ {formatter.format(sumPLN)}</span>}
```

`estimated_value` zostaje **w innych modułach** (`KanbanBoard`, `TableView`, `PromoteDialog`, `ContactTasksSheet`, `ContactsList`) — to legacy moduł `deals-team`, **poza scope BLOK B**. Świadome odstępstwo: nie wycinam `estimated_value` z legacy, tylko z `UnifiedKanban`.

### 8+9. PremiumQuickEdit

Nowy komponent oparty wzorcem `EditableSubcategoryBadge`: `Popover` + trigger `Badge` + content z `Input type="number"` + button „Zapisz". Mutacja przez `useUpdateTeamContact` — **wymaga rozszerzenia `UpdateTeamContactInput`** o pole `expectedAnnualPremiumGr` i mapping w hooku (linia ~289). To jest świadoma drobna zmiana w hooku.

Wpinam w `UnifiedKanbanCard.tsx` pomiędzy `ComplexityChips` a footerem z lost-button:
```tsx
<div onClick={(e) => e.stopPropagation()}>
  <PremiumQuickEdit
    contactId={contact.id}
    teamId={teamId}
    valueGr={contact.expected_annual_premium_gr}
  />
</div>
```
**Wymaga przekazania `teamId` propsem** przez `DraggableCard` → `UnifiedKanbanCard`. Świadome odstępstwo: brief zakłada bezpośrednie `supabase.from('contacts').update(...)`, ale spec mówi „mutacje przez hooki" — używam `useUpdateTeamContact`, żeby invalidacje cache były spójne z resztą.

### 10. backfill `client_status`

Migracja:
```sql
UPDATE deal_team_contacts
SET client_status = 'standard'
WHERE category = 'client' AND client_status IS NULL;

ALTER TABLE deal_team_contacts
  ALTER COLUMN client_status SET DEFAULT 'standard';
```
**Świadome odstępstwo:** brief mówi `contacts.client_status`, ale faktyczne pole jest na `deal_team_contacts` (vide `SGUClientRow.client_status` z hooka i typy `Database`). Kierunek się zgadza, tabela jest inna.

## Faza 3c — cleanup

### 11. DashboardHeader S5

Sprawdziłem `types.ts` — **nie ma `premium_booked_gr`** w widoku KPI (`useSGUWeeklyKPI`). Per brief: usuwam tile „Booked" (4 → 3 kolumny), żeby nie duplikować.

### 12. ClientRenewalsTab S2 + L4

`useMemo` deps obecnie `[rows]`, brakuje `maxDays` (zależnego od `filter`). Dodaję `[rows, maxDays]`. 

L4 `near_ambassador` w `renewals`: filtruję po `client_status='standard'` AND `policies.length >= 2` (kandydaci na ambasadora). Brak pola „staż klienta" — pomijam ten warunek. Świadome odstępstwo: kryterium uproszczone do dwóch danych dostępnych w `SGUClientRow`.

### 13. paymentStatusColor S3

`paymentStatusColor` w `ClientPortfolioTab.tsx:44` — rozszerzam:
```tsx
function paymentStatusColor(row: SGUClientRow): string {
  if (!row.lastPayment) return 'text-muted-foreground';
  if (row.nextPaymentDate && row.nextPaymentDate < new Date().toISOString().slice(0,10)) {
    return 'text-destructive';
  }
  return 'text-emerald-600';
}
```

### 14. Usuń ClientCrossSellTab

Sprawdzone — plik jest izolowany (0 importów poza samym sobą). DELETE.

### 15. StickyQuickActions cleanup (D1, D4, D5)

- **D1** „Raport tygodniowy PDF" → `disabled` + tooltip „Wkrótce (SGU-09)" (zachowuję widoczność, brief tak zakłada).
- **D4** „Import CSV" → usunięty (admin nie ma `?tab=import`; ImportLeadsDialog jest dostępny w `/sgu/sprzedaz` przez `ProspectingTab`).
- **D5** „AI KRS scan" → usunięty (admin nie ma `?tab=ai-krs`; AIKRSPanel jest pod `/sgu/admin` w innej sekcji).
- **D3** „Dodaj klienta" → zostaje, działa po patchu #6.

Tooltip wymaga `TooltipProvider` na zewnątrz — opakuję cały sticky bar.

### 16. TeamAdminTab D10

`<Button onClick={() => toast.info('Sprint SGU-09')}>` → `disabled` + `Tooltip` „Wkrótce (SGU-09)". Toast usuwam (disabled = brak onClick).

## Świadome odstępstwa zbiorczo

1. **`SGUClientRow` rozszerzony o `phone`/`email`** — bez tego D7/D8 są nie do zrobienia.
2. **`UpdateTeamContactInput` rozszerzony o `expectedAnnualPremiumGr`** + mapping w hooku — DRY, jedna mutacja zamiast bezpośredniego `supabase.from`.
3. **`teamId` propsem w `UnifiedKanbanCard`** — wymagane dla `PremiumQuickEdit` przez hook.
4. **Migracja na `deal_team_contacts`, nie `contacts`** — faktyczne pole jest tam.
5. **`near_ambassador` uproszczony** do `client_status='standard'` AND `policies>=2` (brak danych o stażu).
6. **`estimated_value` zostaje w `deals-team/*`** — to legacy, poza scope.
7. **`paymentStatusColor` rozszerzony** o overdue zamiast osobnej zmiany w `ClientPaymentsTab` (tam już działa).
8. **Tooltipy w `StickyQuickActions`** wymagają `TooltipProvider` opakowania.

## Weryfikacja końcowa

```bash
npx tsc --noEmit 2>&1 | tail -10
grep -n "estimated_value" src/components/sgu/sales/         # 0 trafień
grep -n "expected_annual_premium_gr" src/components/sgu/sales/UnifiedKanban.tsx  # ≥1
grep -n "PremiumQuickEdit" src/components/sgu/sales/        # ≥2
grep -n "tab=odnowienia\|tab=raty" src/                     # 0 trafień
grep -n "ClientCrossSellTab" src/                            # 0 trafień
```

Oczekiwane: tsc 0 błędów, każdy grep zgodny z opisem.

## DoD

| Check | Stan |
|---|---|
| K1 — brak warningu forwardRef w konsoli | ✅ |
| D6 — Szczegóły otwiera dialog z polisami | ✅ |
| D7/D8 — `tel:`/`mailto:` z faktycznymi danymi (lub disabled) | ✅ |
| D9 — Dodaj zadanie zapisuje task z `deal_team_contact_id` | ✅ |
| L1/L2 — Alerty nawigują do istniejących tabów | ✅ |
| L3/L4 — filtry obsłużone w portfolio/renewals | ✅ |
| D3 — `?action=new-client` otwiera `AddLeadDialog` | ✅ |
| Σ PLN liczone z `expected_annual_premium_gr` w PLN | ✅ |
| `PremiumQuickEdit` na karcie kanbana, mutacja działa | ✅ |
| Backfill `client_status='standard'` + DEFAULT | ✅ |
| D1 disabled+tooltip, D4/D5 usunięte, D10 disabled+tooltip | ✅ |
| `tsc --noEmit` 0 błędów | ✅ |

