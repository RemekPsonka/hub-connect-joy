
# Otwarcie szczegółów zadania z karty kontaktu

## Problem
Na panelu "Zadania" w widoku szczegółów kontaktu (prawa kolumna) kliknięcie na zadanie nie otwiera żadnego okna. Brakuje integracji z komponentem `TaskDetailSheet`, który jest już używany na stronach Zadania, Moje Zadania i w projekcie.

## Rozwiązanie
Dodanie stanu `selectedTask` i komponentu `TaskDetailSheet` do `ContactTasksPanel.tsx`, analogicznie jak w innych widokach.

## Szczegoly techniczne

### Plik: `src/components/contacts/ContactTasksPanel.tsx`

1. Import `TaskDetailSheet` z `@/components/tasks/TaskDetailSheet`
2. Import `TaskModal` (juz jest) -- dodanie stanu `editingTask` do obslugi edycji z poziomu detail sheet
3. Nowe stany:
   - `selectedTask` -- zadanie klikniete do podgladu
   - `isDetailOpen` -- czy sheet jest otwarty
4. Kazdy wiersz zadania (zarowno otwarte jak i zamkniete) otrzyma `onClick` -> ustawia `selectedTask` i `isDetailOpen = true`
5. Na dole komponentu -- renderowanie `TaskDetailSheet` z propami:
   - `open={isDetailOpen}`
   - `onOpenChange={setIsDetailOpen}`
   - `task={selectedTask}`
   - `onEdit` -> otwiera `TaskModal` w trybie edycji
6. Kursor `cursor-pointer` na wierszach zadan

Zmiana dotyczy tylko jednego pliku. Brak zmian w bazie danych.
