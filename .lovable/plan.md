
# Dodanie filtra osoby odpowiedzialnej do widoku Kanban

## Cel
Dodac filtr "kto zajmuje sie kontaktem" na widoku Kanban (glowny i sub-kanban). Kontakt jest "przypisany" do osoby przez pole `assigned_to` na jego aktywnym zadaniu. Kontakty bez zadania sa "wspolne" (widoczne dla wszystkich).

## Podejscie

### 1. Rozszerzenie hooka `useActiveTaskContacts`
Obecny hook zwraca `Map<contactId, TaskStatus>`. Trzeba rozszerzyc go o `assigned_to`, zeby wiedziec KTO jest przypisany do kontaktu.

**Plik:** `src/hooks/useActiveTaskContacts.ts`
- Dodac `assigned_to` do selecta: `.select('deal_team_contact_id, status, due_date, assigned_to')`
- Zmienic typ zwracany z `Map<string, TaskStatus>` na `Map<string, { status: TaskStatus; assignedTo: string | null }>`
- Karty kanban (HotLeadCard, TopLeadCard itp.) beda mialy dostep do informacji o osobie

### 2. Dodanie paska filtra czlonkow do KanbanBoard
Wzorowany na istniejacym pasku w `MyTeamTasksView` (linie 362-374): przyciski "Wszyscy", "Moje" + przycisk dla kazdego czlonka zespolu + "Nieprzypisane".

**Plik:** `src/components/deals-team/KanbanBoard.tsx`
- Nowy state: `filterMember: string` (wartosci: `'all'`, `'mine'`, `'unassigned'`, lub `director_id`)
- Import `useTeamMembers` (juz uzywany w wielu miejscach)
- Dodac pasek przyciskow pod wyszukiwarka (przed kolumnami)
- Filtrowac `filteredContacts` na podstawie `activeTaskMap`:
  - `'all'` -> bez filtra
  - `'mine'` -> kontakty gdzie `assignedTo === currentDirector.id` LUB brak zadania (wspolne)
  - `'unassigned'` -> kontakty bez aktywnego zadania
  - `director_id` -> kontakty gdzie `assignedTo === director_id`

### 3. Propagacja filtra do SubKanbanView
Gdy uzytkownik jest w trybie drill-down (sub-kanban), filtr musi tez dzialac.

**Plik:** `src/components/deals-team/SubKanbanView.tsx`
- Dodac prop `filterMember?: string` i `currentDirectorId?: string`
- Filtrowac `contacts` przed grupowaniem po `stages`
- Logika filtrowania: taka sama jak w KanbanBoard (na podstawie `activeTaskMap`)

### 4. Aktualizacja typow kart
Obecne karty otrzymuja `taskStatus` jako `string`. Po zmianie bedzie to obiekt `{ status, assignedTo }`.

**Pliki:** `HotLeadCard.tsx`, `TopLeadCard.tsx`, `LeadCard.tsx`, `ColdLeadCard.tsx`
- Zaktualizowac typ `taskStatus` na nowy format
- Wyswietlanie statusu zadania pozostaje bez zmian (uzywa tylko `.status`)

## Szczegoly techniczne

### Zmieniony hook useActiveTaskContacts:
```typescript
// Nowy typ
export type TaskContactInfo = { status: TaskStatus; assignedTo: string | null };

// Select z assigned_to
.select('deal_team_contact_id, status, due_date, assigned_to')

// Map zwraca pelne info
statusMap.set(contactId, { 
  status: isOverdue ? 'overdue' : 'active', 
  assignedTo: task.assigned_to 
});
```

### Logika filtrowania w KanbanBoard:
```typescript
const memberFilteredContacts = useMemo(() => {
  if (filterMember === 'all') return filteredContacts;
  if (filterMember === 'unassigned') {
    return filteredContacts.filter(c => !activeTaskMap?.get(c.id));
  }
  const targetId = filterMember === 'mine' ? currentDirector?.id : filterMember;
  return filteredContacts.filter(c => {
    const info = activeTaskMap?.get(c.id);
    if (!info) return filterMember === 'mine'; // wspolne widoczne w "Moje"
    return info.assignedTo === targetId;
  });
}, [filteredContacts, filterMember, activeTaskMap, currentDirector]);
```

### Pasek filtra (pod wyszukiwarka):
```text
[Wszyscy] [Moje] [Jan Kowalski] [Anna Nowak] [Nieprzypisane]
```
Styl: identyczny jak w MyTeamTasksView -- male przyciski `variant="outline"` / `variant="default"`.

## Pliki do zmiany (podsumowanie):
1. `src/hooks/useActiveTaskContacts.ts` -- rozszerzenie o `assigned_to`
2. `src/components/deals-team/KanbanBoard.tsx` -- state filtra, pasek przyciskow, filtrowanie
3. `src/components/deals-team/SubKanbanView.tsx` -- prop filtra, filtrowanie kontaktow
4. `src/components/deals-team/HotLeadCard.tsx` -- aktualizacja typu `taskStatus`
5. `src/components/deals-team/TopLeadCard.tsx` -- aktualizacja typu `taskStatus`
6. `src/components/deals-team/LeadCard.tsx` -- aktualizacja typu `taskStatus`
7. `src/components/deals-team/ColdLeadCard.tsx` -- aktualizacja typu `taskStatus`
