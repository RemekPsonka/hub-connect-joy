
# Edycja danych projektu z poziomu Workspace

## Cel
Dodanie mozliwosci edycji nazwy projektu, ustawienia/usuniecia terminu (due_date) oraz usuniecia projektu bezposrednio z naglowka bloku czasowego w workspace -- bez opuszczania ekranu.

## Zmiany

### `src/components/workspace/WorkspaceTimeBlock.tsx`

**1. Rozszerzenie interfejsu Project:**
Dodanie pol `start_date` i `due_date` do lokalnego interfejsu `Project`, zeby moc je wyswietlac i edytowac.

**2. Dodanie menu akcji w naglowku bloku:**
Obok przyciskow "Otworz" i "X" pojawi sie przycisk z ikona `MoreVertical` (lub `Pencil`) otwierajacy `DropdownMenu` z opcjami:
- **Zmien nazwe** -- otwiera inline input lub maly dialog z polem tekstowym
- **Ustaw termin** -- otwiera popover z date pickerem (react-day-picker) do ustawienia `due_date`
- **Usun termin** -- widoczne tylko gdy `due_date` jest ustawione, czysci pole
- **Usun projekt** -- zmienia status projektu na `cancelled` (tak jak istniejacy `useDeleteProject`)

**3. Inline edycja nazwy:**
Po wybraniu "Zmien nazwe" nazwa projektu w naglowku zmienia sie w pole `Input`. Enter lub blur zapisuje, Escape anuluje. Zapis przez `useUpdateProject` z `useProjects.ts`.

**4. Edycja terminu:**
Popover z komponentem `Calendar` (react-day-picker). Wybranie daty zapisuje `due_date` przez `useUpdateProject`. Przycisk "Bez terminu" czysci wartosc.

**5. Wyswietlanie terminu:**
Jesli `due_date` jest ustawione, wyswietla sie obok statusu jako maly badge z ikona `CalendarDays`.

**6. Usuwanie projektu:**
Po kliknieciu "Usun projekt" pojawia sie `AlertDialog` z potwierdzeniem. Po zatwierdzeniu wywoluje `useDeleteProject` i automatycznie odpina projekt z workspace (usuwajac wpis z `workspace_schedule`).

### Importy
- `useUpdateProject`, `useDeleteProject` z `@/hooks/useProjects`
- `DropdownMenu` + skladowe z `@/components/ui/dropdown-menu`
- `AlertDialog` + skladowe z `@/components/ui/alert-dialog`
- `Popover` + `Calendar` do date pickera
- `Input` z `@/components/ui/input`
- Ikony: `MoreVertical`, `Pencil`, `CalendarDays`, `Trash2`

### Przeplyw uzytkownika
1. Klika ikone "..." w naglowku bloku czasowego
2. Wybiera akcje z menu (zmiana nazwy / termin / usuniecie)
3. Edycja odbywa sie w miejscu -- bez nawigacji, bez opuszczania workspace
4. Po zapisie dane odswiezaja sie automatycznie dzieki invalidacji query `['projects']` i `['project', id]`
