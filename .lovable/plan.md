

# Workflow zadaniowy w lejku: od "Umow spotkanie" do decyzji

## Kontekst

Obecnie szablony zadaniowe ("Umow spotkanie", "Zadzwon" itd.) tworza proste taski bez powiazania z etapami lejka (offering_stage). Sub-Kanban (HOT/TOP) ma juz etapy: `meeting_plan` -> `meeting_scheduled` -> `meeting_done`, ale nie sa one zsynchronizowane z zadaniami.

## Cel

Stworzyc spojny workflow, w ktorym:
1. Utworzenie taska "Umow spotkanie" automatycznie ustawia etap kontaktu na `meeting_plan`
2. Zamkniecie taska "Umow spotkanie" (status = completed) otwiera dialog z pytaniem o date spotkania i przesuwa kontakt na `meeting_scheduled`
3. Gdy nadejdzie data spotkania, system sugeruje oznaczenie jako `meeting_done`
4. Po `meeting_done` pojawia sie dialog decyzyjny: co dalej z kontaktem? (ofertowanie, odlozenie, 10x, utrata itd.)

## Rozwiazanie

### 1. Nowy komponent: `TaskCompletionWorkflow.tsx`

Dialog/modal ktory pojawia sie po zamknieciu taska powiazanego z lejkiem. Logika:

- **Jesli task jest typu "Umow spotkanie" i kontakt jest w `meeting_plan`:**
  - Pokazuje formularz "Spotkanie umowione" z polem daty spotkania
  - Po zatwierdzeniu: zmienia `offering_stage` na `meeting_scheduled`, ustawia `next_meeting_date`
  - Automatycznie tworzy follow-up task "Spotkanie z [Imie] - [data]" z terminem = data spotkania

- **Jesli task jest typu "Spotkanie" i kontakt jest w `meeting_scheduled`:**
  - Pokazuje dialog "Spotkanie odbyte - co dalej?"
  - Opcje do wyboru (radio/karty):
    - Wyslij oferte -> zmienia kategorie na `offering` (etap `handshake`)
    - Umow kolejne spotkanie -> tworzy nowy task "Umowic spotkanie", zostaje w HOT/TOP
    - Odloz (Snooze) -> otwiera snooze dialog
    - 10x -> zmienia kategorie na `10x`
    - Utracony -> zmienia status na `lost`
  - Kazda opcja moze stworzyc follow-up task z terminem

### 2. Modyfikacja: `ContactTasksSheet.tsx`

- Szablon "Umow spotkanie" dodatkowo wywoluje `updateContact.mutate({ offeringStage: 'meeting_plan' })` jesli kontakt jest w kategorii HOT lub TOP
- Nowy szablon: "Potwierdz spotkanie" (widoczny gdy `offering_stage === 'meeting_scheduled'`)

### 3. Modyfikacja: `MyTeamTasksView.tsx` / `UnifiedTaskRow` - przechwycenie completion

- W `handleStatusChange`, jesli nowy status = `completed` i task ma `deal_team_contact_id`:
  - Sprawdz tytul taska i aktualny `offering_stage` kontaktu
  - Jesli pasuje do wzorca workflow -> otworz `TaskCompletionWorkflow` zamiast prostej zmiany statusu
  - Jesli nie pasuje -> standardowa zmiana statusu

### 4. Nowy komponent: `MeetingScheduledDialog.tsx`

Prosty dialog z:
- Date pickerem "Data spotkania"
- Opcjonalnym polem "Z kim?" (tekst)
- Przyciskiem "Zapisz" ktory:
  - Zmienia `offering_stage` na `meeting_scheduled`
  - Ustawia `next_meeting_date`
  - Tworzy follow-up task "Spotkanie z [Imie]" na te date

### 5. Nowy komponent: `MeetingOutcomeDialog.tsx`

Dialog po spotkaniu z opcjami:
- **Wyslij oferte** -> kategoria `offering`, etap `handshake`
- **Kolejne spotkanie** -> nowy task "Umowic spotkanie", reset do `meeting_plan`
- **10x** -> kategoria `10x`
- **Odloz** -> otwiera istniejacy snooze flow
- **Klient** -> otwiera istniejacy `ConvertToClientDialog`
- **Utracony** -> status `lost`

Kazda opcja zawiera pole na notatke i opcjonalny termin nastepnej akcji.

### Szczegoly techniczne

**Pliki do utworzenia:**
1. `src/components/deals-team/MeetingScheduledDialog.tsx` -- dialog po umowieniu spotkania
2. `src/components/deals-team/MeetingOutcomeDialog.tsx` -- dialog decyzyjny po spotkaniu

**Pliki do modyfikacji:**
3. `src/components/deals-team/ContactTasksSheet.tsx`:
   - "Umow spotkanie" -> dodac auto-update `offering_stage: 'meeting_plan'`
   - Dodac nowy szablon "Potwierdz spotkanie" (warunkowo, gdy stage = meeting_scheduled)

4. `src/components/deals-team/MyTeamTasksView.tsx`:
   - W `handleStatusChange` dodac logike workflow: jesli completed + deal_team_contact_id -> sprawdz czy otworzyc dialog
   - Dodac stany dla otwartych dialogow (`meetingScheduledDialog`, `meetingOutcomeDialog`)
   - Przekazac dane kontaktu do dialogow

5. `src/components/deals-team/ContactTasksSheet.tsx`:
   - Po zamknieciu taska w zakladce "Zadania" tez uruchomic workflow

**Rozpoznawanie typu taska:**
- Tytuł zawiera "spotkanie" lub "meeting" -> typ: meeting
- `offering_stage` kontaktu: `meeting_plan` -> po completion otwiera MeetingScheduledDialog
- `offering_stage` kontaktu: `meeting_scheduled` -> po completion otwiera MeetingOutcomeDialog

**Hooks uzywane:**
- `useUpdateTeamContact` -- zmiana `offering_stage`, `category`, `next_meeting_date`
- `useCreateTask` -- tworzenie follow-up taskow
- `useUpdateTask` -- zmiana statusu taska na completed

**Flow wizualny:**

```text
[Umow spotkanie] ──completed──> MeetingScheduledDialog
       |                              |
       v                              v
  meeting_plan              meeting_scheduled
                                      |
                           [Spotkanie z X] ──completed──> MeetingOutcomeDialog
                                                                |
                                    ┌───────────────────────────┼──────────────┐
                                    v                           v              v
                              -> Offering              -> Kolejne spotkanie  -> 10x / Snooze / Lost
                              (handshake)                 (nowy task)
```

