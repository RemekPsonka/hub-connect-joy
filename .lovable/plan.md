## Cel
Dodać przycisk „10x" (ikona płomienia) do siatki akcji w `ContactActionButtons.tsx`, aby umożliwić aktywne przeniesienie kontaktu do kategorii `10x` bez używania mechanizmu odkładania (snooze). Naprawić również `isActive` dla „Odłóż", aby świeciło się tylko dla faktycznie odłożonych kontaktów (a nie dla całej kategorii `10x`).

## Zakres
Zmieniany jest **tylko jeden plik**:
- `src/components/deals-team/ContactActionButtons.tsx`

## Zmiany techniczne

1. **Import ikony** (linie 4–7): dodać `Flame` do importów z `lucide-react`.

2. **Typ `ActionType`** (linie 24–34): dodać wariant `'ten_x'` przed `'snooze'`.

3. **Tablica `ACTIONS`** (linie 45–64):
   - Dodać nowy wpis `ten_x` przed `snooze`:
     ```ts
     { value: 'ten_x', label: '10x', icon: Flame, needsDate: false,
       isActive: (c) => c.category === '10x' && !c.snoozed_until },
     ```
   - Zmienić `isActive` dla `snooze` na:
     ```ts
     isActive: (c) => !!c.snoozed_until && new Date(c.snoozed_until) > new Date()
     ```

4. **`handleClick`** (linie 97–113): dodać gałąź dla `ten_x` przed gałęzią `lost`:
   ```ts
   if (action.value === 'ten_x') {
     updateContact.mutate(
       { id: contact.id, teamId, category: '10x' as DealCategory },
       { onSuccess: () => toast.success('Przeniesiono do 10x') }
     );
     return;
   }
   ```

## Czego NIE ruszamy
- `handleConfirm` (switch) — `ten_x` nie potrzebuje daty.
- `SnoozeDialog`/`onSnooze` — semantyka odkładania bez zmian.
- Gałąź `lost` — bez zmian.
- Grid pozostaje `grid-cols-3` (11 przycisków = 4 rzędy, ostatni niepełny).

## Known limitation (do osobnego ticketu)
Kliknięcie „10x" na kontakcie odłożonym ustawi `category='10x'`, ale `snoozed_until` zostanie nietknięty. Czyszczenie `snoozed_until` przy ręcznym przeniesieniu do 10x = osobny ticket.

## QA po wdrożeniu
- `tsc` i `eslint` clean.
- Smoke test w `ContactTasksSheet`: kliknięcie „10x" → toast „Przeniesiono do 10x", podświetlenie „10x", brak podświetlenia „Odłóż".
- Po „Odłóż" z datą: podświetla się „Odłóż", „10x" gaśnie.