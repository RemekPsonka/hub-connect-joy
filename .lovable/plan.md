
# Naprawa brakujacych kontaktow w TaskDetailSheet z poziomu Deals

## Problem
Hook `useDealContactAllTasks` pobiera zadania z `select('*')` - bez joina `task_contacts`. Dlatego `TaskDetailSheet` otwierany z deals nie ma danych do wyrenderowania sekcji "POWIAZANE KONTAKTY".

## Rozwiazanie
Rozszerzyc zapytania w `useDealContactAllTasks` o pelny join `task_contacts`, `cross_tasks`, `task_categories`, `owner`, `assignee` - taki sam jak w `useProjectTasks` / glownym widoku `/tasks`.

## Zmiana w pliku

### `src/hooks/useDealsTeamAssignments.ts` - funkcja `useDealContactAllTasks`

Zmiany w dwoch zapytaniach wewnatrz tego hooka:

**Source 1** (zadania z `deal_team_contact_id`):
```typescript
// PRZED:
.select('*')

// PO:
.select(`
  *,
  task_contacts(contact_id, role, contacts(id, full_name, company)),
  cross_tasks(id, contact_a_id, contact_b_id, connection_reason, suggested_intro, intro_made,
    discussed_with_a, discussed_with_a_at, discussed_with_b, discussed_with_b_at, intro_made_at,
    contact_a:contacts!cross_tasks_contact_a_id_fkey(id, full_name, company),
    contact_b:contacts!cross_tasks_contact_b_id_fkey(id, full_name, company)),
  task_categories(id, name, color, icon, visibility_type, workflow_steps),
  owner:directors!tasks_owner_id_fkey(id, full_name),
  assignee:directors!tasks_assigned_to_fkey(id, full_name)
`)
```

**Source 2** (zadania z `task_contacts` join table):
```typescript
// PRZED:
.select('task_id, tasks(*)')

// PO:
.select(`task_id, tasks(
  *,
  task_contacts(contact_id, role, contacts(id, full_name, company)),
  cross_tasks(id, contact_a_id, contact_b_id, connection_reason, suggested_intro, intro_made,
    discussed_with_a, discussed_with_a_at, discussed_with_b, discussed_with_b_at, intro_made_at,
    contact_a:contacts!cross_tasks_contact_a_id_fkey(id, full_name, company),
    contact_b:contacts!cross_tasks_contact_b_id_fkey(id, full_name, company)),
  task_categories(id, name, color, icon, visibility_type, workflow_steps),
  owner:directors!tasks_owner_id_fkey(id, full_name),
  assignee:directors!tasks_assigned_to_fkey(id, full_name)
)`)
```

To zapewni ze zadania otwierane z deals beda mialy identyczna strukture danych jak te z `/tasks`, wlacznie z sekcja "Powiazane kontakty", wlascicielem, kategoria i cross-taskami.

Jeden plik do edycji, ~20 linii zmian.
