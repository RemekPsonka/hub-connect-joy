
# Naprawa filtrowania zadań w "Moje zadania"

## Problem

Logika w `MyTasks.tsx` (linie 141-156):
```
if (task.owner_id === directorId || task.assigned_to === directorId) {
  my.push(task);  // <-- WSZYSTKO trafia tutaj
}
```

Zadania deal-team maja `owner_id` = Ty (tworca), nawet gdy `assigned_to` = ktos inny. Efekt: 33 zadania w "Moje", 0 w "Zespolowe".

## Dane z bazy

Przyklad: 20+ zadan "Umowic spotkanie" z `owner_id = Ty`, ale `assigned_to` = Adam Osoba / Pawel Swierczynski. Te zadania powinny byc w "Zespolowe", nie w "Moje".

## Rozwiazanie

Zmiana logiki filtrowania w `src/pages/MyTasks.tsx`:

**Nowa logika:**
- **Moje**: zadanie przypisane do mnie (`assigned_to === directorId`) LUB jestem wlascicielem i nikt inny nie jest przypisany (`owner_id === directorId && !assigned_to`)
- **Zespolowe**: zadania z `deal_team_id` gdzie jestem wlascicielem ale przypisane komus innemu, PLUS zadania z `visibility === 'team'` gdzie nie jestem ani ownerem ani assignee
- **Inne**: reszta (jak dotychczas)

### Plik: `src/pages/MyTasks.tsx` (linie 141-156)

Zamiana bloku filtrowania:

```typescript
for (const task of allTasks) {
  const isOwner = task.owner_id === directorId;
  const isAssignee = task.assigned_to === directorId;
  const isDelegated = isOwner && task.assigned_to && task.assigned_to !== directorId;

  if (isDelegated) {
    // Jestem tworca ale delegowalem komus - to zadanie zespolowe
    team.push(task);
  } else if (isOwner || isAssignee) {
    // Moje wlasne lub przypisane do mnie
    my.push(task);
  } else if (task.visibility === 'team' || task.deal_team_id) {
    team.push(task);
  } else {
    other.push(task);
  }
}
```

## Efekt

- "Moje" pokaze tylko zadania bezposrednio Twoje (utworzone przez Ciebie bez delegacji + przypisane do Ciebie)
- "Zespolowe" pokaze zadania delegowane innym czlonkom zespolu + zadania zespolowe
- Liczniki w tabach beda poprawne
- Zadna inna zmiana nie jest potrzebna - tylko logika filtrowania
