
# Filtrowanie grup kontaktow dla nie-adminow

## Problem
Pawel (rola `sgu`) widzi wszystkie 10 grup w filtrze, choc tylko 6 zostalo mu udostepnionych przez `contact_group_shares`. System udostepniania filtruje **kontakty** (przez RLS i `is_group_shared_to_me`), ale sam **dropdown z grupami** pobiera wszystkie grupy w tenancie bez zadnego filtrowania.

## Rozwiazanie
Dla uzytkownikow nie bedacych adminami/ownerami, filtrowanie listy grup tak, aby widzieli tylko:
1. Grupy udostepnione im bezposrednio (przez `contact_group_shares.shared_with_director_id`)
2. Grupy udostepnione ich zespolom (przez `contact_group_shares.shared_with_team_id`)

Admini i ownerzy nadal beda widziec wszystkie grupy.

## Zmiany techniczne

### 1. Nowa funkcja bazodanowa `get_my_visible_group_ids`
Utworzenie funkcji SECURITY DEFINER, ktora zwraca liste ID grup widocznych dla aktualnego uzytkownika:
- Jesli uzytkownik jest adminem/ownerem -- zwraca wszystkie grupy w tenancie
- W przeciwnym razie -- zwraca grupy z `contact_group_shares` przypisane do jego `director_id` lub do zespolow, ktorych jest czlonkiem

### 2. Aktualizacja `src/hooks/useContacts.ts` -- funkcja `useContactGroups`
Dodanie filtrowania po `get_my_visible_group_ids` dla nie-adminow:
- Wywolanie RPC `get_my_visible_group_ids` aby uzyskac dozwolone ID grup
- Filtrowanie wynikow `.in('id', visibleGroupIds)`

### 3. Aktualizacja `src/hooks/useContactGroups.ts` -- funkcja `useContactGroups`
Ta sama zmiana co powyzej -- ten hook jest uzywany w panelu Owner i Settings.
Tutaj jednak nie filtrujemy, poniewaz panel Owner powinien widziec wszystkie grupy do zarzadzania udostepnieniami.

### Podejscie alternatywne (prostsze)
Zamiast funkcji bazodanowej, mozna po stronie klienta:
1. Pobrac `contact_group_shares` dla aktualnego dyrektora
2. Wyfiltrowac grupy na froncie

To podejscie jest prostsze i nie wymaga migracji bazy danych. Uzyje istniejacego hooka `useContactGroupShares` lub bezposredniego zapytania.

### Rekomendowane podejscie -- filtrowanie po stronie klienta

#### Plik: `src/hooks/useContacts.ts` (funkcja `useContactGroups`, linie 136-165)
- Dodanie sprawdzenia roli uzytkownika (admin/owner vs inne)
- Dla nie-adminow: pobranie `contact_group_shares` i filtrowanie grup
- Uzycie `supabase.rpc('is_tenant_admin', ...)` lub sprawdzenie roli z `user_roles`

```text
Logika:
1. Pobierz wszystkie grupy w tenancie
2. Jesli uzytkownik jest adminem/ownerem -> pokaz wszystkie
3. W przeciwnym razie -> pobierz contact_group_shares dla tego dyrektora
   i zespolow, do ktorych nalezy -> filtruj grupy po ID
```

#### Plik: `src/hooks/useContactGroups.ts`
- Bez zmian -- uzywany w Owner panelu, ktory i tak wymaga bycia adminem
