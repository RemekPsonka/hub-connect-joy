
# B-FIX.15 — Wszystkie 4 kolumny mają identyczny układ kart jak „Ofertowanie”

## Problem
Na screenie widać, że:
- karty w `Lead` nadal wizualnie „wystają” i rozpychają kolumnę,
- długie nazwy firmy / stanowiska wchodzą optycznie w sąsiednią kolumnę,
- badge’y (`+ składka`, zadania, opiekun) nie mają stałych pozycji i potrafią znikać,
- `Ofertowanie` wygląda najlepiej, bo ma najbardziej stabilny układ.

Cel: **wszystkie 4 kolumny muszą mieć dokładnie ten sam layout, szerokość i rytm karty co `Ofertowanie`**. Różnić mają się tylko dane.

## Zmiana

### 1. Ustabilizować szerokość całej siatki i kolumn
Plik: `src/components/sgu/sales/UnifiedKanban.tsx`

- Utrzymać `min-w-0` na wrapperach kolumn i kart.
- Dodać `minmax(0, 1fr)`-style behavior przez klasy Tailwind na grid itemach i scroll area, tak by żadna kolumna nie rozszerzała się od treści.
- Dopilnować, żeby wnętrze kolumny miało `overflow-hidden`, a karty nie mogły fizycznie wyjść poza szerokość kontenera.

Efekt:
- wszystkie 4 kolumny mają tę samą szerokość,
- żadna karta nie rozpycha kolumny przez długi tekst lub chipy.

### 2. Przebudować kartę na stały, identyczny szkielet
Plik: `src/components/sgu/sales/UnifiedKanbanCard.tsx`

Zamiast obecnego „luźnego” układu z `space-y` i jednym rzędem `flex-wrap`, karta dostaje stały szablon:

```text
[ WIERSZ 1 ]  Imię i nazwisko                awatary/opiekun
             Firma · stanowisko (1 linia)

[ WIERSZ 2 ]  lewa strefa chipów             prawa strefa składki
             (taski + stage badge)

[ WIERSZ 3 ]  banner overdue (opcjonalnie)

[ WIERSZ 4 ]  więcej                         lost
```

#### Wiersz 1
- Tytuł i subinfo zostają po lewej, ale:
  - `fullName` ma `truncate`,
  - firma + stanowisko mają `truncate`, `min-w-0`, bez możliwości rozpychania.
- Awatary pozostają po prawej jako `shrink-0`.

#### Wiersz 2 — kluczowy fix
Podział na **2 sztywne strefy**:
- **lewa strefa**: tylko `TaskStatusPill` + sub-badge stage’u,
- **prawa strefa**: tylko `PremiumQuickEdit`.

To ma wyglądać tak samo w każdej kolumnie:
- Prospect: `TaskStatusPill + SourceBadge | + składka`
- Lead: `TaskStatusPill + TemperatureBadge | + składka`
- Ofertowanie: `TaskStatusPill + StageBadge | + składka`
- Klient: `TaskStatusPill + ClientStatusBadge | + składka`

Bez dokładania dodatkowych chipów do tego samego rzędu.

### 3. Przenieść `ComplexityChips` do osobnego, dolnego mikro-rzędu
Plik: `src/components/sgu/sales/UnifiedKanbanCard.tsx`

To właśnie one dziś rozwalają rytm Lead/Client, bo zajmują za dużo poziomego miejsca.

Zmiana:
- `ComplexityChips` nie siedzą już obok tasków i składki,
- renderują się **pod wierszem 2**, jako osobny, opcjonalny rząd z `flex-wrap`,
- tylko jeśli faktycznie są aktywne.

Efekt:
- górna część karty pozostaje identyczna jak w `Ofertowanie`,
- dodatkowe dane nie wpływają na widoczność `+ składka`.

### 4. Skrócić i ujednolicić szerokości chipów
Pliki:
- `src/components/sgu/sales/PremiumQuickEdit.tsx`
- `src/components/sgu/sales/TaskStatusPill.tsx`
- `src/components/sgu/sales/EditableSubcategoryBadge.tsx`
- opcjonalnie `src/components/sgu/sales/StageBadge.tsx`

#### `PremiumQuickEdit`
- dodać `max-w-full shrink-0 whitespace-nowrap`,
- dla pustej wartości utrzymać krótki label `składka`,
- dla wartości liczbowej dodać bezpieczne obcięcie / bardziej kompaktowe formatowanie, jeśli badge robi się zbyt szeroki.

#### `TaskStatusPill`
- zachować mini-pille per typ,
- dodać `shrink-0` do pojedynczych pilli,
- nie pozwolić im rozciągać całego rzędu.

#### `EditableSubcategoryBadge` i `StageBadge`
- dodać `whitespace-nowrap`,
- zachować jedną linię,
- ograniczyć agresywny padding, żeby badge w Lead był tak samo kompaktowy jak `Handshake` w Ofertowaniu.

### 5. Przyciąć teksty w karcie dokładnie do szerokości kolumny
Plik: `src/components/sgu/sales/UnifiedKanbanCard.tsx`

Dla pól tekstowych:
- `fullName` → `truncate`
- `company/position` → `truncate`
- kontenery tekstowe → `min-w-0`
- wszystkie rzędy z treścią tekstową mają działać w obrębie szerokości karty, nie poza nią

Jeśli potrzeba:
- na subinfo dodać `title={...}` dla pełnego tekstu w hover, ale wizualnie w karcie ma być 1 linia.

### 6. Ujednolicić pionowy rytm kart między kolumnami
Plik: `src/components/sgu/sales/UnifiedKanbanCard.tsx`

- jednakowa wysokość paddingów i gapów dla wszystkich kart,
- footer bez zmian funkcjonalnych, ale z identycznym pozycjonowaniem,
- banner overdue ma pełną szerokość karty i nie wpływa na szerokość innych elementów.

Efekt:
- karta w `Lead` ma wyglądać jak karta w `Ofertowanie`,
- różni się tylko badge’em stage’u i danymi.

## Pliki

| # | Plik | Akcja |
|---|---|---|
| 1 | `src/components/sgu/sales/UnifiedKanban.tsx` | EDIT — dopiąć sztywną szerokość kolumn/grid itemów i `overflow-hidden` |
| 2 | `src/components/sgu/sales/UnifiedKanbanCard.tsx` | EDIT — przebudować kartę na stały układ: header, rząd chipów, osobny rząd complexity, banner, footer |
| 3 | `src/components/sgu/sales/PremiumQuickEdit.tsx` | EDIT — zagwarantować stałą widoczność i kompaktową szerokość badge’a składki |
| 4 | `src/components/sgu/sales/TaskStatusPill.tsx` | EDIT — dopiąć kompaktowe zachowanie i brak rozpychania rzędu |
| 5 | `src/components/sgu/sales/EditableSubcategoryBadge.tsx` | EDIT — `whitespace-nowrap`, bardziej zwarty trigger |
| 6 | `src/components/sgu/sales/StageBadge.tsx` | EDIT — wyrównać kompaktowy badge do tego samego rytmu co pozostałe kolumny |

## DoD

| Check | Stan |
|---|---|
| Wszystkie 4 kolumny mają identyczny layout kart | ✅ |
| `Lead` nie wystaje poza swoją kolumnę | ✅ |
| Długie teksty są obcinane wewnątrz karty, nie wchodzą w sąsiednią kolumnę | ✅ |
| `+ składka` jest zawsze widoczne w każdej kolumnie | ✅ |
| Badge zadań / stage / opiekun mają stałe pozycje | ✅ |
| `ComplexityChips` nie psują górnego układu karty | ✅ |
| `Ofertowanie` nie traci obecnego, poprawnego wyglądu | ✅ |
| `tsc --noEmit` exit 0 | ✅ |
