

# Wyswietlanie kontaktow w zadaniach + ujednolicenie komponentow

## Problem
1. Na wszystkich listach zadan widac "Umowic spotkanie" bez informacji z KIM - brak nazwy kontaktu
2. `ProjectTasksTab.tsx` i `MyDay.tsx` uzywaja starego `TaskRow` zamiast `UnifiedTaskRow`
3. `MyDay.tsx` nie otwiera `TaskDetailSheet` po kliknieciu - brak panelu szczegolowego

## Zmiany

### 1. UnifiedTaskRow - dodanie wyswietlania kontaktu

Rozszerzenie props o `contactName?: string` i wyswietlenie go obok tytulu:

```text
Przed:  O Umowic spotkanie                    17 lut ●
Po:     O Umowic spotkanie - Kowalski Krzyszt. 17 lut ●
```

Kontakt wyswietlany jako szary tekst po myslniku, obcinany jesli za dlugi. W trybie compact - jeszcze bardziej skrocony.

### 2. Wszystkie miejsca uzywajace UnifiedTaskRow - przekazanie contactName

Pliki do aktualizacji:
- `src/components/tasks/TasksList.tsx` - dodanie `contactName` z `task.task_contacts[0]?.contacts?.full_name`
- `src/components/tasks/TasksTeamView.tsx` - jw.
- `src/components/tasks/TasksKanban.tsx` - juz wyswietla kontakt, ale dodamy tez do tytulu karty
- `src/components/contacts/ContactTasksPanel.tsx` - tu kontakt jest znany, nie trzeba dodawac
- `src/components/deals-team/DealContactDetailSheet.tsx` - jw., kontakt juz znany z kontekstu
- `src/components/deals-team/MyTeamTasksView.tsx` - dodanie `contactName`

### 3. ProjectTasksTab - zamiana starego TaskRow na UnifiedTaskRow

Plik: `src/components/projects/ProjectTasksTab.tsx`

Usunac lokalny komponent `TaskRow` (linie 42-115) i zamienic na `UnifiedTaskRow` z obsluga przenoszenia miedzy sekcjami w menu kontekstowym. Zachowac DnD (SortableTaskItem juz istnieje).

### 4. MyDay - zamiana starego TaskRow na UnifiedTaskRow + dodanie TaskDetailSheet

Plik: `src/pages/MyDay.tsx`

- Usunac lokalny `TaskRow` (linie 40-89)
- Uzyc `UnifiedTaskRow` z `contactName` i `compact`
- Dodac stan `selectedTask` + `isDetailOpen`
- Dodac `TaskDetailSheet` na dole komponentu (obok istniejacego `TaskModal`)
- Klikniecie w zadanie otwiera TaskDetailSheet

### 5. Podsumowanie plikow do edycji

| Plik | Zmiana |
|---|---|
| `src/components/tasks/UnifiedTaskRow.tsx` | Nowy prop `contactName`, wyswietlanie obok tytulu |
| `src/components/tasks/TasksList.tsx` | Przekazanie `contactName` |
| `src/components/tasks/TasksTeamView.tsx` | Przekazanie `contactName` |
| `src/components/deals-team/MyTeamTasksView.tsx` | Przekazanie `contactName` |
| `src/components/projects/ProjectTasksTab.tsx` | Zamiana starego TaskRow na UnifiedTaskRow |
| `src/pages/MyDay.tsx` | Zamiana starego TaskRow na UnifiedTaskRow + dodanie TaskDetailSheet |

Brak zmian w bazie danych - dane kontaktow juz sa pobierane w hookach.
