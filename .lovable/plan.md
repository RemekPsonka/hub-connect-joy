## Diagnoza

Notatka nadal nie zapisuje się nie przez RLS, tylko przez zły identyfikator autora.

Aktualny request kończy się błędem bazy:

```text
23503: insert/update on deal_team_activity_log violates foreign key constraint deal_team_activity_log_actor_id_fkey
Key is not present in table "directors".
```

Frontend wysyła:

```ts
actor_id: user.id
```

ale kolumna `deal_team_activity_log.actor_id` wskazuje na `directors.id`, a nie na auth `user.id`. Dla Remka poprawny `directors.id` to inny UUID niż `user.id`, więc FK blokuje zapis.

## Plan naprawy

1. Poprawić zapis notatki w `OperationalActions.tsx`
   - użyć `director?.id` z `useAuth()` jako `actor_id`, zamiast `user?.id`;
   - dla asystentki zostawić bezpieczny fallback `null`, jeśli nie ma rekordu directora;
   - dodać czytelny komunikat, jeśli brakuje kontekstu użytkownika/zespołu.

2. Poprawić RLS policy dodaną w ostatnim hotfixie
   - obecna policy porównuje `actor_id = auth.uid()`, czyli dalej miesza `directors.id` z `user.id`;
   - zastąpić ją warunkiem:

```sql
public.is_deal_team_member(team_id)
AND (
  actor_id IS NULL
  OR actor_id = public.get_current_director_id()
)
```

3. Ujednolicić odczyt nazw autorów w historii kontaktu
   - `useContactHistory.ts` teraz traktuje `activity.actor_id` jak `auth.users.id`;
   - po zmianie zapisu trzeba mapować `actor_id` po `directors.id`;
   - dzięki temu notatki będą pokazywać właściwego autora.

4. Zachować integrację z AI
   - istniejące zmiany w `live-copilot` i `agenda-builder` czytają `deal_team_activity_log` z `action='note_added'`;
   - po naprawie zapisu notatki zaczną trafiać do tej samej tabeli, więc AI będzie mogła je czytać bez zmiany modelu danych.

5. Walidacja po wdrożeniu
   - sprawdzić request POST do `deal_team_activity_log`, czy zwraca 201/200 zamiast 409;
   - sprawdzić, czy notatka pojawia się w historii kontaktu;
   - sprawdzić, czy `live-copilot`/agenda-builder widzą ostatnie notatki w kontekście.

## Pliki do zmiany

- `src/components/sgu/odprawa/OperationalActions.tsx`
- `src/hooks/odprawa/useContactHistory.ts`
- nowa migracja SQL dla policy `deal_team_activity_log`

## Uwagi techniczne

Nie będę zmieniać `src/integrations/supabase/types.ts` ani klienta Lovable Cloud. Migracja będzie tylko zmianą policy, bez kasowania danych.