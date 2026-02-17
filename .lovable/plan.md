
# Naprawa polityki RLS INSERT dla wanted_contacts

## Problem
Polityka `wc_insert` zostala utworzona z `TO public` (domyslna wartosc gdy nie podano roli), zamiast `TO authenticated`. Efekt:
- Rola `authenticated` (zalogowani uzytkownicy) NIE MA zadnej polityki INSERT
- RLS blokuje kazdy INSERT dla zalogowanych uzytkownikow
- Dlatego blad "new row violates row-level security policy" pojawia sie przy kazdej probie dodania

## Rozwiazanie
Usunac i utworzyc ponownie polityke `wc_insert` z jawnym `TO authenticated`:

```sql
DROP POLICY IF EXISTS "wc_insert" ON public.wanted_contacts;

CREATE POLICY "wc_insert" ON public.wanted_contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM public.directors WHERE user_id = auth.uid())
    AND created_by IN (SELECT id FROM public.directors WHERE user_id = auth.uid())
  );
```

## Plik do zmiany
Jedna migracja SQL -- zadnych zmian w kodzie.
