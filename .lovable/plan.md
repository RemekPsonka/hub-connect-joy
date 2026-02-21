
# Przebudowa flow zadan w lejku sprzedazy

## Analiza obecnego stanu

Aktualnie dialog "Dalsze dzialania" (`NextActionDialog`) dziala TYLKO z jednego miejsca: `ContactTasksSheet` (boczny panel po kliknieciu karty na Kanbanie). Problem w tym, ze sa 3 inne punkty, z ktorych uzytkownik moze zakonczyc zadanie pipeline'owe -- i we wszystkich flow jest zepsuty:

```text
PUNKT WEJSCIA                      CO SIE DZIEJE TERAZ              CO POWINNO SIE DZIAC
---------------------------------  -------------------------------  --------------------------
1. ContactTasksSheet (Kanban)      NextActionDialog -- OK            OK (dziala)
2. TaskDetailSheet (karta zadania) Bezposrednie "completed"          NextActionDialog
3. MyTeamTasksView (Zadania tab)   Tylko meeting workflow            NextActionDialog
4. Tasks/MyTasks (globalne)        Bezposrednie "completed"          NextActionDialog
```

## Projektowy przeplywy sprzedazowy (CRM best practices)

Kazdy kontakt w lejku ma JEDNO aktywne zadanie. Po jego zakonczeniu, system wymusza wybor nastepnego kroku:

```text
COLD/LEAD -> Zadzwon -> Umow spotkanie -> Spotkanie umowione -> 
  Po spotkaniu:
    -> Kolejne spotkanie (pozostaje w HOT/TOP)
    -> Wyslij oferte (przechodzi do OFERTOWANIE)  
    -> Odloz (przechodzi do 10x)
    -> Utracony (przechodzi do LOST)
    -> Klient (konwersja na CLIENT)
    
  W kazdym kroku:
    - Wybor osoby odpowiedzialnej (dyrektor)
    - Termin wykonania
    - Notatka
    - Automatyczna zmiana etapu w lejku (offering_stage + category)
```

## Plan naprawy -- 3 kroki

### Krok 1: TaskDetailSheet -- dodanie NextActionDialog

**Plik:** `src/components/tasks/TaskDetailSheet.tsx`

Problem: Przycisk "Oznacz jako ukonczone" i dropdown statusu bezposrednio zamykaja zadanie. Dla zadan pipeline'owych (`deal_team_id IS NOT NULL`) musi otworzyc NextActionDialog.

Zmiany:
- Dodac state: `nextActionOpen`, `pendingTaskId`, `showSnooze`, `showConvert`
- W `handleComplete()` i `handleStatusChange()`: sprawdzic czy `task.deal_team_id` istnieje. Jesli tak -- zamiast bezposredniego `status: 'completed'`, otworzyc `NextActionDialog`
- Potrzebne dane do NextActionDialog: `contactName`, `contactId`, `teamContactId`, `teamId` -- trzeba je pobrac z `task.deal_team_contact_id` i `task.task_contacts`
- Renderowac `NextActionDialog`, `SnoozeDialog`, `ConvertToClientDialog` pod glownym Sheet

Logika:
```text
handleComplete():
  IF task.deal_team_id EXISTS:
    -> otworz NextActionDialog (recykling zadania)
  ELSE IF task.recurrence_rule EXISTS:
    -> handleRecurringNextTask() (jak teraz)
  ELSE:
    -> bezposrednie completed (jak teraz)
```

### Krok 2: MyTeamTasksView -- zunifikowany NextActionDialog

**Plik:** `src/components/deals-team/MyTeamTasksView.tsx`

Problem: `handleStatusChange()` obsluguje tylko spotkania (MeetingScheduledDialog / MeetingOutcomeDialog). Wszystkie inne zadania sa zamykane bez dalszych dzialan.

Zmiany:
- Dodac state i rendering `NextActionDialog`, `SnoozeDialog`, `ConvertToClientDialog`
- W `handleStatusChange()`: zamiast osobnych warunkow na meeting, ZAWSZE otwierac `NextActionDialog` gdy `newStatus === 'completed'` i zadanie ma `deal_team_contact_id`
- Usunac osobne MeetingScheduledDialog/MeetingOutcomeDialog -- NextActionDialog juz ma opcje "Spotkanie umowione" i "Umow spotkanie" ktore to pokrywaja
- Nie zamykac zadania bezposrednio -- NextActionDialog decyduje co dalej

Logika:
```text
handleStatusChange(taskId, task, newStatus):
  IF newStatus === 'completed' AND task.deal_team_contact_id:
    -> otworz NextActionDialog z danymi kontaktu
  ELSE:
    -> bezposrednie update (jak teraz)
```

### Krok 3: Globalne widoki Tasks/MyTasks -- propagacja

**Pliki:** `src/pages/Tasks.tsx`, `src/pages/MyTasks.tsx`

Problem: Te widoki uzywaja `TaskDetailSheet` -- po zmianach z Kroku 1, TaskDetailSheet bedzie juz obslugiwac NextActionDialog. Ale `UnifiedTaskRow.onStatusChange` w tych widokach tez bezposrednio zmienia status.

Zmiany:
- W callbackach `onStatusChange` sprawdzic czy zadanie ma `deal_team_id`. Jesli tak -- otworzyc NextActionDialog zamiast bezposredniego update
- Alternatywnie: dodac logike do `UnifiedTaskRow` zeby emitowac event "pipeline_complete" zamiast bezposredniego statusu -- ale to byloby zbyt inwazyjne. Lepiej na poziomie rodzica.

## Szczegoly techniczne

### Dane potrzebne dla NextActionDialog:
NextActionDialog wymaga: `contactName`, `contactId`, `teamContactId`, `teamId`, `existingTaskId`, `existingTaskTitle`

W `TaskDetailSheet` te dane sa dostepne z:
- `task.task_contacts[0].contacts` -> contactName, contactId
- `task.deal_team_id` -> teamId
- `task.deal_team_contact_id` -> teamContactId (trzeba dodac do selecta w hookach)

W `MyTeamTasksView` dane sa juz dostepne z `DealTeamAssignment` i `teamContacts`.

### Pliki do zmiany (podsumowanie):
1. **`src/components/tasks/TaskDetailSheet.tsx`** -- dodanie NextActionDialog + SnoozeDialog + ConvertToClientDialog, zmiana handleComplete/handleStatusChange
2. **`src/components/deals-team/MyTeamTasksView.tsx`** -- zamiana meeting-specific dialogow na uniwersalny NextActionDialog
3. **`src/pages/Tasks.tsx`** -- dodanie interceptu statusu dla zadan pipeline
4. **`src/pages/MyTasks.tsx`** -- dodanie interceptu statusu dla zadan pipeline
