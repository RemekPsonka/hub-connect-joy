

## BLOK B-FIX.2 — edytowalne badges sub-kategorii + counts parity

### Cel
1. Wyrównać filtr `visibleContacts` w `SalesHeader` z `UnifiedKanban` (uwzględnić `snoozed_until`).
2. Zamienić read-only badges (Temperature/Source) na klikalne popovery z RadioGroup-style listą opcji. Dodać analogiczny `ClientStatusBadge` dla kolumny Klient.

### Pliki

| Plik | Akcja |
|---|---|
| `src/components/sgu/headers/SalesHeader.tsx` | EDIT — `visibleContacts` z filtrem `snoozed_until` |
| `src/components/sgu/sales/EditableSubcategoryBadge.tsx` | CREATE — generyczny badge+popover |
| `src/components/sgu/sales/TemperatureBadge.tsx` | EDIT — wrapper na `EditableSubcategoryBadge` z `onChange` |
| `src/components/sgu/sales/SourceBadge.tsx` | EDIT — wrapper na `EditableSubcategoryBadge` z `onChange` |
| `src/components/sgu/sales/ClientStatusBadge.tsx` | CREATE — wrapper z opcjami `standard`/`ambassador` |
| `src/components/sgu/sales/UnifiedKanbanCard.tsx` | EDIT — nowy prop `onSubcategoryChange`, usunięcie osobnego badge'a Ambasador |
| `src/components/sgu/sales/UnifiedKanban.tsx` | EDIT — handler `handleSubcategoryChange`, przekazanie do karty |
| `src/hooks/useDealsTeamContacts.ts` | EDIT (warunkowo) — dodanie pól `temperature`/`prospect_source`/`client_status` w sygnaturze `useUpdateTeamContact`, jeśli brak |

### 1. `SalesHeader.tsx` — counts parity

Zamiana lokalnego `visible` (filtr tylko `!c.is_lost`) na:
```ts
const nowIso = new Date().toISOString();
const visibleContacts = contacts.filter(
  (c) => !c.is_lost && (!c.snoozed_until || c.snoozed_until < nowIso),
);
```
Counts (`prospect/lead/offering`) liczone z `visibleContacts` przez `deriveStage` (bez zmiany pozostałej logiki). `today`/`overdue` bez zmian.

### 2. `EditableSubcategoryBadge.tsx` — generyk

API:
```ts
interface Option { value: string; label: string; className?: string; icon?: ReactNode; }
interface Props {
  value: string | null | undefined;
  options: Option[];
  emptyLabel?: string; // default "(brak)"
  onSelect: (value: string) => void;
  ariaLabel: string;
}
```

Render:
- `Popover` (shadcn). `PopoverTrigger asChild` → `<button onClick={(e) => e.stopPropagation()}>` z `Badge variant="outline"` w środku (Badge jest `<div>`, nie nadaje się jako trigger sam w sobie).
- Trigger label: jeśli `value` ma match → `option.label` + `option.className`. W przeciwnym razie `emptyLabel` z klasą `bg-muted text-muted-foreground border-dashed`.
- Wewnątrz `PopoverContent` (`className="w-44 p-1"`, `onClick={(e) => e.stopPropagation()}`): lista przycisków `<button className="w-full text-left flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-muted">`. Active option ma `<Check className="h-3.5 w-3.5" />`, pozostałe placeholder `<span className="w-3.5" />` żeby zachować alignment.
- Wybór: jeśli `value === current` → tylko `setOpen(false)`. W innym wypadku `onSelect(value)` + `setOpen(false)`.
- `text-[10px]` dla triggera (zgodnie z resztą badges).

### 3. `TemperatureBadge.tsx` — refactor (breaking change props)

Nowe API:
```ts
interface TemperatureBadgeProps {
  value: Temperature | string | null | undefined;
  onChange: (next: Temperature) => void;
}
```

Wewnątrz `OPTIONS: Option[]` (HOT/TOP/COLD/10x z istniejącymi klasami) → render `<EditableSubcategoryBadge ariaLabel="Temperatura" value={value} options={OPTIONS} onSelect={(v) => onChange(v as Temperature)} />`.

### 4. `SourceBadge.tsx` — refactor (breaking change props)

```ts
interface SourceBadgeProps {
  value: ProspectSource | string | null | undefined;
  onChange: (next: ProspectSource) => void;
}
```

`OPTIONS` budowane z `PROSPECT_SOURCE_LABELS` (wszystkie 6) z jednolitym `className: 'bg-sky-500/10 text-sky-700 border-sky-300'`.

### 5. `ClientStatusBadge.tsx` — CREATE

```ts
interface ClientStatusBadgeProps {
  value: ClientStatus | string | null | undefined;
  onChange: (next: 'standard' | 'ambassador') => void;
}
```

`OPTIONS`:
- `standard` → label z `CLIENT_STATUS_LABELS.standard`, `className: 'bg-emerald-500/15 text-emerald-700 border-emerald-300'`
- `ambassador` → label z `CLIENT_STATUS_LABELS.ambassador`, `className: 'bg-amber-500/15 text-amber-700 border-amber-300'`, `icon: <Star className="h-3 w-3 fill-current" />`

`lost` celowo pominięte (obsługiwane przez „Oznacz jako lost"). `emptyLabel="Status"` (gdy `value=null`, choć nowy klient zwykle ma `standard` z konwersji).

### 6. `UnifiedKanbanCard.tsx` — wpięcie

Dodanie propa `onSubcategoryChange: (field: 'temperature' | 'prospect_source' | 'client_status', value: string) => void`.

Header (zamiana 3 obecnych ifów na):
```tsx
{stage === 'lead' && (
  <TemperatureBadge value={contact.temperature} onChange={(v) => onSubcategoryChange('temperature', v)} />
)}
{stage === 'prospect' && (
  <SourceBadge value={contact.prospect_source} onChange={(v) => onSubcategoryChange('prospect_source', v)} />
)}
{stage === 'client' && (
  <ClientStatusBadge value={contact.client_status} onChange={(v) => onSubcategoryChange('client_status', v)} />
)}
```

Usunięcie osobnego `Badge` „Ambasador" (zastąpiony przez `ClientStatusBadge` z ikoną gwiazdki w opcji).

### 7. `UnifiedKanban.tsx` — handler

```tsx
function handleSubcategoryChange(
  c: DealTeamContact,
  field: 'temperature' | 'prospect_source' | 'client_status',
  value: string,
) {
  updateContact.mutate({ id: c.id, teamId, [field]: value });
}
```

W `DroppableColumn.renderCard` / `DraggableCard` przekazać:
```tsx
onSubcategoryChange={(field, value) => handleSubcategoryChange(c, field, value)}
```

(propagacja przez `DroppableColumn` props → `DraggableCard` props → `UnifiedKanbanCard`).

### 8. `useDealsTeamContacts.ts` — sygnatura mutacji

Sprawdzę aktualne pola payloadu w `useUpdateTeamContact`. Jeśli `temperature`/`prospect_source`/`client_status` nie są jeszcze w typie `UpdateTeamContactInput`, dodaję je jako opcjonalne (`Temperature | null`, `ProspectSource | null`, `ClientStatus | null`) i mapuję 1:1 do `update({...})`. Bez `any`.

### Świadome odstępstwa / decyzje

1. **`Badge` jako element wewnątrz `<button>`** zamiast `Badge` jako trigger — bo shadcn `Badge` to `<div>`, a `Radix Popover.Trigger asChild` wymaga interaktywnego elementu z handlerem. Rozwiązanie: `<button type="button" onClick={stopPropagation}><Badge .../></button>`. Wizualnie identyczne, semantycznie poprawne.
2. **`stopPropagation` na trigger I content** — karta ma `onClick={navigate}`, popover nie może go odpalać.
3. **`emptyLabel` z `border-dashed`** — wizualna sygnalizacja „kliknij, żeby ustawić" zgodnie z briefem.
4. **`ClientStatusBadge` bez opcji `lost`** — per brief, lost przez przycisk „Oznacz jako lost" + `LostReasonDialog`.
5. **Usuwam ⭐ Ambasador jako osobny badge** — zastąpiony ikoną w opcji `ambassador` w `ClientStatusBadge`. Jeden source of truth dla statusu klienta.
6. **`SalesHeader` — `visibleContacts` z `deriveStage`** — utrzymuję dotychczasowe użycie `deriveStage` z BLOK B-FIX (counts liczone bezpiecznie, bez polegania na `deal_stage` z cache).
7. **Brak `RadioGroup` shadcn** — używam zwykłych `<button>` z checkmarkiem. `RadioGroup` wymaga form context i jest cięższy; tutaj to lista wyboru jednokrotnego z natychmiastowym commit, nie formularz. Wizualnie spójne, lżejsze.
8. **Breaking change w `TemperatureBadge`/`SourceBadge` props** (dodanie wymaganego `onChange`) — komponenty są używane tylko w `UnifiedKanbanCard`, sprawdzę grep przed implementacją; gdyby były inne callsites, zaadaptuję je w tym samym commicie.

### Weryfikacja po implementacji

```bash
npx tsc --noEmit 2>&1 | tail -10
grep -rn "TemperatureBadge\|SourceBadge\|ClientStatusBadge" src/                         # ujawni wszystkie callsites
grep -n "snoozed_until" src/components/sgu/headers/SalesHeader.tsx                       # ≥1
grep -n "EditableSubcategoryBadge" src/components/sgu/sales/                             # ≥3 (Temperature/Source/ClientStatus)
grep -n "onSubcategoryChange" src/components/sgu/sales/UnifiedKanban*.tsx                # ≥3
```

Oczekiwane: 0 błędów TS, każdy grep zwraca trafienia, `TemperatureBadge`/`SourceBadge` nigdzie poza `UnifiedKanbanCard.tsx` (lub adaptacja innych callsites w tym samym commicie).

### DoD

| Check | Stan po patchu |
|---|---|
| KPI „Leady" w SalesHeader == count kolumny Lead | ✅ (snoozed parity) |
| Karta w Lead bez `temperature` ma klikalny `(brak)` | ✅ |
| Klik w badge otwiera popover, NIE nawiguje | ✅ (stopPropagation) |
| Wybór opcji: mutacja DB + optimistic refetch | ✅ (`updateContact.mutate` + invalidate w hooku) |
| To samo dla Prospekt (6 opcji) i Klient (2 opcje) | ✅ |
| Drag&drop nadal działa | ✅ (popover trigger to button, nie cała karta) |
| `tsc --noEmit` 0 błędów | ✅ |

