
# Przebudowa widoku Zadania w stylu Asana/ClickUp

## Zakres zmian

Widok `MyTeamTasksView` (zakladka "Zadania" w /deals-team) zostanie przebudowany z prostej listy grupowanej po kontaktach na pelny menedzer zadan z funkcjami wzorowanymi na Asana/ClickUp.

## Co zostanie dodane/zmienione

### 1. Nowy uklad widoku zadania
- Toolbar z przyciskiem "+ Nowe zadanie" (widoczny, kolorowy, nie ukryty)
- Przelacznik widokow: Lista / Kanban / Tabela (reuse istniejacych komponentow)
- Filtrowanie po statusie, priorytecie, osobie przypisanej, terminie
- Wyszukiwarka zadan

### 2. Rozbudowane karty zadan na liscie
- Inline edycja tytulu (kliknij aby edytowac, Enter aby zapisac)
- Klikalne badge statusu i priorytetu (zmiana jednym kliknieciem)
- Widoczny termin z kolorowym oznaczeniem (czerwony = po terminie, zolty = dzis)
- Informacja o subtaskach z paskiem postepu (np. "2/5")
- Ikona komentarzy z liczba
- Przypisana osoba (avatar)

### 3. Panel szczegolowy zadania (Sheet z prawej strony)
- Otwarcie przez klikniecie na zadanie
- Pelna edycja inline: tytul, opis, status, priorytet, termin, przypisanie
- Sekcja subtaskow: dodawanie, oznaczanie, drag-and-drop, usuwanie
- Komentarze
- Historia aktywnosci
- Przycisk "Utworz podzadanie" bezposrednio widoczny
- Przycisk usuwania zadania

### 4. Tworzenie nowych zadan
- Przycisk "+ Nowe zadanie" zawsze widoczny w toolbarze
- Inline create na dole listy (jak w Asanie - wpisz tytul i Enter)
- Nowe zadanie automatycznie przypisane do biezacego kontekstu (team, kontakt)

### 5. Drag and drop
- Przenoszenie zadan miedzy grupami kontaktow
- Zmiana kolejnosci wewnatrz grupy

## Szczegoly techniczne

### Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/deals-team/MyTeamTasksView.tsx` | **Pelna przebudowa** - nowy layout z toolbarem, rozbudowanymi kartami zadan, inline edycja, panel szczegolowy (TaskDetailSheet), inline create, drag-and-drop |

### Pliki do ponownego uzycia (bez zmian)
- `TaskDetailSheet.tsx` - panel szczegolowy z subtaskami, komentarzami, activity log
- `TaskModal.tsx` - modal tworzenia/edycji
- `TaskStatusBadge.tsx`, `TaskPriorityBadge.tsx` - badge statusu/priorytetu
- `SortableTaskItem.tsx` - drag-and-drop wrapper
- `useDealsTeamAssignments.ts` - hook do danych

### Kluczowe decyzje architektoniczne
- Reuse istniejacych komponentow (`TaskDetailSheet`, `TaskModal`, badge) zamiast tworzenia nowych
- Otwarcie `TaskDetailSheet` po kliknieciu zadania (pelne szczegoly z subtaskami, komentarzami, historia)
- Inline create na dole kazdej grupy kontaktow (szybkie dodawanie bez modala)
- Status cycling przez klikniecie ikony statusu (juz istnieje, zostanie zachowane)
- Priorytet zmieniany przez klikniecie badge (dropdown z opcjami)

### Nowe elementy UI w MyTeamTasksView
```text
+--------------------------------------------------+
| [+ Nowe zadanie]  [Filtr statusu] [Szukaj...]    |
| [Wszyscy] [Moje] [Adam] [Remigiusz] [Pawel]      |
| [Zakonczone] [Przeterminowane: 3]    12 zadan     |
+--------------------------------------------------+
|                                                   |
| Artur Paluch · WESTA INVESTMENTS           [1]    |
| +------------------------------------------------+|
| | O  Umowic spotkanie                        ... ||
| |    17 lut  [Sredni]  [Do zrobienia]  [2/3] RP  ||
| +------------------------------------------------+|
| | O  Wyslac oferte                           ... ||
| |    20 lut  [Wysoki]  [W trakcie]           RP  ||
| +------------------------------------------------+|
| | [+ Dodaj zadanie...]                           ||
| +------------------------------------------------+|
|                                                   |
| Marcin Raczek                              [2]    |
| +------------------------------------------------+|
| | ...                                            ||
+--------------------------------------------------+
```

### Zmiana w hook'u danych
- `useMyTeamAssignments` zostanie rozszerzony o pobieranie subtaskow (`parent_task_id`) i liczby komentarzy, aby karty zadan mogly wyswietlac te informacje
