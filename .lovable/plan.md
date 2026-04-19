

## Bug: „Moje" i „Nieprzypisane" pokazują te same kontakty

### Diagnoza (KanbanBoard.tsx, linie 96–107)

```ts
if (filterMember === 'unassigned') {
  return searchFilteredContacts.filter(c => !activeTaskMap?.get(c.id));
}
const targetId = filterMember === 'mine' ? currentDirector?.id : filterMember;
return searchFilteredContacts.filter(c => {
  const info = activeTaskMap?.get(c.id);
  if (!info) return filterMember === 'mine'; // ← BUG
  return info.assignedTo === targetId;
});
```

**Problem:** dla `filterMember === 'mine'` linia `if (!info) return filterMember === 'mine'` zwraca `true` dla **wszystkich** kontaktów bez aktywnego zadania → czyli dokładnie tego samego zbioru co „Nieprzypisane". Komentarz „shared contacts visible in 'mine'" jest błędny dla SGU/jednoosobowego użycia — przecina się z „Nieprzypisane".

Dla Remka (sam w SGU) efekt:
- „Moje" = (kontakty z taskiem assigned_to=Remek) ∪ (kontakty bez taska) 
- „Nieprzypisane" = (kontakty bez taska)
- Skoro Remek nie ma jeszcze tasków assigned_to=siebie albo task.assigned_to to null/`director_id` mismatch — oba zbiory kończą jako identyczne.

### Dodatkowy problem
`activeTaskMap` mapuje `assignedTo` z `tasks.assigned_to`. Trzeba zweryfikować czy `tasks.assigned_to` przechowuje `director_id` czy `auth.uid()` — od tego zależy poprawność porównania `info.assignedTo === currentDirector?.id`. Sprawdzę w recon przed kodem (jeden read query do `tasks` + jeden grep `assigned_to` w hookach tworzących taski).

### Naprawa

**1. `src/components/deals-team/KanbanBoard.tsx`** — popraw logikę „Moje":
```ts
if (filterMember === 'mine') {
  const myId = currentDirector?.id;
  return searchFilteredContacts.filter(c => {
    const info = activeTaskMap?.get(c.id);
    return info?.assignedTo === myId; // tylko własne aktywne zadania
  });
}
// pozostali członkowie:
const targetId = filterMember;
return searchFilteredContacts.filter(c => activeTaskMap?.get(c.id)?.assignedTo === targetId);
```

**2. `src/components/deals-team/SubKanbanView.tsx`** — identyczna naprawa (linie 47–58 mają ten sam bug: `if (!info) return localFilterMember === 'mine'`).

**3. Recon przed implementacją:**
- `supabase--read_query` na `tasks` (sample 5 wierszy z SGU teamu) — sprawdzić czy `assigned_to` to UUID directora czy auth.uid().
- Jeśli to auth.uid() — porównanie musi być `info.assignedTo === currentDirector?.user_id` (a nie `.id`). Wtedy fix trochę większy, ale ten sam plik.

### Pliki do edycji
- `src/components/deals-team/KanbanBoard.tsx` (linie 96–107)
- `src/components/deals-team/SubKanbanView.tsx` (linie 47–58)

### Smoke test
1. SGU Remek → „Moje" pokazuje TYLKO kontakty gdzie ma aktywne zadanie przypisane do siebie.
2. „Nieprzypisane" → TYLKO kontakty bez żadnego aktywnego zadania.
3. Zbiory rozłączne (przecięcie = ∅).
4. „Wszyscy" = suma wszystkich.
5. Drill-down (np. AUDYT) — ten sam fix w SubKanbanView, identyczne zachowanie.

Brak zmian DB. Build + lista plików po wdrożeniu.

