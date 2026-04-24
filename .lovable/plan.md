## Diagnoza

Kontakt **Gerard Wawrzak** został poprawnie zaktualizowany w bazie:
- `category = '10x'` ✅
- `deal_stage = 'lead'` ✅
- `temperature = NULL` ❌ ← tu jest problem
- `snoozed_until = NULL`, `status = 'active'`, `team_id = 9842c3d4…`

Czyli rekord żyje, jest w lejku LEAD. Ale w `UnifiedKanban` (kolumna LEAD) podgrupowanie kart idzie po polu **`temperature`**, nie po `category` (`SUBGROUP_CONFIG.lead.getter = (c) => c.temperature`, kolejność `['hot', 'top', '10x', 'cold']`). Skoro `temperature=NULL`, kontakt trafia do podsekcji „bez temperatury" (`__none__`), a nie do oczekiwanej sekcji „🔄 10x" — stąd wrażenie, że „nigdzie go nie ma".

To samo zaniedbanie ma `WeeklyStatusForm` (linia 256: ustawia tylko `category`), ale tam to pojedyncze miejsce. Dla naszego nowego, dedykowanego przycisku „10x" semantyka jest jasna: użytkownik mówi „to jest aktywny lead 10x" → ustawiamy też temperaturę.

## Fix (1 plik)

**`src/components/deals-team/ContactActionButtons.tsx`** — w gałęzi `handleClick` dla `ten_x` ustawić również `temperature: '10x'`:

```ts
if (action.value === 'ten_x') {
  updateContact.mutate(
    { id: contact.id, teamId, category: '10x' as DealCategory, temperature: '10x' as Temperature },
    { onSuccess: () => toast.success('Przeniesiono do 10x') }
  );
  return;
}
```

Dodać import `Temperature` z `@/types/dealTeam` (obok istniejących `DealCategory`, `OfferingStage`).

`isActive` dla przycisku „10x" rozszerzyć, by łapał też kontakty oznaczone w starym stylu (sam `temperature='10x'`) lub nowym (`category='10x'`):

```ts
{ value: 'ten_x', label: '10x', icon: Flame, needsDate: false,
  isActive: (c) => (c.category === '10x' || c.temperature === '10x') && !c.snoozed_until },
```

## Pre-flight

- `Temperature` w `src/types/dealTeam.ts` zawiera `'10x'` ✅ (linia 12)
- `useUpdateTeamContact` przyjmuje `temperature` jako pole — sprawdzę szybko przed edycją; jeśli nie przyjmuje, dorzucam mapowanie analogicznie do `category`.

## Naprawa istniejącego rekordu (Wawrzak)

Po wgraniu fixa wystarczy raz kliknąć ponownie „10x" na karcie Wawrzaka, żeby uzupełnić `temperature='10x'` i pokazał się we właściwej sekcji. Alternatywnie mogę puścić jednorazową aktualizację SQL na wszystkie kontakty z `category='10x' AND temperature IS NULL` (zazwyczaj 1–kilka rekordów) — powiedz, czy chcesz.

## Czego NIE ruszamy

- Logiki Kanbana (subgrupowanie po `temperature` zostaje — to jest świadoma decyzja produktowa).
- `WeeklyStatusForm` (osobny ticket, jeśli chcesz, by tygodniowe statusy też ustawiały `temperature`).
- Mechanizmu „Odłóż" / `lost` / `client`.

## Komentarz do warningu w konsoli

`Warning: Function components cannot be given refs … Check the render method of ContactActionButtons` — to ostrzeżenie pochodzi z komponentu `Dialog` osadzonego wewnątrz, prawdopodobnie zwracana przez nas wartość `<>{…}</>` ląduje gdzieś, gdzie rodzic forwarduje ref. To pre-existing, niezwiązany z brakiem widoczności kontaktu i nie blokuje. Mogę zająć się osobno (owinąć całość w `forwardRef` lub `<div>` z ref-forwardem), jeśli chcesz.