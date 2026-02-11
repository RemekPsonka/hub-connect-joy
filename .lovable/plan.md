

# Naprawa formularza dodawania spotkania

## Problem

Przy tworzeniu spotkania, funkcja `useCreateMeeting` pobiera `tenant_id` z tabeli `directors` bez filtrowania po zalogowanym uzytkowniku:

```text
const { data: director } = await supabase
  .from('directors')
  .select('tenant_id')
  .single();  // BLAD: zwraca 3 wiersze zamiast 1
```

Supabase zwraca blad PGRST116 ("The result contains 3 rows"), co powoduje wyswietlenie komunikatu "Wystapil blad podczas zapisywania spotkania".

## Rozwiazanie

Dodanie filtra `.eq('user_id', userId)` do zapytania, tak jak robi to reszta aplikacji (np. w headerze).

## Plik do modyfikacji

| Plik | Zmiana |
|---|---|
| `src/hooks/useMeetings.ts` | Dodanie pobrania sesji uzytkownika i filtrowania directors po user_id (linie 169-176) |

## Szczegoly techniczne

Zmiana w funkcji `useCreateMeeting` (linie 169-176):

```text
mutationFn: async (meeting: MeetingInsert) => {
  // Pobierz zalogowanego uzytkownika
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Pobierz tenant_id dla konkretnego uzytkownika
  const { data: director } = await supabase
    .from('directors')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single();

  if (!director) throw new Error('No tenant found');
  // reszta bez zmian
```

Analogiczna poprawka w `useUpdateMeeting` nie jest potrzebna, bo ta funkcja nie uzywa directors.

Jedna zmiana, jeden plik -- formularz zacznie dzialac poprawnie.
