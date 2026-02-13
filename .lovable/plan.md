
# Znacznik aktywnego zadania na kartach Kanban

## Co zostanie dodane
Ikona ptaszka na kartach kontaktow w Kanbanie:
- **Zielony** - kontakt ma aktywne zadanie (status `todo` lub `in_progress`), termin w przyszlosci lub bez terminu
- **Czerwony** - kontakt ma aktywne zadanie, ktore jest przeterminowane (`due_date < dzisiaj`)
- Brak ikony - kontakt nie ma zadnych aktywnych zadan

## Zmiany techniczne

### 1. Nowy hook: `src/hooks/useActiveTaskContacts.ts`
Jedno zapytanie do tabeli `tasks` pobierajace `deal_team_contact_id`, `status` i `due_date` dla aktywnych zadan w danym zespole. Zwraca mape: contact_id -> stan (`'active'` lub `'overdue'`).

- Cache: `staleTime: 10 * 60 * 1000` (10 minut)
- Odswiezenie przy kazdym wejsciu na strone (domyslne zachowanie React Query - `refetchOnMount: true`)

### 2. `src/components/deals-team/KanbanBoard.tsx`
- Import i uzycie nowego hooka
- Przekazanie prop `taskStatus` do kart (`'active'` | `'overdue'` | `undefined`)

### 3. Karty kontaktow (4 pliki)
Dodanie prop `taskStatus?: 'active' | 'overdue'` i ikony `CheckCircle2` z lucide-react:
- `taskStatus === 'active'` -> zielona ikona
- `taskStatus === 'overdue'` -> czerwona ikona
- brak -> brak ikony

Pliki: `HotLeadCard.tsx`, `TopLeadCard.tsx`, `LeadCard.tsx`, `ColdLeadCard.tsx`

Ikona pojawi sie przed kropka statusu (po prawej stronie karty).
