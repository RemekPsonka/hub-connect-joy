
# Rozbudowa widoku zadan - Kanban + Widok Zespolu

## Analiza obecnego stanu

Obecny widok zadan (`/tasks`) posiada 4 tryby: Lista, Tabela, Kanban, Kalendarz.

**Problemy z obecnym Kanbanem (`TasksKanban.tsx`):**
- Uzywa starych statusow (`pending`) zamiast zunifikowanych (`todo`, `in_progress`, `completed`, `cancelled`)
- Brak informacji o osobie odpowiedzialnej, projekcie, subtaskach
- Karty sa ubogie - tylko tytul, priorytet, typ, termin, kontakt
- Brak mozliwosci inline create wg zunifikowanego wzorca

**Brak widoku zespolowego** - nie ma sposobu na szybkie sprawdzenie obciazenia kazdego czlonka zespolu.

## Plan zmian

### 1. Przebudowa `TasksKanban.tsx` - styl ClickUp Board

Kolumny oparte na zunifikowanych statusach:

```text
| DO ZROBIENIA (12)  | W TRAKCIE (5)      | ZAKONCZONE (8)     | ANULOWANE (1)      |
|--------------------|--------------------|--------------------|--------------------|
| [Projekt > Sekcja] | [Projekt > Sekcja] |                    |                    |
| Tytul zadania      | Tytul zadania      |                    |                    |
| [*] Wysoki 12 mar  | [*] Sredni         |                    |                    |
| [AK] 2/5 subtaskow | [RW]               |                    |                    |
| + ADD SUBTASK      | + ADD SUBTASK      |                    |                    |
|                    |                    |                    |                    |
| Tytul zadania 2    |                    |                    |                    |
| [*] Niski  15 mar  |                    |                    |                    |
| + ADD SUBTASK      |                    |                    |                    |
|                    |                    |                    |                    |
| [+ Dodaj zadanie]  | [+ Dodaj zadanie]  | [+ Dodaj zadanie]  |                    |
```

Kazda karta zawiera:
- Sciezke projektu (jesli przypisany): `Projekt > Sekcja` w malym naglowku
- Tytul zadania (pogrubiony)
- Priorytet (kolorowa kropka) + termin (czerwony jesli przeterminowany)
- Avatar osoby odpowiedzialnej (inicjaly) + wskaznik subtaskow (np. `2/5`)
- Link "+ ADD SUBTASK" (opcjonalny, hover)
- Kontakty powiazane (jesli sa)
- Drag & drop miedzy kolumnami (zachowany z obecnej implementacji)

### 2. Nowy widok: Zespol (Team/Box view)

Widok inspirowany ClickUp Box - kafelki per czlonek zespolu z podsumowaniem:

```text
| Nieprzypisane  [+] | Pawel Kowalski [+] | Remek Nowak    [+] | Adam Wisniew.  [+] |
|    8       2       |    5       1       |    3       0       |    7       2       |
| Not done   Done    | Not done   Done    | Not done   Done    | Not done   Done    |
| =============== 20%| =============== 17%| ===============  0%| =============== 22%|
|                    |                    |                    |                    |
| > DO ZROBIENIA (5) | > W TRAKCIE (3)    | > DO ZROBIENIA (2) | > W TRAKCIE (4)    |
| > W TRAKCIE (3)    | > DO ZROBIENIA (2) | > W TRAKCIE (1)    | > DO ZROBIENIA (3) |
| > ZAKONCZONE (2)   | > ZAKONCZONE (1)   |                    | > ZAKONCZONE (2)   |
```

Kazdy kafelek zawiera:
- Naglowek: avatar + imie + przycisk [+] (dodaj zadanie)
- Statystyki: "Not done" / "Done" + mini donut chart (procent ukonczonych)
- Pasek postepu (kolorowy gradient)
- Zwijanme grupy wg statusu z liczba zadan
- Po rozwinieciu grupy - lista zadan w stylu `UnifiedTaskRow` compact

### 3. Aktualizacja `TasksHeader.tsx`

Dodanie nowej ikony widoku "Zespol" (ikona `Users`) do ToggleGroup:
- Lista | Tabela | Kanban | Zespol | Kalendarz

Typ widoku rozszerzony o `'team'`.

### 4. Aktualizacja `Tasks.tsx` (strona glowna)

Dodanie warunku renderowania nowego widoku `TasksTeamView` gdy `view === 'team'`.

## Szczegoly techniczne

### Pliki do utworzenia:
| Plik | Opis |
|---|---|
| `src/components/tasks/TasksTeamView.tsx` | NOWY - widok zespolowy (Box view) |

### Pliki do edycji:
| Plik | Opis |
|---|---|
| `src/components/tasks/TasksKanban.tsx` | Przebudowa kart, statusy `todo`/`in_progress`/`completed`/`cancelled`, dodanie projektu, avatara, subtaskow |
| `src/components/tasks/TasksHeader.tsx` | Dodanie ikony widoku "Zespol" do ToggleGroup |
| `src/pages/Tasks.tsx` | Dodanie obslugi `view === 'team'` + import TasksTeamView |

### Dane do widoku zespolowego
Hook `useTasks` juz zwraca `assigned_to` oraz `assignee` (join do `directors`). Wystarczy pogrupowac zadania po `assigned_to`. Lista czlonkow zespolu - uzycie istniejacego selecta z `directors` (kolega `owner` i `assignee` sa juz joinowane w zapytaniu `useTasks`).

### Brak zmian w bazie danych
Wszystkie potrzebne pola (`assigned_to`, `status`, `priority`, `project_id`) juz istnieja. Nie sa potrzebne migracje.

### Podsumowanie
- **TasksKanban** - przebudowa kart na bogatsze (projekt, avatar, subtaski, zunifikowane statusy)
- **TasksTeamView** - nowy widok "Box" z kafelkami per osoba i statystykami
- **TasksHeader** + **Tasks.tsx** - dodanie nowego widoku do przelacznika
