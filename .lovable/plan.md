
# Wyrazne oddzielenie blokow + zmiana "Usun projekt" na "Usun z bloku / Przenies"

## 1. Wizualne oddzielenie blokow

W `WorkspaceDayDashboard.tsx` -- dodanie separatora miedzy blokami:
- Zmiana `space-y-4` na `space-y-6`
- Dodanie `<Separator />` (lub `<div className="border-t border-border/60" />`) miedzy kazdy `WorkspaceTimeBlock`

W `WorkspaceTimeBlock.tsx` -- wzmocnienie obramowania wypelnionego bloku:
- Zmiana `border-border/40` na `border-border` (pelna widocznosc)
- Dodanie lewego kolorowego paska (`border-l-4`) w kolorze projektu dla szybkiej identyfikacji
- Lekkie tlo bloku (`bg-card/50`) zeby odroznic od pustych slotow

## 2. Zmiana menu akcji -- zamiast "Usun projekt"

Obecne menu (DropdownMenu) ma opcje: Zmien nazwe, Ustaw termin, **Usun projekt**.

Nowe menu:
- Zmien nazwe (bez zmian)
- Ustaw termin (bez zmian)
- **Separator**
- **Przenies do bloku** -- submenu z dwoma pozostalymi blokami (np. jesli projekt jest w 8-12, to opcje "12:00-16:00" i "16:00-20:00"). Klikniecie przenosi projekt: usuwa stary wpis i tworzy nowy w wybranym bloku.
- **Usun z bloku** -- odpina projekt z tego bloku (nie kasuje projektu, tylko wpis w `workspace_schedule`). Zastepuje obecny przycisk "X" i obecna opcje "Usun projekt".

Przycisk "X" w naglowku pozostaje jako szybki skrot do "Usun z bloku" (odpina, nie kasuje projektu).

## 3. Zmiany w plikach

### `src/components/workspace/WorkspaceDayDashboard.tsx`
- Dodanie separatorow miedzy blokami (np. `Separator` z shadcn lub `<hr>`)
- Wiekszy spacing

### `src/components/workspace/WorkspaceTimeBlock.tsx`
- **Styl bloku**: dodanie `border-l-4` z kolorem projektu + `bg-card/50`
- **DropdownMenu**: zamiana "Usun projekt" na:
  - "Przenies do bloku" z sub-items (filtrowane -- bez aktualnego bloku)
  - "Usun z bloku" -- wywoluje `remove.mutate()` (jak obecny "X")
- **Logika przenoszenia**: `handleMoveToBlock(targetBlock)` -- wywoluje `remove` dla starego bloku, potem `assign` dla nowego
- Usuniecie `useDeleteProject` i `handleDeleteProject` -- projekty nie sa kasowane z workspace

### Props
Komponent `WorkspaceTimeBlock` potrzebuje wiedzy o zajetych blokach, zeby w submenu "Przenies do" pokazac tylko wolne sloty. Dodanie propa `occupiedBlocks: number[]` z `WorkspaceDayDashboard`.

## 4. Szczegoly techniczne

Stale blokow do przenoszenia:
```text
TIME_BLOCKS = [
  { id: 0, label: '8:00 - 12:00' },
  { id: 1, label: '12:00 - 16:00' },
  { id: 2, label: '16:00 - 20:00' },
]
// Filtrowanie: availableBlocks = TIME_BLOCKS.filter(b => b.id !== currentBlock && !occupiedBlocks.includes(b.id))
```

Przenoszenie (sekwencyjne mutacje):
```text
handleMoveToBlock = async (targetBlock) => {
  await remove.mutateAsync({ dayOfWeek, timeBlock: currentBlock });
  await assign.mutateAsync({ dayOfWeek, projectId: project.id, timeBlock: targetBlock });
}
```
