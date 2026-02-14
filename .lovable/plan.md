
# Naprawa brakujacego ptaszka dla Marcina Szemainda

## Przyczyna

Zadanie "Potwierdzic spotkanie" dla Marcina Szemainda ma status `pending` w bazie danych. Hook `useActiveTaskContacts` filtruje tylko po statusach `['todo', 'in_progress']`, pomijajac `pending`.

W bazie sa zadania z obu statusow: 2 zadania `pending` i 28 `todo`. Wyglada na to, ze `pending` to stary status sprzed unifikacji, ale nie zostal zmigrowany.

## Rozwiazanie

Dwuetapowe podejscie:

### 1. Hook `useActiveTaskContacts.ts` - dodanie `pending` do filtra

Zmiana filtra z:
```
.in('status', ['todo', 'in_progress'])
```
na:
```
.in('status', ['todo', 'in_progress', 'pending'])
```

To natychmiast naprawi ptaszka dla Szemainda i wszystkich kontaktow z zadaniami w starym statusie.

### 2. Migracja danych - zamiana `pending` na `todo`

Uruchomienie migracji SQL:
```sql
UPDATE tasks SET status = 'todo' WHERE status = 'pending';
```

To ujednolici wszystkie zadania do nowego systemu statusow (`todo`, `in_progress`, `completed`, `cancelled`).

## Pliki do edycji

| Plik | Zmiana |
|---|---|
| `src/hooks/useActiveTaskContacts.ts` | Dodanie `'pending'` do tablicy statusow w filtrze |
| Migracja SQL | `UPDATE tasks SET status = 'todo' WHERE status = 'pending'` |
