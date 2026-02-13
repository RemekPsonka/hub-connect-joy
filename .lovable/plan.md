

# Dodanie sekcji zadania w ProspectingConvertDialog

## Co sie zmieni

W dialogu konwersji prospekta (`ProspectingConvertDialog.tsx`) zostanie dodana nowa sekcja **"Pierwsze zadanie"** pod kategoria Kanban, identyczna logicznie z ta dodana w `WeeklyStatusForm`.

## Nowa sekcja w dialogu

```text
+-----------------------------------------------+
| Pierwsze zadanie                    [x] Dodaj  |
+-----------------------------------------------+
| Zadanie:  [Umowic spotkanie       v]           |
| Przypisz: [Wybierz osobe...       v]           |
| Termin:   [__ / __ / ____]                     |
| Uwagi:    [________________________]           |
+-----------------------------------------------+
```

### Elementy:
1. **Checkbox "Dodaj zadanie"** -- domyslnie wlaczony
2. **Tytul zadania** -- Select z opcjami: "Umowic spotkanie" (domyslne), "Zadzwonic", "Wyslac oferte", "Przygotowac audyt", "Inne..." (pokazuje Input)
3. **Przypisz do** -- Select z czlonkami zespolu (z `useTeamMembers(effectiveTeamId)`)
4. **Termin** -- input type="date"
5. **Uwagi** -- Textarea (2 linie, opcjonalne)

### Logika po kliknieciu "Konwertuj":
- Proces konwersji dziala jak dotychczas
- Po uzyskaniu `teamContactId`, jesli checkbox wlaczony i jest tytul + przypisana osoba:
  - Wywolanie `useCreateAssignment` z danymi zadania
- Jesli sekcja pusta/wylaczona -- pomijamy

## Szczegoly techniczne

### Zmieniane pliki

| Plik | Zmiana |
|------|--------|
| `src/components/deals-team/ProspectingConvertDialog.tsx` | Dodanie sekcji zadania z przypisaniem, uwagami i domyslnymi opcjami |

### Nowe importy
- `useTeamMembers` z `@/hooks/useDealsTeamMembers`
- `useCreateAssignment` z `@/hooks/useDealsTeamAssignments`
- `Checkbox` z `@/components/ui/checkbox`
- `Textarea` z `@/components/ui/textarea`
- `ClipboardList` ikona z `lucide-react`

### Nowe stany
- `createTask` (boolean, domyslnie `true`)
- `taskTitle` (string, domyslnie `'Umówić spotkanie'`)
- `customTaskTitle` (string, pusty)
- `taskAssignedTo` (string, pusty)
- `taskDueDate` (string, pusty)
- `taskNotes` (string, pusty)

### Zmiana w handleConvert
Po uzyskaniu `teamContactId`, dodanie bloku:

```text
if (createTask && finalTaskTitle && taskAssignedTo) {
  await createAssignment.mutateAsync({
    teamContactId,
    teamId: effectiveTeamId,
    assignedTo: taskAssignedTo,
    title: finalTaskTitle,
    description: taskNotes || undefined,
    dueDate: taskDueDate || undefined,
    priority: 'medium',
  });
}
```

### Predefiniowane opcje zadan
- "Umówić spotkanie"
- "Zadzwonić"
- "Wysłać ofertę"
- "Przygotować audyt"
- "Inne..." (otwiera pole tekstowe)

### Zero migracji SQL
Hook `useCreateAssignment` i tabela `deal_team_assignments` juz istnieja.
