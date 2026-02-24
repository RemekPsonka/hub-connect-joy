

# Naprawa interaktywnej zmiany etapu lejka w TaskDetailSheet

## Zidentyfikowane problemy

### 1. Zmiana etapu nie odswierza UI
Hook `useUpdateTeamContact` w `onSuccess` invaliduje klucze:
- `deal-team-contacts`
- `deal-team-contact`
- `contact-deal-teams`
- `contact-deal-teams-bulk`

**Brakuje invalidacji:**
- `deal-team-contact-stage` -- klucz uzywany przez `InteractivePipelineStageRow` (query w TaskDetailSheet). Dlatego po zmianie dane nie odswiezaja sie w panelu bocznym.
- `deal-team-assignments-all` -- klucz uzywany przez Kanban zadan. Dlatego zmiana kategorii/etapu nie przesuwa zadania na Kanbanie workflow.

### 2. Brak trzeciego wiersza -- etap workflow (Kanban zadan)
W panelu bocznym widac:
- **Etap lejka** = kategoria (HOT, TOP, OFFERING...) + pod-etap (Handshake, Spotkanie umowione...)

Ale brakuje informacji o tym, w ktorej **kolumnie Kanbana zadan** aktualnie znajduje sie zadanie. To jest wazne, bo Kanban zadan mapuje category+stage na kolumne workflow (np. "Spotkanie umowione", "Negocjacje").

Uzytkownik chce widziec i zmieniac rowniez ten etap -- co efektywnie zmienia kombinacje category + offering_stage kontaktu.

### 3. Spojnosc: zmiana lejka vs zmiana zadan
Obecny model jest spojny pod warunkiem prawidlowej synchronizacji:
- Zmiana **kategorii** (np. HOT -> OFFERING) automatycznie resetuje `offering_stage` do domyslnego -- OK
- Zmiana **pod-etapu** (np. meeting_plan -> meeting_scheduled) aktualizuje `offering_stage` -- OK
- Kanban zadan czyta `contact_category` + `contact_offering_stage` -- wiec zmiana w panelu bocznym powinna automatycznie przesuwac zadanie na Kanbanie

Problem jest tylko w **brakujacej invalidacji cache** -- po naprawie wszystko bedzie dzialac spojnie.

## Plan naprawy

### Plik: `src/hooks/useDealsTeamContacts.ts`

W `useUpdateTeamContact` -> `onSuccess` dodac brakujace invalidacje:

```text
+ queryClient.invalidateQueries({ queryKey: ['deal-team-contact-stage'] });
+ queryClient.invalidateQueries({ queryKey: ['deal-team-assignments-all'] });
```

To naprawi:
1. Natychmiastowe odswierzenie dropdownow w TaskDetailSheet po zmianie
2. Automatyczne przesuniecie zadania na Kanbanie zadan

### Plik: `src/components/tasks/TaskDetailSheet.tsx`

Dodac trzeci wiersz **"Etap zadania"** pod "Etap lejka", pokazujacy w ktorej kolumnie workflow znajduje sie zadanie:

- Import `WORKFLOW_COLUMNS` z `pipelineStages.ts`
- Na podstawie aktualnego `category` + `offering_stage` wyszukac pasujaca kolumne workflow (`match()`)
- Wyswietlic jako DropdownMenu z lista wszystkich kolumn workflow
- Zmiana kolumny workflow automatycznie aktualizuje `category` i `offering_stage` kontaktu (odwrotne mapowanie)

Uklad UI:
```text
Etap lejka      [v TOP LEAD]    [v Zaplanowac spotkanie]
Etap zadania    [v Zaplanowac spotkanie (Spotkania)]
```

Zmiana w "Etap zadania" bedzie:
- W ramach tej samej kategorii -- aktualizacja `offering_stage`
- Miedzy kategoriami -- aktualizacja `category` (z automatycznym resetem `offering_stage`)

### Bez zmian w pozostalych plikach
- `pipelineStages.ts` -- konfiguracja WORKFLOW_COLUMNS juz zawiera mapowanie i `match()`
- `MyTeamTasksView.tsx` -- Kanban zadan automatycznie sie odswieza dzieki invalidacji `deal-team-assignments-all`
- `SubKanbanView.tsx` -- sub-kanban odswieza sie dzieki invalidacji `deal-team-contacts`
