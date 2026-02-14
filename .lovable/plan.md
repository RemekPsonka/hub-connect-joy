
# Rozbudowa ContactTasksSheet do pelnej zakladki klienta

## Problem
Obecny `ContactTasksSheet` to minimalistyczny panel pokazujacy tylko liste zadan. Uzytkownik chce pelna zakladke klienta z sekcjami: Osoba, Firma, Uwagi, Zadania, Historia, Status.

## Rozwiazanie
Rozbudowac `ContactTasksSheet` o zakladki (Tabs) z pelnym kontekstem klienta, zachowujac istniejaca logike otwierania TaskDetailSheet po kliknieciu zadania.

## Struktura zakladek

Panel boczny (Sheet, prawy, `sm:max-w-xl`) z zakladkami:

### Tab 1: Przeglag (domyslny)
Szybki podglad najwazniejszych danych w jednym widoku:
- **Osoba**: imie, stanowisko, email, telefon, miasto
- **Firma**: nazwa firmy (z linkiem do profilu firmy jesli company_id istnieje)
- **Status w lejku**: kategoria (hot/top/lead...), priorytet, status (active/won/lost), offering_stage
- **Uwagi**: notatki z `contact.notes` (pole z DealTeamContact) - edytowalne inline (textarea z autosave)
- **Nastepna akcja**: next_action, next_action_date, next_action_owner
- **Nastepne spotkanie**: next_meeting_date

### Tab 2: Zadania
Obecna zawartosc - lista zadan (UnifiedTaskRow), przycisk nowe zadanie, sekcja zamknietych. Bez zmian w logice.

### Tab 3: Historia
Wykorzystanie istniejacego komponentu `ContactKnowledgeTimeline` (zebrana wiedza - konsultacje, komentarze zadan, statusy tygodniowe, notatki projektowe, spotkania 1:1).

### Tab 4: Statusy
Lista statusow tygodniowych dla tego kontaktu z `useTeamContactWeeklyStatuses`. Kazdy status: data tygodnia, podsumowanie, nastepne kroki, blokery, rekomendacja kategorii.

## Zmiany w plikach

### 1. `src/components/deals-team/ContactTasksSheet.tsx` - pelna przebudowa

Dodac:
- Import `Tabs, TabsList, TabsTrigger, TabsContent` z `@/components/ui/tabs`
- Import `ContactKnowledgeTimeline` z `@/components/contacts/ContactKnowledgeTimeline`
- Import `useTeamContactWeeklyStatuses` z `@/hooks/useTeamContactWeeklyStatuses`
- Import `useUpdateTeamContact` z `@/hooks/useDealsTeamContacts` (do edycji notatek inline)
- Ikony: `User, Building2, StickyNote, History, BarChart3, Mail, Phone, MapPin, Calendar, Target`

Struktura:
```
Sheet (sm:max-w-xl)
  SheetHeader (nazwa, firma, stanowisko, link CRM)
  Tabs (defaultValue="overview")
    TabsList (4 zakladki: Przeglag, Zadania, Historia, Statusy)
    TabsContent "overview" -> sekcje: dane osobowe, firma, status lejka, uwagi, nastepna akcja
    TabsContent "tasks" -> obecna lista zadan (UnifiedTaskRow)
    TabsContent "history" -> ContactKnowledgeTimeline
    TabsContent "statuses" -> lista statusow tygodniowych
```

### 2. Dane dostepne bez dodatkowych zapytan
`DealTeamContact` (przekazywany jako prop `contact`) juz zawiera:
- `contact.full_name`, `contact.position`, `contact.email`, `contact.phone`, `contact.city`, `contact.company`, `contact.company_id`
- `category`, `status`, `priority`, `offering_stage`
- `notes`, `next_action`, `next_action_date`, `next_action_owner`
- `next_meeting_date`, `next_meeting_with`
- `estimated_value`, `value_currency`
- `assigned_director?.full_name`

Dodatkowe zapytania:
- `useTeamContactWeeklyStatuses(contact.id)` - statusy tygodniowe
- `useContactKnowledge(contact.contact_id)` - historia wiedzy (juz istniejacy hook)
- `useDealContactAllTasks(contact.contact_id, contact.id)` - zadania (juz jest)

### 3. Sekcja "Uwagi" z autosave
- `textarea` z wartoscia `contact.notes`
- `onBlur` -> `useUpdateTeamContact.mutate({ id: contact.id, teamId, notes: value })`
- Debounce nie jest potrzebny - zapis na blur wystarczy

### 4. Sekcja "Statusy tygodniowe"
Mapowanie danych z `useTeamContactWeeklyStatuses`:
- Data tygodnia (`week_start`)
- Podsumowanie (`status_summary`)
- Nastepne kroki (`next_steps`)
- Blokery (`blockers`)
- Rekomendacja kategorii (`category_recommendation`) jako Badge

### Brak zmian w KanbanBoard.tsx
Interfejs `ContactTasksSheet` pozostaje taki sam (te same propsy), wiec rodzic nie wymaga zmian.

## Podsumowanie
Jeden plik do edycji: `ContactTasksSheet.tsx`. Panel boczny staje sie pelna karta klienta z 4 zakladkami, zachowujac istniejaca logike przejscia do TaskDetailSheet po kliknieciu zadania.
