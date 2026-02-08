

# Kontakty, Dyrektorzy i Zespoly w projekcie -- dodanie brakujacych funkcji

## Podsumowanie

Trzy brakujace funkcjonalnosci w widoku projektu:
1. **Kontakty** -- brak przycisku "Dodaj kontakt" (jest tylko empty state + Sovra suggestions)
2. **Czlonkowie (Dyrektorzy)** -- brak zakladki/sekcji do zarzadzania czlonkami zespolu projektowego
3. **Zespoly Deals** -- brak mozliwosci przypisania zespolu deals do projektu

## Analiza obecnego stanu

### Kontakty projektu
- `ProjectContactsTab` wyswietla liste kontaktow i pozwala usuwac, ale **nie ma przycisku "Dodaj kontakt"**
- Hook `useAddProjectContact` istnieje i dziala
- Komponent `ConnectionContactSelect` (searchable combobox z wirtualizacja) nadaje sie idealnie do wyboru kontaktu
- Tabela `project_contacts` ma kolumny: `project_id`, `contact_id`, `role_in_project`, `tenant_id`, `added_by`

### Czlonkowie projektu (dyrektorzy)
- Hooki `useProjectMembers`, `useAddProjectMember`, `useRemoveProjectMember` **istnieja i dzialaja**
- Tabela `project_members` ma kolumny: `project_id`, `director_id`, `assistant_id`, `role`, `tenant_id`
- `ProjectOverviewTab` wyswietla czlonkow read-only (Badge), ale **nie ma sekcji do dodawania/usuwania**
- Hook `useDirectors` pobiera wszystkich dyrektorow w tenancie
- Brak dedykowanego komponentu `ProjectMembersTab`

### Zespoly deals
- Tabela `deal_teams` istnieje z kolumnami: `id`, `name`, `color`, `tenant_id`, `is_active`
- Hook `useDealTeams` pobiera liste zespolow
- **Tabela `projects` NIE MA kolumny `team_id`** -- potrzebna migracja
- Brak UI do przypisania zespolu

## Zmiany do wykonania

### 1. Migracja bazy danych -- dodanie `team_id` do `projects`

Dodanie opcjonalnej kolumny `team_id` (FK do `deal_teams`) w tabeli `projects`:

```text
ALTER TABLE public.projects 
  ADD COLUMN team_id uuid REFERENCES public.deal_teams(id) ON DELETE SET NULL;
```

### 2. ProjectContactsTab.tsx -- dodanie przycisku "Dodaj kontakt"

Dodac przycisk "Dodaj kontakt" ktory otwiera dialog z `ConnectionContactSelect`:
- W empty state: przycisk w `EmptyState` action
- W widoku z lista: przycisk "+" w naglowku `DataCard`
- Dialog z polem `ConnectionContactSelect` (excludeIds = juz przypisane kontakty) + opcjonalne pole "Rola w projekcie"
- Po wybraniu kontaktu i kliknieciu "Dodaj" -- wywolanie `useAddProjectContact`

### 3. ProjectMembersSection -- nowy komponent w zakladce Przeglad

Dodanie sekcji "Zespol projektowy" do `ProjectOverviewTab` (zamiast obecnych Badge-ow read-only):
- Wyswietlanie listy czlonkow z rolami (member/owner)
- Przycisk "+" otwierajacy dialog z Select (lista dyrektorow z `useDirectors`, excludeIds = juz dodani)
- Przycisk usuwania czlonka (ikona Trash2)
- Wlasciciel projektu wyswietlany osobno (nie mozna go usunac)

### 4. Pole "Zespol" w ProjectOverviewTab

Dodanie pola "Zespol" w sekcji "Szczegoly" na `ProjectOverviewTab`:
- Select z lista zespolow z `useDealTeams`
- Wartosc "Brak zespolu" jako domyslna
- Zmiana zapisuje sie przez `useUpdateProject` (po dodaniu team_id do schematu)
- Wyswietlanie koloru zespolu jako kolorowa kropka obok nazwy

### 5. Aktualizacja Zod schemas

Rozszerzenie `ProjectCreateSchema` i `ProjectUpdateSchema` o pole `team_id`:
```text
team_id: z.string().uuid().optional().nullable()
```

## Pliki do modyfikacji/utworzenia

| Plik | Zmiana |
|------|--------|
| Migracja SQL | Dodanie kolumny `team_id` do tabeli `projects` |
| `src/components/projects/ProjectContactsTab.tsx` | Dodanie przycisku "Dodaj kontakt" z dialogiem i ConnectionContactSelect |
| `src/components/projects/ProjectOverviewTab.tsx` | Rozbudowa sekcji czlonkow (dodawanie/usuwanie dyrektorow), dodanie pola "Zespol" w szczegolach |
| `src/hooks/useProjects.ts` | Dodanie `team_id` do Zod schemas, aktualizacja select query o team |

## Szczegoly techniczne

### ProjectContactsTab -- dialog dodawania kontaktu

```text
Stan:
  - isAddDialogOpen: boolean
  - selectedContactId: string | null
  - roleInProject: string (opcjonalne)

Logika:
  - excludeIds = projectContacts.map(pc => pc.contact_id)
  - Po kliknieciu "Dodaj":
    addContact.mutate({ projectId, contactId: selectedContactId, roleInProject })
  - Reset stanu po sukcesie

UI:
  - Dialog z:
    - ConnectionContactSelect (z excludeIds)
    - Input "Rola w projekcie" (opcjonalne, placeholder "np. Decydent, Sponsor")
    - Przyciski "Anuluj" / "Dodaj kontakt"
```

### ProjectOverviewTab -- sekcja czlonkow

```text
Obecne zachowanie: Badge z nazwiskiem + rola (read-only)
Nowe zachowanie:
  - Lista czlonkow z Avatar, nazwisko, rola, przycisk usun
  - Przycisk "Dodaj czlonka" otwierajacy maly dialog/popover:
    - Select z useDirectors() (exclude juz dodanych + owner)
    - Select roli: "Czlonek" / "Obserwator"
    - Przycisk "Dodaj"
  - Wlasciciel (owner_id) wyswietlany na poczatku z Badge "Wlasciciel" (nie mozna usunac)
```

### ProjectOverviewTab -- pole Zespol

```text
W sekcji "Szczegoly" dodajemy wiersz:
  <span>Zespol</span>
  <Select value={project.team_id || 'none'} onValueChange={handleTeamChange}>
    <SelectItem value="none">Brak zespolu</SelectItem>
    {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
  </Select>

handleTeamChange:
  updateProject.mutate({ id: project.id, data: { team_id: value === 'none' ? null : value } })
```

### useProjects.ts -- rozszerzenie

```text
1. ProjectCreateSchema: dodac team_id: z.string().uuid().optional().nullable()
2. useProject query: dodac team:deal_teams(id, name, color) do select
3. useProjects query: dodac team:deal_teams(id, name, color) do select
4. ProjectWithOwner type: dodac team?: { id: string; name: string; color: string } | null
```

## Kolejnosc wykonania

```text
1. Migracja SQL: ALTER TABLE projects ADD COLUMN team_id
2. useProjects.ts: rozszerzenie Zod + query o team
3. ProjectContactsTab.tsx: dodanie przycisku "Dodaj kontakt" z dialogiem
4. ProjectOverviewTab.tsx: rozbudowa sekcji czlonkow + pole Zespol
```

## Czego NIE robimy

| Element | Powod |
|---------|-------|
| Nowa zakladka "Zespol" w TabsList | Czlonkowie i zespol sa czescia Przegladu -- nie komplikujemy nawigacji |
| Tworzenie nowych zespolow z poziomu projektu | Zespoly zarzadzane sa w module Deals |
| Modyfikacja tabeli deal_teams | Istniejaca struktura wystarczy |
| Dodanie team_members do projektu | Projekt ma czlonkow (project_members/directors), nie team_members |

