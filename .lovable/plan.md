
# Dodanie tworzenia zadan i zakladki notatek w widoku Workspace

## 1. Dodanie mozliwosci tworzenia zadania

W komponencie `ProjectTasksList` (wewnatrz `WorkspaceTimeBlock.tsx`) -- dodanie przycisku "Dodaj zadanie" pod lista zadan, ktory uzywa `KanbanInlineCreate` lub wlasnej implementacji inline:

- Pod lista zadan (po petli `pending.map(...)`) dodanie przycisku `+ Dodaj zadanie`
- Po kliknieciu -- pole `Input` na tytul + przycisk "Dodaj"
- Uzywa `useCreateTask` z `project_id` ustawionym na aktualny projekt
- Domyslny status: `todo`, priorytet: `medium`
- Po dodaniu -- czysci formularz

## 2. Dodanie sekcji "Notatki"

Nowy komponent `WorkspaceNotes` obok istniejacych sekcji (Linki, Tematy, Zadania, Zespol):

- Uzywa hookow `useProjectNotes` i `useCreateProjectNote` z `useProjects.ts`
- Wyswietla liste notatek (autor, data, tresc) -- max 5 ostatnich
- Formularz inline (textarea + przycisk) do szybkiego dodania notatki
- Umieszczony w ukladzie grid -- dodam go pod sekcja "Tematy do omowienia" w lewej kolumnie

## 3. Zmiana ukladu grid

Obecny uklad to 3 kolumny:
- Lewa: Linki + Tematy
- Srodek: Zadania
- Prawa: Zespol

Nowy uklad -- 3 kolumny:
- Lewa: Linki + Tematy + **Notatki**
- Srodek: Zadania (z przyciskiem dodawania)
- Prawa: Zespol

## Zmiany w plikach

### `src/components/workspace/WorkspaceTimeBlock.tsx`
- W `ProjectTasksList`: dodanie stanu `isAdding`, pola input i logiki `useCreateTask` z `project_id`
- Nowy komponent `WorkspaceNotes` (wewnatrz pliku lub osobny) uzywajacy `useProjectNotes` / `useCreateProjectNote`
- Dodanie `WorkspaceNotes` do gridu w sekcji content

### Bez nowych tabel -- notatki juz istnieja w `project_notes`
