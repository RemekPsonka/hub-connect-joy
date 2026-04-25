# Fix: Dialog składek K4/K2 znika natychmiast po otwarciu

## Diagnoza

Po kliknięciu K4 w `MilestoneActionStrip.stamp()` dzieje się:
1. UPDATE `deal_team_contacts` → `category='client'`, `offering_stage='won'`
2. `qc.invalidateQueries(['odprawa-agenda'])` + `['deal_team_contact_for_agenda']`
3. `setPremiumDialog('k4')` — dialog próbuje się otworzyć

Ale invalidate powoduje refetch agendy. Kontakt ze zmienionym `category='client'` najpewniej **wypada z listy agendy** (agenda pokazuje prospects/leads) → `selectedAgendaRow` przestaje matchować dane → `MilestoneActionStrip` zostaje **odmontowany**, a wraz z nim local state `premiumDialog`.

Dialog pojawia się przez ~100ms i znika razem z parent komponentem. Toast „Zaznaczono: Klient" zostaje, bo sonner jest globalny.

To samo zagrożenie istnieje dla K2 (handshake → category='lead'), ale tam zmiana kategorii nie powoduje wypadnięcia z agendy więc działa.

Bonus: warning `Function components cannot be given refs` z `WonPremiumBreakdownDialog` → kosmetyczny, nie powiązany z bugiem (DialogFooter forwarduje ref do dziecka, gubi się gdy children to fragment/array).

## Rozwiązanie

Podnieść stan dialogów składek z `MilestoneActionStrip` do **`SGUOdprawa.tsx`** (parent stable across invalidations). Dialog renderowany na poziomie strony, nie odmontowuje się przy refetch agendy.

### Zmiany

**`src/pages/sgu/SGUOdprawa.tsx`**
- Dodać state `premiumDialogState: { kind: 'k2'|'k4'; contactId; teamId; clientName; currentExpectedPremiumGr; currentPotentials } | null`
- Renderować `<EstimatedPremiumDialog>` i `<WonPremiumBreakdownDialog>` na poziomie strony, sterowane tym state
- Przekazać callback `onMilestonePremium(kind, ctx)` do `MilestoneActionStrip`

**`src/components/sgu/odprawa/MilestoneActionStrip.tsx`**
- Usunąć local `premiumDialog` state oraz oba `<*Dialog>`-i
- Po sukcesie K2/K4 wywołać `props.onMilestonePremium('k2'|'k4', { contactId, teamId, clientName, currentExpectedPremiumGr, currentPotentials })`
- Komponent przestaje znać dialogi — czysty press button

**`src/components/sgu/odprawa/WonPremiumBreakdownDialog.tsx`** (kosmetyka)
- Usunąć ostrzeżenie ref: użyć stabilnej referencji `current` przez `useMemo` w parent **lub** zmienić zależność `useEffect` na klucz primitives `[open, current?.property, current?.financial, current?.communication, current?.life_group]`. Drugie podejście prostsze, nie wymaga zmian w innych plikach.
- Warning o ref pochodzi z DialogFooter → znikanie to inny bug; sam warning jest niegroźny ale wyeliminujemy go zostawiając standardowy układ Buttonów (już jest OK — warning prawdopodobnie ucichnie po fixie unmount, bo nie zdąży sie wyrenderować dwa razy w trakcie odmontowania).

### Pliki

- `src/pages/sgu/SGUOdprawa.tsx` — edit
- `src/components/sgu/odprawa/MilestoneActionStrip.tsx` — edit (slim down)
- `src/components/sgu/odprawa/WonPremiumBreakdownDialog.tsx` — edit (stable deps in useEffect)

## Test plan

1. /sgu/odprawa → wybierz prospect → K1→K2→K3→K4 sekwencyjnie
2. Po K2: dialog estymowanej składki pozostaje otwarty, można wpisać kwotę i zapisać/pominąć
3. Po K4: dialog 4 obszarów pozostaje otwarty mimo że kontakt wypada z agendy (przeszedł na `client`)
4. Anuluj/Pomiń → dialog się zamyka, milestone już zapisany w DB
5. Brak warningów w konsoli o `forwardRef`
