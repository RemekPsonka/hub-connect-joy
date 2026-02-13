
# Konfiguracja widocznych kolumn w Kanban

## Cel

Dodanie popovera z checkboxami umozliwiajacego wybor widocznych kolumn w widoku Kanban (HOT, Ofertowanie, TOP, LEAD, 10x, COLD, Przegrane, Poszukiwani). Ustawienia zapisywane w localStorage.

## Rozwiazanie

Wzorzec identyczny jak `ColumnConfigPopover` w kontaktach -- przycisk z ikona Settings2, popover z checkboxami.

## Szczegoly techniczne

### 1. Nowy hook: `src/hooks/useKanbanColumnSettings.ts`

- Interfejs `KanbanColumnVisibility` z 8 kluczami: `hot`, `offering`, `top`, `lead`, `tenx`, `cold`, `lost`, `prospecting` -- kazdy boolean, domyslnie true
- Zapis/odczyt z `localStorage` pod kluczem `kanban-column-visibility`
- Zwraca `{ columns, toggleColumn }` analogicznie do `useContactsTableSettings`

### 2. Nowy komponent: `src/components/deals-team/KanbanColumnConfigPopover.tsx`

- Popover z checkboxami dla kazdej kolumny (etykiety: HOT LEAD, OFERTOWANIE, TOP LEAD, LEAD, 10x, COLD LEAD, PRZEGRANE, POSZUKIWANI)
- Wzorzec 1:1 z `ColumnConfigPopover` z kontaktow
- Przycisk "Kolumny" z ikona Settings2

### 3. Zmiana: `src/components/deals-team/KanbanBoard.tsx`

- Import i uzycie hooka `useKanbanColumnSettings`
- Dodanie `KanbanColumnConfigPopover` obok paska wyszukiwania (po prawej stronie)
- Warunkowe renderowanie kazdej kolumny KanbanColumn na podstawie `columns.hot`, `columns.top` itd.
- Dynamiczne dostosowanie gridu: `lg:grid-cols-{N}` gdzie N = liczba widocznych kolumn

### 4. Zmiana: `src/components/deals-team/index.ts`

- Export `KanbanColumnConfigPopover`

### Zmieniane pliki

| Plik | Zmiana |
|------|--------|
| `src/hooks/useKanbanColumnSettings.ts` | NOWY -- hook z localStorage |
| `src/components/deals-team/KanbanColumnConfigPopover.tsx` | NOWY -- popover z checkboxami |
| `src/components/deals-team/KanbanBoard.tsx` | Filtrowanie kolumn + przycisk konfiguracji |
| `src/components/deals-team/index.ts` | Export nowego komponentu |
