

# B-FIX.16 — Komplet placeholderów na karcie (opiekun, składka, banner zadania)

## Diagnoza

Layout kart we wszystkich 4 kolumnach jest identyczny (jeden plik `UnifiedKanbanCard.tsx`), ale **3 elementy mają conditional render i znikają, gdy brak danych**:

| Element | Warunek render | Co user widzi |
|---|---|---|
| `AssigneeAvatars` | `if (!assignees.length) return null` | Puste miejsce po prawej w Lead/Klient |
| Banner overdue | `{taskInfo?.oldestOverdue && ...}` | Brak info o zaległym zadaniu |
| `PremiumQuickEdit` | renderuje placeholder `+ składka` (już OK po B-FIX.13) | **Widoczne** — ale na screenie Artur Czepczyński go nie ma, bo… |

Faktyczne źródło różnic na screenach:

- **Ofertowanie / Wojciech Staniszewski**: ma składkę (`200 000 zł`), ma awatar AO (przypisany opiekun), ma banner overdue → komplet
- **Lead / Artur Czepczyński**: brak składki, brak opiekuna, brak overdue → karta wygląda jak „pusta"
- **Klient / Artur Lewandowski**: brak składki, brak opiekuna → karta wygląda jak „pusta"

User chce, żeby karty **zawsze pokazywały te 3 sloty** — w postaci aktywnych placeholderów do uzupełnienia, nie ukrywały ich.

## Rozwiązanie

### 1. `AssigneeAvatars` — placeholder „dodaj opiekuna"
Plik: `src/components/sgu/sales/AssigneeAvatars.tsx`

- Usunąć `if (!assignees.length) return null`.
- Gdy lista pusta, renderować pojedynczy „pusty" awatar — kółko `h-5 w-5` z ikoną `UserPlus`, dashed border w kolorze primary, klikalne (otwiera `onMoreClick` / dialog zadania, gdzie można przypisać opiekuna).
- Dodać prop `onAddClick?: () => void` i przekazać go z `UnifiedKanbanCard` (reuse `onMoreClick`).
- Tooltip: „Dodaj opiekuna zadania".

### 2. Banner zadania — placeholder „brak aktywnego zadania"
Plik: `src/components/sgu/sales/UnifiedKanbanCard.tsx`

Obecnie banner renderuje się TYLKO dla `oldestOverdue`. Rozszerzyć logikę:

- **Jest overdue** → czerwony banner „X dni temu: <title>" (bez zmian)
- **Jest aktywne zadanie (today/active)** → neutralny banner z tytułem zadania, np. „Dziś: <title>" lub „<data>: <title>" (amber/emerald w zależności od statusu)
- **Brak jakiegokolwiek zadania** → szary, dashed banner placeholder „+ Zaplanuj następne zadanie", klikalny → `onMoreClick`

Wymaga rozszerzenia o pole `nextTask` w `TaskContactInfo` lub użycia istniejących danych z `byType` / `oldestOverdue`. Sprawdzę `useActiveTaskContacts` przed implementacją; jeśli nie ma, dodam minimalny selektor „pierwsze otwarte zadanie".

### 3. Składka — pozostawić bez zmian
`PremiumQuickEdit` już renderuje placeholder `+ składka` (B-FIX.13). Na screenie Artura Czepczyńskiego go nie widać — ale to jest kwestia tego, że karta jest zwinięta w sekcji „Lead" pokazanej powyżej (może być przesłonięta). **Zweryfikować po deployu** — jeśli faktycznie nadal nie ma, dopiero wtedy wracamy do tematu.

### 4. Spójna kolejność i wygląd elementów we wszystkich kolumnach
Plik: `src/components/sgu/sales/UnifiedKanbanCard.tsx`

Po zmianach wszystkie 4 stage'e mają **dokładnie ten sam szkielet** ze stałymi slotami:

```text
[Wiersz 1]  Imię nazwisko                          [opiekun lub +]
            firma · stanowisko
[Wiersz 2]  TaskPill + StageBadge       [składka lub +]
[Wiersz 3]  ComplexityChips (opt.)
[Wiersz 4]  Banner zadania (zawsze widoczny)
[Wiersz 5]  …                                                  ×
```

Żaden z 3 placeholder-slotów nigdy nie znika.

## Pliki

| # | Plik | Akcja |
|---|---|---|
| 1 | `src/components/sgu/sales/AssigneeAvatars.tsx` | EDIT — placeholder „+" gdy brak opiekuna; nowy prop `onAddClick` |
| 2 | `src/components/sgu/sales/UnifiedKanbanCard.tsx` | EDIT — przekazać `onMoreClick` do `AssigneeAvatars`; rozszerzyć banner o stany `next` i `none` (placeholder) |
| 3 | `src/hooks/useActiveTaskContacts.ts` | VERIFY/EDIT — upewnić się, że `TaskContactInfo` udostępnia info o najbliższym aktywnym zadaniu (title, status, date); jeśli nie — dodać minimalne pole `nextTask` |

## DoD

| Check | Stan |
|---|---|
| W każdej kolumnie (Lead/Prospect/Klient/Ofertowanie) karta ma awatar opiekuna LUB klikalny placeholder „+" | ✅ |
| W każdej kolumnie karta ma `+ składka` lub badge ze składką | ✅ |
| W każdej kolumnie karta ma banner zadania: overdue (czerwony) / next (amber/emerald) / placeholder „+ Zaplanuj zadanie" (szary, dashed) | ✅ |
| Placeholder opiekuna i banner placeholder otwierają `onMoreClick` (panel zadań) | ✅ |
| Karta Ofertowanie wygląda bez regresji (wszystkie istniejące dane wyświetlają się tak samo) | ✅ |
| `tsc --noEmit` exit 0 | ✅ |

