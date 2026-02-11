

# Naprawa panelu DEALS -- przypisania nie widac + brakujace funkcje

## Problem

1. **Deals sie nie przypisuje / nie widac**: Polityki RLS na tabeli `deal_team_contacts` wymagaja `is_deal_team_member(team_id)` dla WSZYSTKICH operacji (SELECT, INSERT, UPDATE, DELETE). Jezeli uzytkownik nie jest czlonkiem zespolu Deals, to:
   - INSERT (dodawanie) konczy sie bledem RLS (cichy blad)
   - SELECT (wyswietlanie) nie zwraca wierszy -- panel pokazuje "Brak przypisania"

2. **Brak mozliwosci usuwania z lejka**: Panel nie ma opcji usuwania powiazania.

## Rozwiazanie

### 1. Zmiana polityk RLS (migracja SQL)

Dodanie alternatywnych polityk pozwalajacych na operacje rowniez dla administratorow tenanta (np. dyrektorow), nie tylko czlonkow zespolu:

```text
-- Nowa polityka SELECT: tenant member moze czytac swoje kontakty
CREATE POLICY "dtc_select_own_contacts" ON deal_team_contacts
  FOR SELECT USING (
    tenant_id = get_current_tenant_id()
    AND contact_id IN (
      SELECT id FROM contacts WHERE tenant_id = get_current_tenant_id()
    )
  );

-- Nowa polityka INSERT: tenant member moze dodawac
CREATE POLICY "dtc_insert_tenant" ON deal_team_contacts
  FOR INSERT WITH CHECK (
    tenant_id = get_current_tenant_id()
  );
```

Alternatywnie (prostsze): zmiana istniejacych polityk aby usunac wymog `is_deal_team_member` lub dodac OR z dodatkowym warunkiem.

### 2. Poprawka `ContactDealsPanel.tsx`

- **Filtrowanie zespolow**: W dropdownie "Dodaj" pokazywac tylko zespoly, w ktorych uzytkownik jest czlonkiem (uzyc `useMyDealTeams` zamiast `useDealTeams`)
- **Przycisk usuwania**: Dodac ikonke `X` przy kazdym badge'u umozliwiajaca usuniecie kontaktu z zespolu
- **Lepsza obsluga bledow**: Wyswietlanie toast z bledem jesli insert sie nie powiedzie

### 3. Poprawka cache invalidation

W `useAddContactToTeam` (hook mutacji) dodac invalidacje `['contact-deal-teams']` w `onSuccess` aby panel DEALS na karcie kontaktu automatycznie sie odswiezal.

## Pliki do modyfikacji

| Plik | Zmiana |
|---|---|
| Migracja SQL | Rozszerzenie polityk RLS na `deal_team_contacts` -- dodanie polityki SELECT dla tenant members (bez wymogu `is_deal_team_member`) |
| `src/components/contacts/ContactDealsPanel.tsx` | 1) Zamiana `useDealTeams` na `useMyDealTeams` 2) Dodanie przycisku usuwania z lejka 3) Lepsza obsluga bledow |
| `src/hooks/useDealsTeamContacts.ts` | Dodanie invalidacji `['contact-deal-teams']` w `onSuccess` mutacji `useAddContactToTeam` |

## Szczegoly techniczne

### Migracja RLS

Istniejace polityki wymagaja `is_deal_team_member(team_id)` co blokuje uzytkownikow nie-czlonkow. Rozwiazanie:

```text
-- Usun stara politke SELECT
DROP POLICY IF EXISTS "dtc_select" ON deal_team_contacts;

-- Nowa polityka: czlonek zespolu LUB wlasciciel kontaktu w tenancie
CREATE POLICY "dtc_select" ON deal_team_contacts
  FOR SELECT USING (
    tenant_id = get_current_tenant_id()
    AND (
      is_deal_team_member(team_id)
      OR contact_id IN (SELECT id FROM contacts WHERE director_id = get_current_director_id())
    )
  );

-- Analogicznie dla INSERT -- pozwol dodawac do zespolow ktorych jestes czlonkiem
-- (tu bez zmian, ale filtrujemy w UI po useMyDealTeams)
```

### ContactDealsPanel -- przycisk usuwania

```text
<Badge ...>
  {link.team_name} -- {link.category.toUpperCase()}
  <button onClick={() => handleRemove(link.id, link.team_id)} className="ml-1">
    <X className="h-3 w-3" />
  </button>
</Badge>
```

Funkcja `handleRemove` uzywa `useRemoveContactFromTeam` z `useDealsTeamContacts.ts`.

### Cache invalidation w useAddContactToTeam

```text
onSuccess: (result) => {
  queryClient.invalidateQueries({ queryKey: ['deal-team-contacts', result.teamId] });
  queryClient.invalidateQueries({ queryKey: ['deal-team-clients', result.teamId] });
  queryClient.invalidateQueries({ queryKey: ['contact-deal-teams'] }); // NOWE
  toast.success('Kontakt zostal dodany do zespolu');
},
```

### useMyDealTeams zamiast useDealTeams

W `ContactDealsPanel` zamiana:
```text
// PRZED:
const { data: allTeams = [] } = useDealTeams();

// PO:
const { data: allTeams = [] } = useMyDealTeams();
```

Dzieki temu uzytkownik widzi w dropdownie tylko zespoly, do ktorych nalezy, i nie napotka bledow RLS przy insercie.

