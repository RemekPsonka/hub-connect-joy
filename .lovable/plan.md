

# B-FIX.14 — `+ składka` zawsze w pierwszej linii karty (Lead/Prospect/Klient)

## Diagnoza

Po B-FIX.13 `<PremiumQuickEdit>` jest renderowane bezwarunkowo z `ml-auto shrink-0` w wierszu 2 karty. Mimo to **na kartach Lead/Klient nie jest widoczne** — bo:

1. Wiersz 2 to `flex flex-wrap items-center gap-1` z `ml-auto` na `+ składka`.
2. W wąskich kartach Lead (kolumny `md:grid-cols-2` przy viewport 1274px) zawartość pierwszej linii (`TaskStatusPill` `+ Dodaj` + `TemperatureBadge` `(brak)` + `ComplexityChips`) wypełnia całą szerokość.
3. Z `flex-wrap` chip `+ składka` przeskakuje do **drugiej linii**, gdzie z powodu `ml-auto` ląduje przy prawej krawędzi — która w wąskich kolumnach jest obcinana przez overflow lub po prostu znika z pola widzenia użytkownika (nie spodziewa się go w drugiej linii).
4. W kolumnie Ofertowanie kart jest mniej elementów (brak ComplexityChips dla pustego stanu), więc `+ składka` mieści się w pierwszej linii i jest widoczne.

## Rozwiązanie

Wymusić, żeby `+ składka` **zawsze była w pierwszej linii**, nawet na wąskich kartach. Trzy zmiany kosmetyczne w `UnifiedKanbanCard.tsx`:

### 1. Wydzielić wiersz 2 na dwa pod-rzędy w jednym `flex` (bez wrap)
Zamiast jednego `flex-wrap` z całą zawartością, podzielić wiersz 2 na **dwie sekcje w `flex` bez wrap**:
- **Lewa sekcja** (`flex-1 min-w-0 flex items-center gap-1 flex-wrap overflow-hidden`): `TaskStatusPill` + sub-badge (Temperature/Source/Client/Stage) + `ComplexityChips`. Te elementy mogą się zawijać wewnątrz lewej sekcji.
- **Prawa sekcja** (`shrink-0`): `PremiumQuickEdit`. Zawsze w prawym górnym rogu wiersza 2, niezależnie od liczby chipów po lewej.

```tsx
<div className="flex items-start gap-2" onClick={(e) => e.stopPropagation()}>
  <div className="flex-1 min-w-0 flex items-center gap-1 flex-wrap">
    <TaskStatusPill ... />
    {stage === 'lead' && <TemperatureBadge ... />}
    {/* ... pozostałe sub-badge ... */}
    <ComplexityChips ... />
  </div>
  <div className="shrink-0">
    <PremiumQuickEdit ... />
  </div>
</div>
```

→ `PremiumQuickEdit` jest fizycznie poza kontenerem flex-wrap — nigdy nie spada do drugiej linii.

### 2. Skrócenie chipa `+ składka` (oszczędność szerokości)
W `PremiumQuickEdit.tsx` w wariancie pustym: zostawić ikonę `Plus` + krótki tekst „składka" (już jest), upewnić się że `whitespace-nowrap` zapobiega łamaniu tekstu wewnątrz chipa.

### 3. (Opcjonalnie) Przy bardzo wąskich kartach (xs)
Jeśli karta jest naprawdę wąska, `flex-1` lewej sekcji + `shrink-0` prawej dadzą priorytet `+ składka`. Lewa sekcja zawinie chipy w wiele linii — ale to lepsze niż utrata `+ składka`.

## Pliki

| # | Plik | Akcja |
|---|---|---|
| 1 | `src/components/sgu/sales/UnifiedKanbanCard.tsx` | EDIT — wiersz 2 podzielić na lewą sekcję (flex-wrap z chipami) i prawą sekcję (`PremiumQuickEdit` shrink-0) w `flex items-start gap-2` |
| 2 | `src/components/sgu/sales/PremiumQuickEdit.tsx` | EDIT (drobny) — `whitespace-nowrap` na fallbacku `+ składka` |

## DoD

| Check | Stan |
|---|---|
| `+ składka` widoczne w prawym górnym rogu drugiego wiersza karty Lead | ✅ |
| To samo w Prospect i Klient | ✅ |
| Ofertowanie bez regresji (chip nadal po prawej) | ✅ |
| Drag & drop + popover edycji + wszystkie taski-chipy działają | ✅ |
| `npx tsc --noEmit` exit 0 | ✅ |

