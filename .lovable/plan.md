
# Naprawa widoku "Moje zadania" - filtrowanie i separacja

## Problemy

1. **Pokazuja sie wszystkie zadania**: Gdy `currentDirector` jeszcze sie laduje, `ownerId` jest `undefined`, filtr nie jest stosowany i zapytanie zwraca WSZYSTKIE zadania z bazy (RLS filtruje tylko po tenant, nie po dyrektorze).

2. **Brak szczegolowych danych po otwarciu**: Zadania typu "Umowic spotkanie" (z lejka) faktycznie nie maja opisu - to nie blad, ale brakuje informacji o wlascicielu/przypisanym w panelu szczegolowym.

3. **Brak rozdzielenia zadan**: Uzytkownik chce wyraznie widziec co jest JEGO, co jest ZESPOLOWE, a co nalezacy do innych dyrektorow.

## Rozwiazanie

### Plik 1: `src/pages/MyTasks.tsx` - calkowita przebudowa

Dodanie zakladek (Tabs) z trzema sekcjami:
- **Moje** (domyslna) - zadania gdzie `owner_id = currentDirector.id` LUB `assigned_to = currentDirector.id`
- **Zespolowe** - zadania z `visibility = 'team'` gdzie uzytkownik NIE jest wlascicielem ani przypisanym
- **Inne** - pozostale zadania widoczne w ramach tenanta

Kluczowe zmiany:
- Dodanie `enabled: !!currentDirector?.id` do hooka `useTasks`, zeby zapytanie nie odpalalo sie bez filtra
- Trzy oddzielne wywolania `useTasks` z roznymi filtrami (ownerId, assignedTo, visibility)
- Alternatywnie: jedno zapytanie + filtrowanie klienckie po `owner_id` i `assigned_to`

Wybrane podejscie: jedno zapytanie bez filtrow owner/assigned + filtrowanie klienckie w 3 grupy. Unikamy wielokrotnych zapytan.

```
Zakladki:
[Moje (12)] [Zespolowe (5)] [Wszystkie (30)]
```

Kazda zakladka ma ten sam uklad chronologiczny (Zalegle / Dzisiaj / Ten tydzien / Pozniej / Bez terminu / Zakonczone).

### Plik 2: `src/pages/MyTasks.tsx` - dodanie info o wlascicielu/przypisanym

Na kazdej karcie zadania dodanie:
- Awatar/inicjaly wlasciciela (owner)
- Badge "Przypisane do: [imie]" jesli assigned_to != owner_id

### Plik 3: `src/components/tasks/TaskDetailSheet.tsx` - dodanie info o wlascicielu

W panelu szczegolowym dodanie sekcji:
- "Wlasciciel: [imie]"
- "Przypisane do: [imie]"
- "Widocznosc: prywatne/zespolowe/publiczne"

## Szczegoly techniczne

| Plik | Zmiana |
|------|--------|
| `src/pages/MyTasks.tsx` | 1. Dodanie importu `Tabs, TabsList, TabsTrigger, TabsContent` z radix. 2. Jedno zapytanie `useTasks({})` z `enabled: !!currentDirector?.id`. 3. Klienckie filtrowanie na 3 grupy: `myTasks` (owner_id lub assigned_to = moje ID), `teamTasks` (visibility='team' i nie moje), `otherTasks` (reszta). 4. Tabs UI z 3 zakladkami. 5. Dodanie avatara wlasciciela i badge przypisania na kazdej karcie. |
| `src/components/tasks/TaskDetailSheet.tsx` | Dodanie wiersza z imieniem wlasciciela i przypisanego (dane owner/assignee sa juz w select query jako `owner:directors` i `assignee:directors`). |

## Wazne

- Zapytanie `useTasks` juz pobiera `owner:directors!tasks_owner_id_fkey(id, full_name)` i `assignee:directors!tasks_assigned_to_fkey(id, full_name)` — dane sa dostepne, wystarczy je wyswietlic.
- Nie trzeba zmieniac hookow ani bazy danych.
- Filtrowanie klienckie jest bezpieczne bo RLS i tak ogranicza dane do tenanta.
