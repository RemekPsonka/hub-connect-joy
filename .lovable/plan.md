

# Dodanie edycji, zmiany statusu i szczegolowego zarzadzania zadaniami w widoku "Zadania"

## Obecny stan
Widok "Zadania" w zakladce Deals (`MyTeamTasksView`) wyswietla zadania pogrupowane po kontaktach, ale jedyna interakcja to checkbox (toggle done/pending). Brak mozliwosci:
- Edycji tytulu, opisu, priorytetu, terminu
- Zmiany statusu na posredni (np. "W trakcie")
- Przypisania do innego czlonka zespolu
- Otwarcia szczegolow zadania

## Rozwiazanie
Dodanie interaktywnego menu kontekstowego i dialogu edycji do kazdego zadania w liscie.

### 1. Menu kontekstowe na kazdym zadaniu

Po kliknieciu na wiersz zadania (lub ikone "...") pojawi sie `DropdownMenu` z opcjami:
- **Status**: Zmiana miedzy "Do zrobienia", "W trakcie", "Zrobione"
- **Priorytet**: Zmiana miedzy "Niski", "Sredni", "Wysoki", "Pilny"
- **Przypisz do**: Lista czlonkow zespolu
- **Edytuj**: Otwiera dialog edycji (tytul, opis, termin)

### 2. Inline status change

Klikniecie na ikone statusu (Circle/Clock/CheckCircle2) obok checkboxa przelacza cyklicznie: pending -> in_progress -> done -> pending.

### 3. Dialog edycji zadania

Prosty dialog (`Dialog`) z polami:
- Tytul (Input)
- Opis (Textarea)
- Priorytet (Select)
- Termin (DatePicker)
- Status (Select)
- Przypisany do (Select z czlonkami zespolu)

Zapisywanie przez istniejacy `useUpdateAssignment` hook.

## Szczegoly techniczne

| Plik | Zmiana |
|------|--------|
| `src/components/deals-team/MyTeamTasksView.tsx` | (1) Dodanie DropdownMenu z opcjami statusu, priorytetu, przypisania. (2) Dodanie stanu `editingTask` i dialogu edycji z formularzem. (3) Rozszerzenie `handleToggle` o cykliczne przelaczanie statusow. (4) Invalidacja kluczy `deal-team-assignments-all` po edycji. |

### Interakcje uzytkownika

- **Klikniecie ikony statusu**: Cykliczna zmiana pending -> in_progress -> done
- **Klikniecie tytulu lub ikony "..."**: Otwiera dropdown z akcjami
- **"Edytuj" z dropdown**: Otwiera dialog z pelnym formularzem edycji
- **Zmiana priorytetu/przypisania z dropdown**: Natychmiastowa aktualizacja

### Nowe importy w MyTeamTasksView

```text
DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent
Dialog, DialogContent, DialogHeader, DialogTitle
Input, Textarea, Select
MoreHorizontal, Edit, ArrowRight icons
```

Wszystkie komponenty juz istnieja w projekcie (shadcn/ui), wiec nie ma potrzeby instalacji nowych zaleznosci.

