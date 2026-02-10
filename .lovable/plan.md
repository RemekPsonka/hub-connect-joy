

# Panel szczegolowy kontaktu na Kanban -- usuwanie, statusy, notatki, zadania

## Opis
Po kliknieciu karty kontaktu na Kanban otwiera sie panel boczny (Sheet) z pelnym widokiem kontaktu: statusy, notatki, historia aktywnosci, cotygodniowe statusy, powiazane zadania CRM, oraz opcje usuwania.

## Nowy komponent: `DealContactDetailSheet`

Panel boczny (Sheet) wyswietlajacy:

### Sekcja 1: Naglowek
- Nazwa kontaktu, firma, kategoria (HOT/TOP/LEAD)
- Badge statusu (Aktywny, Wstrzymany, Wygrany, Przegrany)
- Link do pelnego profilu kontaktu w CRM

### Sekcja 2: Zmiana statusu
- Przyciski/dropdown do zmiany statusu: Active, On Hold, Won, Lost, Disqualified
- Wykorzystuje istniejacy hook `useChangeContactStatus`

### Sekcja 3: Notatki
- Pole tekstowe z auto-zapisem (debounce) -- wzorowane na `ContactNotesTab`
- Zapisywane w `deal_team_contacts.notes`

### Sekcja 4: Cotygodniowy status
- Przycisk "Dodaj status tygodniowy" otwierajacy istniejacy `WeeklyStatusForm`
- Lista ostatnich 5 statusow tygodniowych (z `deal_team_weekly_statuses`)
- Wskaznik czy status jest aktualny / przeterminowany

### Sekcja 5: Zadania CRM
- Lista zadan powiazanych z tym kontaktem (przez `task_contacts` -- kontakt CRM)
- Mozliwosc dodania nowego zadania (otwiera `TaskModal` z preselected contact)
- Checkbox do oznaczania wykonania
- Wzorowane na `ContactTasksPanel`

### Sekcja 6: Historia aktywnosci
- Chronologiczna lista z `deal_team_activity_log` filtrowana po `team_contact_id`
- Zmiany kategorii, statusow, dodane notatki, statusy tygodniowe
- Nowy hook: `useContactActivityLog(teamContactId)`

### Sekcja 7: Akcje
- Przycisk "Usun z zespolu" (z potwierdzeniem) -- wykorzystuje `useRemoveContactFromTeam`

## Modyfikacje istniejacych komponentow

Karty Kanban (`HotLeadCard`, `TopLeadCard`, `LeadCard`) -- dodanie `onClick` otwierajacego `DealContactDetailSheet` zamiast (lub obok) linka do profilu CRM.

## Nowy hook: `useContactActivityLog`

```text
useContactActivityLog(teamContactId: string)
  -> SELECT * FROM deal_team_activity_log 
     WHERE team_contact_id = teamContactId
     ORDER BY created_at DESC LIMIT 50
```

## Nowy hook: `useTeamContactWeeklyStatuses`

```text
useTeamContactWeeklyStatuses(teamContactId: string)
  -> SELECT * FROM deal_team_weekly_statuses
     WHERE team_contact_id = teamContactId
     ORDER BY created_at DESC LIMIT 10
```

## Pliki do utworzenia / modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/deals-team/DealContactDetailSheet.tsx` | **NOWY** -- panel boczny z sekcjami |
| `src/hooks/useContactActivityLog.ts` | **NOWY** -- pobieranie logu aktywnosci |
| `src/hooks/useTeamContactWeeklyStatuses.ts` | **NOWY** -- pobieranie statusow tygodniowych per kontakt |
| `src/components/deals-team/HotLeadCard.tsx` | Dodanie onClick -> otwiera detail sheet |
| `src/components/deals-team/TopLeadCard.tsx` | Dodanie onClick -> otwiera detail sheet |
| `src/components/deals-team/LeadCard.tsx` | Dodanie onClick -> otwiera detail sheet |
| `src/components/deals-team/KanbanBoard.tsx` | State dla wybranego kontaktu, renderowanie DealContactDetailSheet |

## Brak zmian w bazie danych
Wszystkie potrzebne tabele i kolumny juz istnieja:
- `deal_team_contacts.notes` -- notatki
- `deal_team_activity_log` -- historia
- `deal_team_weekly_statuses` -- statusy tygodniowe
- `task_contacts` -- powiazanie zadan CRM z kontaktami
- `deal_team_contacts.status` -- status kontaktu

Zadania CRM sa linkowane przez `contact_id` (kontakt CRM) w tabeli `task_contacts` -- bez potrzeby dodatkowej kolumny.
