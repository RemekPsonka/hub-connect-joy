

# Fix: Zadania ze statusu nie widoczne na karcie kontaktu

## Problem

Formularz statusu tygodniowego (WeeklyStatusForm) tworzy zadania w starej tabeli `deal_team_assignments`, natomiast karta kontaktu (DealContactDetailSheet) odczytuje zadania z tabeli `tasks` przez hook `useContactTasksWithCross`. To sa dwie rozne tabele -- zadania utworzone z formularza statusu nigdy nie pojawiaja sie w sekcji "ZADANIA" na karcie.

## Rozwiazanie

Zmienic WeeklyStatusForm tak, aby tworzyl zadania w tabeli `tasks` (z powiazaniem przez `task_contacts`), zamiast w `deal_team_assignments`. Dzieki temu zadania beda widoczne zarowno na karcie kontaktu, jak i w globalnym systemie zadan.

## Szczegoly techniczne

### Plik: `src/components/deals-team/WeeklyStatusForm.tsx`

Zamienic blok tworzenia zadania (linie 176-203) z:
```
await supabase.from('deal_team_assignments').insert({...})
```
na logike tworzaca zadanie w tabeli `tasks` + powiazanie w `task_contacts`:

1. Wstawic do `tasks`:
   - `title`: tytul zadania
   - `tenant_id`: z danych directora
   - `owner_id`: director.id (tworca statusu)
   - `assigned_to`: taskAssignedTo (wybrany czlonek zespolu)
   - `due_date`: taskDueDate
   - `status`: 'todo'
   - `priority`: 'medium'

2. Wstawic do `task_contacts`:
   - `task_id`: id nowo utworzonego zadania
   - `contact_id`: contact_id kontaktu (potrzebne przekazanie do komponentu)
   - `role`: 'primary'

3. Po sukcesie: `invalidateQueries(['contact-tasks-with-cross', contactId])` aby odswiezyc liste zadan na karcie

### Plik: `src/components/deals-team/WeeklyStatusForm.tsx` (props)

Dodac nowy prop `contactId: string` (contact_id z deal_team_contacts) aby moc utworzyc powiazanie w `task_contacts`.

### Pliki wywolujace WeeklyStatusForm

Sprawdzic i zaktualizowac wszystkie miejsca, ktore renderuja `<WeeklyStatusForm>`, aby przekazywaly `contactId`:
- `DealContactDetailSheet.tsx` -- przekazac `contact.contact_id`
- `WeeklyStatusPanel.tsx` -- przekazac contact_id z danych kontaktu

### Invalidacja cache

Po utworzeniu zadania wywolac `queryClient.invalidateQueries` z kluczem `['contact-tasks-with-cross', contactId]` zeby lista zadan odswiezyla sie natychmiast.

### Zmieniane pliki

| Plik | Zmiana |
|------|--------|
| `src/components/deals-team/WeeklyStatusForm.tsx` | Zmiana insert z `deal_team_assignments` na `tasks` + `task_contacts`, dodanie prop `contactId` |
| `src/components/deals-team/DealContactDetailSheet.tsx` | Przekazanie `contactId` do WeeklyStatusForm |
| `src/components/deals-team/WeeklyStatusPanel.tsx` | Przekazanie `contactId` do WeeklyStatusForm |

