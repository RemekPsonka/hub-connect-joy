

# Interaktywny efekt karuzeli na kolumnach Kanban + tryb fokusowy

## Cel
Dodanie dwoch interakcji do wszystkich widokow Kanban:
1. **Hover**: najechanie na kolumne powoduje jej powiekszenie (efekt karuzeli) -- sasiednie kolumny sie kurcza
2. **Klikniecie**: otwiera pelnoekranowy widok pojedynczego etapu z mozliwoscia pracy na nim

## Podejscie techniczne

### Efekt karuzeli (hover)

Zamiana siatki `grid` na `flex` z plynnym przejsciem `flex-grow`:
- Domyslnie kazda kolumna ma `flex: 1`
- Po najechaniu: hovered kolumna dostaje `flex: 3`, pozostale zostaja `flex: 1`
- Animacja przez CSS `transition: flex 0.3s ease`
- Efekt dziala na calym kontenerze (rodzic reaguje na hover dziecka)

### Tryb fokusowy (klikniecie naglowka)

Po kliknieciu naglowka kolumny:
- Caly Kanban zastepowany jest widokiem jednej kolumny na pelna szerokosc
- Przycisk "Wroc" do powrotu do widoku wszystkich kolumn
- Pelna funkcjonalnosc (drag & drop, dodawanie, edycja) zachowana

W lejku sprzedazy (deals-team) ta funkcja juz istnieje dla niektorych kolumn (drillDownCategory + SubKanbanView). Rozszerze to na wszystkie kolumny ktore nie maja sub-kanbana -- pokaza sie w prostym trybie fokusowym (lista kart na pelna szerokosc).

## Pliki do zmiany

### 1. `src/components/deals-team/KanbanColumn.tsx`
- Dodac prop `isHovered` i odpowiednie klasy CSS dla rozszerzenia
- Dodac `onMouseEnter` / `onMouseLeave` do kontenera
- Zmiana kontenera z sztywnych wymiarow na flex-grow

### 2. `src/components/deals-team/KanbanBoard.tsx`
- Dodac state `hoveredColumn` (string | null)
- Zamienic grid na flex z `transition-all`
- Przekazac `isHovered` do kazdej kolumny
- Rozszerzyc obsluge klikniecia naglowka -- kolumny bez sub-kanbana otwieraja prosty tryb fokusowy (pelna szerokosc, lista kart, przycisk wroc)

### 3. `src/components/tasks/TasksKanban.tsx`
- Dodac state `hoveredColumn` i `focusedColumn`
- Zamienic grid na flex z efektem karuzeli
- Po kliknieciu naglowka: tryb fokusowy (jedna kolumna na pelna szerokosc)
- Przycisk "Wroc do wszystkich" w trybie fokusowym

### 4. `src/components/deals/KanbanColumn.tsx` + `DealsKanban.tsx`
- Analogiczne zmiany: hover expand + klikniecie naglowka = tryb fokusowy
- Dostosowanie do istniejacego dnd-kit (ScrollArea + flex)

### 5. `tailwind.config.ts` (opcjonalnie)
- Jesli potrzebna animacja `animate-card-drop` nie istnieje, dodam ja

## Szczegoly implementacji

### CSS efekt karuzeli (hover)
```
// Kontener
<div className="flex gap-4 transition-all">

// Kolumna
<div className={cn(
  "flex-1 min-w-0 transition-all duration-300 ease-in-out",
  isHovered && "flex-[3]",
  someOtherIsHovered && !isHovered && "flex-[0.7] opacity-80"
)}>
```

### Tryb fokusowy (prosty, bez sub-kanbana)
Dla kolumn ktore nie maja dedykowanego sub-kanbana, tryb fokusowy to po prostu:
- Naglowek kolumny z przyciskiem "Wroc"
- Karty wyswietlone w siatce 2-3 kolumnowej zamiast jednej waskiej kolumny
- Zachowanie drag & drop i wszystkich akcji

