
# Wiele projektow w jednym dniu - bloki czasowe 8-12, 12-16, 16-20

## Koncept
Zamiast 1 projekt = 1 dzien, dzien mozna podzielic na maksymalnie 3 bloki czasowe:
- **Blok 1**: 8:00 - 12:00
- **Blok 2**: 12:00 - 16:00
- **Blok 3**: 16:00 - 20:00

Kazdy blok ma swoj wlasny mini-dashboard z linkami, zadaniami, tematami i zespolem.

## Zmiany w bazie danych

### Modyfikacja tabeli `workspace_schedule`
Dodanie kolumny `time_block` (integer 0-2) oznaczajacej blok czasowy:
- 0 = 8:00-12:00
- 1 = 12:00-16:00
- 2 = 16:00-20:00

Zmiana UNIQUE constraint z `(director_id, day_of_week)` na `(director_id, day_of_week, time_block)` - pozwoli to na max 3 projekty dziennie.

Domyslna wartosc `time_block = 0` zachowuje kompatybilnosc z istniejacymi danymi.

### Migracja SQL
```text
1. ALTER TABLE workspace_schedule ADD COLUMN time_block integer NOT NULL DEFAULT 0;
2. ALTER TABLE workspace_schedule ADD CHECK (time_block >= 0 AND time_block <= 2);
3. DROP stary UNIQUE constraint (director_id, day_of_week);
4. ADD nowy UNIQUE constraint (director_id, day_of_week, time_block);
```

## Zmiany w kodzie

### 1. `src/hooks/useWorkspace.ts`
- `useAssignProjectToDay` - dodanie parametru `timeBlock` do upsert
- `useRemoveProjectFromDay` - dodanie `timeBlock` do delete (usuwanie konkretnego bloku)
- Upsert `onConflict` zmieniony na `director_id,day_of_week,time_block`

### 2. `src/pages/Workspace.tsx`
- `scheduleMap` zmieniony z `Record<number, single>` na `Record<number, array>` - grupowanie wpisow po `day_of_week`
- `WorkspaceDayCard` otrzymuje liste projektow (do 3) zamiast jednego
- Sekcja dashboard renderuje bloki jeden pod drugim (zamiast jednego dashboardu)

### 3. `src/components/workspace/WorkspaceDayCard.tsx`
- Props zmienione: zamiast `projectName/projectColor` przyjmuje tablice `projects: {name, color}[]`
- Wyswietla do 3 kolorowych kropek z nazwami projektow
- Pokazuje liczbe przypisanych blokow (np. "2/3")

### 4. `src/components/workspace/WorkspaceDayDashboard.tsx`
- Calkowita przebudowa: zamiast jednego projektu, renderuje liste blokow
- Kazdy blok ma naglowek z godzinami (np. "8:00 - 12:00") i nazwa projektu
- Jesli blok jest pusty, pokazuje przycisk "Przypisz projekt" z selectem
- Bloki sa oddzielone separatorami
- Kazdy blok zawiera swoj wlasny mini-dashboard (linki, tematy, zadania, zespol)

### Nowy komponent: `WorkspaceTimeBlock.tsx`
Wyodrebniony komponent pojedynczego bloku czasowego:
- Naglowek: godziny + nazwa projektu + przycisk usuwania
- Tresc: grid z linkami, zadaniami, tematami, zespolem (identyczny jak dotychczasowy dashboard)
- Stan pusty: select projektu + przycisk "Przypisz"

## Uklad wizualny

```text
+--------------------------------------------------+
|  Workspace                         < Dzis >      |
+--------------------------------------------------+
| [Pon 10] [Wt 11] [Sr 12*] [Czw 13] ...          |
|  Proj A   Proj B   Proj C   Wolny                |
|           Proj D   Proj E                        |
+--------------------------------------------------+
|                                                   |
|  -- 8:00 - 12:00 -- Projekt C ------ [X]         |
|  [Linki] [Tematy] [Zadania] [Zespol]              |
|                                                   |
|  ─────────────────────────────────────            |
|                                                   |
|  -- 12:00 - 16:00 -- Projekt E ----- [X]         |
|  [Linki] [Tematy] [Zadania] [Zespol]              |
|                                                   |
|  ─────────────────────────────────────            |
|                                                   |
|  -- 16:00 - 20:00 --                             |
|  [Wybierz projekt...] [Przypisz]                  |
|                                                   |
+--------------------------------------------------+
```

## Szczegoly techniczne

Stale blokow czasowych:
```text
TIME_BLOCKS = [
  { id: 0, label: '8:00 - 12:00', shortLabel: '8-12' },
  { id: 1, label: '12:00 - 16:00', shortLabel: '12-16' },
  { id: 2, label: '16:00 - 20:00', shortLabel: '16-20' },
]
```

Istniejace dane (time_block = 0 domyslnie) beda automatycznie przypisane do bloku 8:00-12:00, wiec nie trzeba migracji danych.
