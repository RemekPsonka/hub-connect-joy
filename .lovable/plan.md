
# Interaktywna zmiana etapu lejka i zadania w TaskDetailSheet

## Problem
Wiersz "Etap lejka" w panelu bocznym zadania (TaskDetailSheet) jest statyczny -- wyswietla tylko tekst. Uzytkownik nie moze zmienic ani kategorii (glownego etapu lejka), ani pod-etapu (offering_stage) bezposrednio z poziomu zadania.

## Rozwiazanie
Zastapic statyczny komponent `PipelineStageRow` interaktywnym komponentem z dwoma dropdownami:

1. **Dropdown kategorii** -- zmiana glownego etapu lejka (HOT, TOP, OFFERING, AUDIT, LEAD, 10X, COLD, CLIENT, LOST)
2. **Dropdown pod-etapu** -- zmiana offering_stage, widoczny tylko dla kategorii z sub-kanbanami (hot, top, offering, audit)

## Konfiguracja powiazan (mapowanie etapow)

Wykorzystujemy istniejaca konfiguracje `SUB_KANBAN_CONFIGS` z SubKanbanView.tsx jako zrodlo prawdy:

```text
Kategoria    Pod-etapy
---------    ---------
HOT/TOP      meeting_plan -> meeting_scheduled -> meeting_done
OFFERING     handshake -> power_of_attorney -> preparation -> negotiation -> accepted -> lost
AUDIT        audit_plan -> audit_scheduled -> audit_done
LEAD         (brak pod-etapow)
10X          (brak pod-etapow)
COLD         (brak pod-etapow)
CLIENT       (brak pod-etapow)
LOST         (brak pod-etapow)
```

## Zmiany techniczne

### Plik: `src/components/tasks/TaskDetailSheet.tsx`

**1. Nowy komponent `InteractivePipelineStageRow`** (zastepuje `PipelineStageRow` w liniach 153-181):

- Pobiera `category` i `offering_stage` z `deal_team_contacts` (istniejacy query)
- Importuje `SUB_KANBAN_CONFIGS` z `SubKanbanView`
- Uzywa `useUpdateTeamContact` (juz zaimportowany w pliku) do zapisu zmian
- Invaliduje klucze query: `deal-team-contact-stage`, `deals-team-contacts`, `deal-team-assignments`

**Dropdown kategorii:**
- Konfiguracja:
  ```text
  hot   -> HOT LEAD    (kolor: czerwony)
  top   -> TOP LEAD    (kolor: zolty)  
  offering -> OFERTOWANIE (kolor: niebieski)
  audit -> AUDYT       (kolor: cyan)
  lead  -> LEAD        (kolor: szary)
  10x   -> 10X         (kolor: fioletowy)
  cold  -> COLD LEAD   (kolor: slate)
  client -> KLIENT     (kolor: zielony)
  lost  -> PRZEGRANE   (kolor: czerwony)
  ```
- Zmiana kategorii automatycznie resetuje offering_stage do domyslnego (juz obslugiwane przez `useUpdateTeamContact`)
- Wyswietla badge z kolorem odpowiednim dla kategorii

**Dropdown pod-etapu (warunkowy):**
- Widoczny tylko gdy `SUB_KANBAN_CONFIGS[category]` istnieje (hot, top, offering, audit)
- Wyswietla etapy z konfiguracji sub-kanbana (np. dla offering: Handshake, Pelnomocnictwo, Przygotowanie...)
- Zmiana aktualizuje tylko `offering_stage`

**2. Zamiana uzycia** (linia 492):

Z:
```tsx
<PipelineStageRow teamContactId={pipelineTeamContactId} />
```
Na:
```tsx
<InteractivePipelineStageRow 
  teamContactId={pipelineTeamContactId} 
  teamId={pipelineTeamId} 
/>
```

### Uklad UI w panelu bocznym

```text
Etap lejka     [v HOT LEAD]    [v Spotkanie umowione]
```

Oba dropdowny stylizowane identycznie jak istniejace "Priorytet" i "Status" -- hover, ikony, ten sam pattern DropdownMenu.

### Bez zmian w pozostalych plikach
- `useUpdateTeamContact` -- juz obsluguje `category` i `offeringStage` z automatycznym resetem
- `SUB_KANBAN_CONFIGS` -- juz zawiera pelna konfiguracje pod-etapow
- `offeringStageLabels.ts` -- juz zawiera etykiety
- Kanban kontaktow i sub-kanbany -- reaguja automatycznie dzieki invalidacji query
- Kanban zadan -- reaguje automatycznie (czyta `contact_category` i `contact_offering_stage` z danych)

## Efekt koncowy
Uzytkownik moze z poziomu panelu bocznego zadania:
1. Zmienic glowny etap lejka kontaktu (np. HOT -> OFFERING) -- kontakt przesunie sie na Kanbanie kontaktow
2. Zmienic pod-etap (np. Handshake -> Pelnomocnictwo) -- kontakt przesunie sie na sub-Kanbanie
3. Zadanie automatycznie przesunie sie na Kanbanie zadan (bo kolumna zalezy od category+stage kontaktu)
