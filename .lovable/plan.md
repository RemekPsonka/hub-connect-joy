

# B-FIX.13 — Ujednolicenie elementów karty Kanban (`+ składka` we wszystkich stage'ach)

## Problem
Karty w kolumnach Kanbana mają różny zestaw elementów:
- **Lead / Prospect / Klient**: brak chipa `+ składka` (widać tylko sub-badge HOT/COLD/Standard + ewentualne taski)
- **Ofertowanie**: ma `+ składka` po prawej

User oczekuje spójnego layoutu — **`+ składka` powinno być na każdej karcie**, niezależnie od stage'u.

## Diagnoza
W `UnifiedKanbanCard.tsx` (po B-FIX.11) `<PremiumQuickEdit />` jest renderowane bezwarunkowo w wierszu 2 z `ml-auto`. Skoro mimo to nie pojawia się na Lead/Klient — najpewniejsza przyczyna: chip jest spychany przez `flex-wrap` do drugiej linii i obcinany przez wąską kartę / overflow kolumny, albo render `+ składka` (variant `secondary`, `text-[10px]`) jest tak subtelny że ginie na tle.

Dowód ze screenshota: w Ofertowaniu chip `+ składka` jest **wyraźnie niebieski** (kontrastowy gradient, znacznie większy niż reszta) — to inny rendering niż na Lead. Najpewniej różnica wynika z aktualnego stanu `valueGr`: tam gdzie kontakt **kiedyś miał wartość** (lub Ofertowanie wymusza inny styling), chip jest większy. Na Lead `valueGr === null` → mały szary badge ginie.

## Rozwiązanie
Ujednolicić chip `+ składka` we wszystkich stage'ach + zagwarantować że zawsze jest widoczny i wyrazisty.

### 1. `src/components/sgu/sales/PremiumQuickEdit.tsx`
Dla pustej wartości (`valueGr == null || valueGr === 0`) — zamiast subtelnego `Badge variant="secondary"`:
- Render kontrastowego buttona: ikona `Plus` + tekst „składka"
- Klasy: `h-5 px-2 text-[10px] border border-dashed border-primary/50 text-primary bg-primary/5 hover:bg-primary/10 hover:border-primary rounded-full`
- Zachowanie identyczne (popover edycji)
- Tooltip „Dodaj prognozę składki rocznej"

Dla wartości > 0 — bez zmian (`💰 12k zł` outline).

### 2. `src/components/sgu/sales/UnifiedKanbanCard.tsx`
Zagwarantować widoczność `PremiumQuickEdit` niezależnie od stage'u i szerokości:
- Wrapper wokół chipa: `<div className="ml-auto shrink-0">` (już jest `ml-auto` — dodać `shrink-0` żeby flex-wrap nie spychał chipa do drugiej linii ani go nie obcinał)
- Potwierdzić, że `<PremiumQuickEdit />` jest renderowane **dla każdego stage'u** (nie wewnątrz warunku `stage === 'offering'`) — sprawdzić w pliku, fix jeśli trzeba

### 3. Szybki sanity-check
Zweryfikować w `UnifiedKanban.tsx` (parent), czy do `UnifiedKanbanCard` przekazywany jest pełny obiekt `contact` z polem `expected_annual_premium_gr` — bez tego chip nigdy nie zna wartości.

## Pliki

| # | Plik | Akcja |
|---|---|---|
| 1 | `src/components/sgu/sales/PremiumQuickEdit.tsx` | EDIT — wyrazisty fallback `+ składka` (dashed primary border, ikona Plus, bg subtelny) |
| 2 | `src/components/sgu/sales/UnifiedKanbanCard.tsx` | EDIT — `shrink-0` na wrapperze `PremiumQuickEdit`, potwierdzić unconditional render |
| 3 | `src/components/sgu/sales/UnifiedKanban.tsx` | VERIFY — `expected_annual_premium_gr` w danych kontaktu |

## DoD

| Check | Stan |
|---|---|
| `+ składka` widoczny na kartach Lead, Prospect, Klient, Ofertowanie | ✅ |
| Wyraźny styl (dashed primary, ikona Plus, hover) | ✅ |
| Chip nigdy nie spychany do drugiej linii ani obcinany (`shrink-0`) | ✅ |
| Po wpisaniu wartości — standardowy badge `💰 X zł` | ✅ |
| `npx tsc --noEmit` exit 0 | ✅ |

