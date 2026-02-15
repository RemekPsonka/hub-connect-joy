
# Przestrzen robocza - Tygodniowy planner projektow (Workspace)

## Koncept
Nowa strona `/workspace` z widokiem tygodniowym (Pn-Nd), gdzie kazdy dzien jest przypisany do jednego projektu. Klikniecie w dzien otwiera mini-dashboard danego projektu z:
- Nazwa i opis projektu
- Linki do projektow AI (nowa tabela)
- Tematy do omowienia od wspolpracownikow (z tabeli `project_comments`)
- Zadania z danego projektu
- Zespol projektowy (czlonkowie)

## Zmiany w bazie danych

### Nowa tabela: `workspace_schedule`
Mapowanie dnia tygodnia na projekt dla kazdego dyrektora.

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | uuid PK | |
| tenant_id | uuid FK | Izolacja tenanta |
| director_id | uuid FK | Kto posiada ten harmonogram |
| day_of_week | int (0-6) | 0=Poniedzialek, 6=Niedziela |
| project_id | uuid FK | Przypisany projekt |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Constraint UNIQUE na (director_id, day_of_week) - jeden projekt na dzien.

### Nowa tabela: `project_links`
Linki do zewnetrznych zasobow (np. projekty AI, dokumenty, repozytoria).

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| project_id | uuid FK | Powiazany projekt |
| title | text | Nazwa linku |
| url | text | Adres URL |
| category | text | Kategoria (ai_project, docs, repo, other) |
| created_by | uuid FK | Kto dodal |
| created_at | timestamptz | |

RLS: dostep na bazie tenant_id + director musi byc wlascicielem lub czlonkiem projektu.

## Nowe pliki

### 1. `src/pages/Workspace.tsx`
Glowna strona przestrzeni roboczej:
- Pasek tygodnia (Pn-Nd) z nazwami przypisanych projektow
- Aktywny dzien podswietlony (domyslnie dzisiejszy)
- Pod spodem: mini-dashboard wybranego dnia/projektu
- Jesli dzien nie ma przypisanego projektu: przycisk "Przypisz projekt" z selectem

### 2. `src/components/workspace/WorkspaceDayCard.tsx`
Karta dnia w pasku tygodnia:
- Nazwa dnia (Poniedzialek, Wtorek...)
- Nazwa projektu lub "Wolny dzien"
- Kolorowa kropka projektu
- Stan aktywny/nieaktywny

### 3. `src/components/workspace/WorkspaceDayDashboard.tsx`
Mini-dashboard dla wybranego dnia:
- Sekcja "Linki" - lista linkow z project_links + przycisk dodawania
- Sekcja "Tematy do omowienia" - komentarze od wspolpracownikow (project_comments bez task_id, lub z dedykowanym polem)
- Sekcja "Zadania" - lista zadan z danego projektu (useProjectTasks)
- Sekcja "Zespol" - czlonkowie projektu

### 4. `src/components/workspace/WorkspaceLinkManager.tsx`
Formularz dodawania/edycji/usuwania linkow:
- Tytul, URL, kategoria
- Ikony wg kategorii (Bot dla AI, FileText dla docs, Github dla repo)

### 5. `src/components/workspace/WorkspaceTopicsList.tsx`
Lista tematow do omowienia:
- Mozliwosc dodawania nowego tematu (jako project_comment bez task_id)
- Wyswietlanie kto dodal i kiedy
- Mozliwosc oznaczenia jako "omowiony"

### 6. `src/hooks/useWorkspace.ts`
Hook z CRUD dla workspace_schedule i project_links:
- `useWorkspaceSchedule()` - pobranie harmonogramu biezacego dyrektora
- `useAssignProjectToDay()` - przypisanie projektu do dnia
- `useRemoveProjectFromDay()` - usuniecie przypisania
- `useProjectLinks(projectId)` - pobranie linkow
- `useAddProjectLink()` - dodanie linku
- `useDeleteProjectLink()` - usuniecie linku
- `useProjectTopics(projectId)` - tematy (project_comments bez task_id)
- `useAddProjectTopic()` - dodanie tematu

## Zmiany w istniejacych plikach

### `src/App.tsx`
Dodanie routingu: `<Route path="/workspace" element={<DirectorGuard><Workspace /></DirectorGuard>} />`

### `src/components/layout/AppSidebar.tsx`
Dodanie pozycji "Workspace" w sekcji Overview:
```text
{ title: 'Workspace', url: '/workspace', icon: Briefcase }
```

## Przeplyw uzytkownika

1. Otwiera `/workspace` - widzi pasek 7 dni (Pn-Nd) biezacego tygodnia
2. Domyslnie podswietlony dzisiejszy dzien
3. Jesli dzien nie ma projektu - klika "Przypisz projekt" i wybiera z listy swoich projektow
4. Po przypisaniu widzi mini-dashboard: linki AI, tematy od wspolpracownikow, zadania, zespol
5. Moze dodawac linki (np. do Lovable, Cursor, Figma)
6. Wspolpracownicy moga dodawac tematy do omowienia przez ten sam widok lub przez strone projektu
7. Klika w inny dzien - przelacza sie na dashboard tego dnia/projektu
8. Moze nawigowac miedzy tygodniami (strzalki < >) lub wrocic do "dzisaj"
