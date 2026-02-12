

# Udostepnianie grup kontaktow i widocznosc zespolow

## Co zostanie zrobione

### 1. Nowa tabela `contact_group_shares` -- konfigurator widocznosci grup

Nowa tabela pozwalajaca przypisac widocznosc danej grupy kontaktow do konkretnego dyrektora lub zespolu Deals:

| Kolumna | Typ | Opis |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID FK | |
| group_id | UUID FK -> contact_groups | Grupa kontaktow |
| shared_with_director_id | UUID FK -> directors (nullable) | Dyrektor z dostepem |
| shared_with_team_id | UUID FK -> deal_teams (nullable) | Zespol z dostepem |
| created_at | timestamp | |

Walidacja: co najmniej jedno z `shared_with_director_id` / `shared_with_team_id` musi byc wypelnione.

### 2. Aktualizacja RLS na tabeli `contacts` -- `contacts_director_select`

Nowa polityka dodaje dwie sciezki dostepu:

- **Czlonek zespolu Deals**: jesli kontakt jest w `deal_team_contacts` i uzytkownik jest czlonkiem tego zespolu -- widzi kontakt (bez ograniczen SGU/CC)
- **Udostepniona grupa**: jesli kontakt nalezy do grupy (`primary_group_id`), ktora zostala udostepniona dyrektorowi bezposrednio lub przez zespol, w ktorym jest czlonkiem

```text
contacts_director_select:
  tenant_id = get_current_tenant_id()
  AND (
    is_tenant_admin(...)
    OR director_id = get_current_director_id()
    OR contact_shares (istniejace)
    OR deal_team_contacts member (NOWE)
    OR contact_group_shares (NOWE)
  )
```

### 3. Ograniczenie widocznosci zespolow Deals -- `deal_teams_select`

Aktualna polityka: kazdy w tenancie widzi wszystkie zespoly.
Nowa polityka: dyrektor widzi tylko zespoly, w ktorych jest czlonkiem. Admin widzi wszystkie.

```text
deal_teams_select:
  tenant_id = get_current_tenant_id()
  AND (
    is_tenant_admin(auth.uid(), tenant_id)
    OR EXISTS (
      SELECT 1 FROM deal_team_members
      WHERE team_id = deal_teams.id
      AND director_id = get_current_director_id()
      AND is_active = true
    )
  )
```

Analogiczna zmiana w `deal_team_members` (dtm_select, team_members_select) -- widocznosc tylko czlonkow swoich zespolow.

### 4. UI: Konfigurator udostepnien grup kontaktow

Nowy komponent na stronie Owner (panel admina) -- zakladka lub sekcja "Widocznosc grup":

- Lista grup kontaktow
- Przy kazdej grupie mozliwosc dodania dyrektora lub zespolu
- Wybor z listy istniejacych dyrektorow i zespolow
- Mozliwosc usuwania udostepnien

Komponenty:
- `src/components/owner/ContactGroupSharingPanel.tsx` -- glowny panel
- `src/hooks/useContactGroupShares.ts` -- hook CRUD

### 5. Aktualizacja hooka `useDealTeams`

Funkcja `useDealTeams()` (uzywana w panelu admina) zostaje bez zmian -- admin widzi wszystko dzieki RLS.
Funkcja `useMyDealTeams()` juz filtruje po czlonkostwie -- dziala poprawnie.

## Pliki do utworzenia

| Plik | Opis |
|---|---|
| `src/components/owner/ContactGroupSharingPanel.tsx` | Panel konfiguracji widocznosci grup |
| `src/hooks/useContactGroupShares.ts` | Hook do CRUD udostepnien grup |

## Pliki do modyfikacji

| Plik | Zmiana |
|---|---|
| `src/pages/Owner.tsx` | Dodanie zakladki "Widocznosc grup" |
| Migracja SQL | Tabela `contact_group_shares`, RLS policies, aktualizacja `contacts_director_select`, `deal_teams_select` |

## Szczegoly techniczne migracji SQL

```text
1. CREATE TABLE contact_group_shares (...)
2. Trigger walidacyjny (director lub team wymagane)
3. RLS na contact_group_shares (admin CRUD, dyrektor SELECT swoich)
4. DROP + CREATE contacts_director_select (dodanie 2 nowych sciezek)
5. DROP + CREATE deal_teams_select (ograniczenie do czlonkow)
6. DROP + CREATE dtm_select / team_members_select (ograniczenie widocznosci)
```
