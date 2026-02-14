
# Usuniecie DealContactDetailSheet i zastapienie go panelem zadan kontaktu

## Problem
Klikniecie karty kontaktu w Kanbanie otwiera stary widok szczegolow kontaktu (`DealContactDetailSheet` - wycentrowany Dialog z kategoria, notatkami, briefem AI, statusami tygodniowymi). Uzytkownik chce uzyc wylacznie widoku w stylu Asana (`TaskDetailSheet`).

## Rozwiazanie
Zastapic `DealContactDetailSheet` nowym lekkim panelem bocznym (`ContactTasksSheet`) w stylu Asana, ktory:
- Wyswietla nazwe kontaktu i firme w naglowku
- Pokazuje liste zadan kontaktu uzywajac `UnifiedTaskRow`
- Klikniecie zadania otwiera `TaskDetailSheet` (panel boczny Asana)
- Umozliwia dodanie nowego zadania
- Nie zawiera: kategorii, notatek, briefu AI, statusow tygodniowych, historii aktywnosci

## Zmiany w plikach

### 1. Nowy komponent: `src/components/deals-team/ContactTasksSheet.tsx`
Lekki panel boczny (Sheet) z:
- Naglowek: nazwa kontaktu, firma, link do CRM
- Lista zadan (otwarte) z `UnifiedTaskRow` + cykliczna zmiana statusu
- Sekcja zadan zamknietych (collapsible)
- Przycisk "+ Nowe zadanie" otwierajacy `TaskModal`
- Callback `onTaskOpen` do otwierania `TaskDetailSheet` w rodzicu

### 2. `src/components/deals-team/KanbanBoard.tsx`
- Zamienic import `DealContactDetailSheet` na `ContactTasksSheet`
- Zamienic `<DealContactDetailSheet>` na `<ContactTasksSheet>`
- Przekazac `onTaskOpen` callback (juz istnieje)
- Stan `selectedContact`, `taskForDetail`, `taskDetailOpen`, `taskEditOpen` - bez zmian

### 3. `src/components/deals-team/ClientsTab.tsx`
- Analogicznie: zamienic `DealContactDetailSheet` na `ContactTasksSheet`

### 4. `src/components/deals-team/SnoozedContactsBar.tsx`
- Uzywa `onContactClick` - callback do rodzica (KanbanBoard). Bez zmian - nadal otwiera `ContactTasksSheet`.

### 5. Usuniecie `src/components/deals-team/DealContactDetailSheet.tsx`
- Usunac plik calkowicie
- Usunac eksport z `src/components/deals-team/index.ts`

## Szczegoly techniczne

Nowy `ContactTasksSheet` bedzie uzywal:
- `Sheet` z Radix (boczny panel jak TaskDetailSheet) zamiast `Dialog` (wycentrowany modal)
- `useDealContactAllTasks` do pobierania zadan kontaktu (z pelnym joinem - juz naprawiony)
- `UnifiedTaskRow` do wyswietlania zadan
- `TaskModal` do tworzenia nowych zadan (wewnatrz komponentu)
- Callback `onTaskOpen(task)` + zamkniecie panelu, aby rodzic mogl otworzyc `TaskDetailSheet`

Przeplyw po zmianie:
1. Klik kontaktu w Kanban -> otwiera sie boczny panel z lista zadan
2. Klik zadania -> panel sie zamyka -> otwiera sie TaskDetailSheet (Asana)
3. Zamkniecie TaskDetailSheet -> powrot do Kanban
