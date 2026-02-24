

# Audyt spojnosci lejkow i zadan -- wyniki i plan napraw

## Status po poprzednich naprawach

### Co dziala poprawnie
1. **Centralna konfiguracja** -- `pipelineStages.ts` jest jedynym zrodlem prawdy, wszystkie 5 konsumentow importuje z niego
2. **Etykiety** -- spojne we wszystkich widokach (SubKanban, Kanban zadan, TaskDetailSheet, badge'e)
3. **Cache invalidation** -- `useUpdateTeamContact` invaliduje `deal-team-contact-stage` i `deal-team-assignments-all`
4. **Kanban kontaktow** -- KanbanBoard + SubKanbanView korzystaja z centralnej konfiguracji
5. **Kanban zadan** -- WORKFLOW_COLUMNS mapuje zadania na kolumny na podstawie `contact_category + contact_offering_stage`

### Znalezione problemy

#### Problem 1: Odwrotne mapowanie HOT/TOP w "Etap zadania" (KRYTYCZNY)

Gdy uzytkownik zmienia "Etap zadania" w panelu bocznym (np. na "Spotkanie umowione"), system szuka w `testMappings` pierwszego pasujacego wpisu. HOT jest zawsze przed TOP na liscie, wiec:

- Kontakt w kategorii **TOP** + zmiana etapu na `meeting_scheduled` -> system **blednie zmienia kategorie na HOT** (bo `hot + meeting_scheduled` pasuje jako pierwszy)

Naprawa: W `handleWorkflowChange` preferowac aktualna kategorie kontaktu. Jezeli `match()` pasuje do aktualnej kategorii, uzywac jej zamiast pierwszego znalezionego wpisu.

#### Problem 2: Brak danych kontaktu w panelu bocznym z widoku Kanban zadan

W `MyTeamTasksView` obiekt `selectedTask` (mapowany z `DealTeamAssignment`) ustawia `task_contacts: []`. Przez to w panelu bocznym (TaskDetailSheet) wiersz "Kontakt" jest pusty -- nie widac nazwy kontaktu ani firmy. Dane `deal_team_id` i `deal_team_contact_id` sa poprawne, wiec dropdowny etapow dzialaja, ale brakuje informacji kontaktowej.

Naprawa: Dodac `task_contacts` do obiektu `selectedTask` na podstawie danych z `DealTeamAssignment` (ktore zawieraja `contact_name`, `contact_company`, `contact_id`).

## Plan napraw technicznych

### Plik 1: `src/components/tasks/TaskDetailSheet.tsx`

Zmiana w `handleWorkflowChange` -- preferowanie aktualnej kategorii:

```text
Obecny kod (linia 220):
  const match = testMappings.find(m => col.match(m.cat, m.stage || null));

Nowy kod:
  // Preferuj mapowanie z aktualna kategoria (aby TOP nie przeskoczyl do HOT)
  const matchSameCat = testMappings.find(
    m => m.cat === currentCategory && col.match(m.cat, m.stage || null)
  );
  const match = matchSameCat || testMappings.find(m => col.match(m.cat, m.stage || null));
```

### Plik 2: `src/components/deals-team/MyTeamTasksView.tsx`

Zmiana w `selectedTask` (linie 258-268) -- dodanie `task_contacts`:

```text
Obecny kod:
  task_contacts: [],

Nowy kod:
  task_contacts: a.contact_id ? [{
    contacts: {
      id: a.contact_id,
      full_name: a.contact_name || '',
      company: a.contact_company || null,
    }
  }] : [],
```

Dzieki temu panel boczny bedzie wyswietlal nazwe kontaktu i firme, oraz link do profilu kontaktu.

## Efekt koncowy

Po naprawach caly flow bedzie spojny:
1. **Kanban kontaktow** -- przenoszenie kontaktow miedzy kolumnami zmienia `category`
2. **Sub-kanban kontaktow** -- przenoszenie zmienia `offering_stage`
3. **Kanban zadan** -- zadania sa automatycznie mapowane na kolumny workflow na podstawie `category + offering_stage` kontaktu
4. **Panel boczny zadania** -- 3 interaktywne wiersze (Etap lejka, Pod-etap, Etap zadania) synchronizuja wszystkie 3 widoki
5. **Zmiana z TOP** -- nie powoduje blednego przeskoku do HOT

