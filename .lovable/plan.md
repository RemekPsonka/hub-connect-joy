
# Przeprojektowanie flow zamykania zadan w lejku -- petla ciagla do "Klient"

## Problem
Obecny system tworzy NOWE zadanie po kazdym zamknieciu (np. "Kolejne spotkanie" w MeetingOutcomeDialog tworzy nowy task). Uzytkownik konczy z duplikatami zadan. Oczekiwane zachowanie: **jedno zadanie na kontakt w lejku**, ktore jest **recyklowane** (zmiana tytulu, daty, osoby, statusu) az do konwersji na klienta.

## Nowe podejscie

### Zasada: "Dalsze dzialania" zamiast "Zamknij + nowe"
Zamkniecie zadania w kontekscie lejka NIE tworzy nowego zadania. Zamiast tego:
1. Uzytkownik klika status -> "completed" 
2. Otwiera sie dialog "Co dalej?" (uniwersalny, nie tylko po spotkaniu)
3. Uzytkownik wybiera akcje, osobe, date
4. **To samo zadanie** jest aktualizowane: nowy tytul, nowa data, status wraca na `todo`, etap w kanbanie sie zmienia

### Flow krok po kroku
```text
Uzytkownik klika "completed" na zadaniu w lejku
  -> Dialog "Dalsze dzialania" (NextActionDialog)
     Opcje:
       - Umow spotkanie -> tytul: "Umowic spotkanie z X", kanban: meeting_plan
       - Spotkanie umowione -> otwiera MeetingScheduledDialog (data), kanban: meeting_scheduled
       - Wyslij oferte -> tytul: "Wyslac oferte do X", kanban: offering/handshake
       - Zadzwon -> tytul: "Zadzwonic do X", kanban: bez zmiany
       - Wyslij mail -> tytul: "Wyslac maila do X", kanban: bez zmiany
       - Odloz (10x) -> kanban: 10x, zadanie zamkniete
       - Klient -> konwersja (ConvertToClientDialog)
       - Utracony -> kanban: lost, zadanie zamkniete
     Uzytkownik wybiera:
       - Osobe odpowiedzialna (select z czlonkow zespolu)
       - Date (calendar)
     Klikniecie "Zapisz":
       - UPDATE tasks SET title=nowy, due_date=nowa, status='todo', assigned_to=nowy
       - UPDATE deal_team_contacts SET offering_stage=nowy, category=nowy (jesli zmiana)
       - Log aktywnosci w task_activity_log
  -> Sheet pozostaje otwarty z zaktualizowanym zadaniem
```

## Pliki do zmiany

### 1. NOWY: `src/components/deals-team/NextActionDialog.tsx`
Uniwersalny dialog "Dalsze dzialania" zamiast obecnego MeetingOutcomeDialog (ktory pozostanie jako sub-dialog dla opcji "Spotkanie umowione"):
- Lista akcji (umow spotkanie, zadzwon, wyslij oferte, wyslij mail, inne, odloz, klient, utracony)
- Select osoby odpowiedzialnej (czlonkowie zespolu)
- Kalendarz z data
- Pole na notatke
- Po zapisaniu: UPDATE istniejacego zadania (nie INSERT nowego)
- Aktualizacja offering_stage / category w deal_team_contacts

### 2. ZMIANA: `src/components/deals-team/ContactTasksSheet.tsx`
- `handleTaskStatusChange`: zamiast bezposrednio zamykac task i otwierac MeetingOutcomeDialog, otworzy nowy `NextActionDialog` dla KAZDEGO zadania (nie tylko spotkaniowego)
- Usunac osobna logike `isMeetingTask` -- kazde zadanie w lejku wchodzi w petle "co dalej?"
- Przekazac `taskId` do NextActionDialog zeby wiedział ktore zadanie recyklowac
- Po zapisaniu: odswiezyc liste zadan (invalidate queries)

### 3. ZMIANA: `src/components/deals-team/MeetingOutcomeDialog.tsx`
- Zmiana logiki `next_meeting`: zamiast `createTask.mutateAsync()` zwracac informacje do rodzica ze nalezy zaktualizowac istniejace zadanie
- Dodac prop `existingTaskId` -- jesli podany, UPDATE zamiast INSERT
- Alternatywnie: MeetingOutcomeDialog staje sie sub-widokiem NextActionDialog (opcja "spotkanie odbyte" otwiera go)

### 4. ZMIANA: `src/components/deals-team/MeetingScheduledDialog.tsx`
- Analogicznie: zamiast `createTask.mutateAsync()` -- UPDATE istniejacego zadania
- Dodac prop `existingTaskId` -- jesli podany, zmiana tytulu i daty na istniejacym tasku

## Szczegoly techniczne

### NextActionDialog -- logika zapisu:
```typescript
// Recyklowanie zadania
await updateTask.mutateAsync({
  id: existingTaskId,
  title: newTitle,        // np. "Umowic spotkanie z Jan Kowalski"
  status: 'todo',         // reset
  due_date: selectedDate, // nowa data
  assigned_to: selectedPerson,
});

// Aktualizacja etapu w kanbanie
await updateContact.mutateAsync({
  id: teamContactId,
  teamId,
  offeringStage: newStage,     // np. 'meeting_plan'
  category: newCategory,        // np. 'offering' (jesli zmiana)
});

// Log
await supabase.from('task_activity_log').insert({
  task_id: existingTaskId,
  field_name: 'recycled',
  old_value: oldTitle,
  new_value: newTitle,
});
```

### Mapowanie akcji na etapy kanbana:
| Akcja              | Tytul zadania                | offering_stage     | category (jesli zmiana) |
|--------------------|-----------------------------|--------------------|-----------------------|
| Umow spotkanie     | Umowic spotkanie z X        | meeting_plan       | bez zmiany           |
| Spotkanie umowione | Spotkanie z X - data        | meeting_scheduled  | bez zmiany           |
| Wyslij oferte      | Wyslac oferte do X          | handshake          | offering             |
| Zadzwon            | Zadzwonic do X              | bez zmiany         | bez zmiany           |
| Wyslij mail        | Wyslac maila do X           | bez zmiany         | bez zmiany           |
| Odloz (10x)        | --                          | --                 | 10x (task completed) |
| Klient             | -> ConvertToClientDialog    | --                 | client (won)         |
| Utracony           | --                          | --                 | lost                 |

### Integracja z istniejacymi dialogi:
- "Spotkanie umowione" -> otwiera MeetingScheduledDialog z `existingTaskId` (zeby zaktualizowac task zamiast tworzec nowy)
- "Klient" -> otwiera ConvertToClientDialog (istniejacy flow)
- "Odloz" / "Utracony" -> zamyka zadanie definitywnie (status completed), zmienia kategorie

### Zabezpieczenia:
- Ref guard `actionInProgressRef` przeciw podwojnym kliknieciam
- Po zapisie: `invalidateQueries` dla `deal-team-contacts`, `deal-contact-all-tasks`, `tasks`
- Toast z potwierdzeniem co sie zmienilo

## Pliki do zmiany (podsumowanie):
1. **NOWY** `src/components/deals-team/NextActionDialog.tsx` -- glowny dialog "co dalej?"
2. **ZMIANA** `src/components/deals-team/ContactTasksSheet.tsx` -- nowy flow zamykania
3. **ZMIANA** `src/components/deals-team/MeetingScheduledDialog.tsx` -- prop existingTaskId, UPDATE zamiast INSERT
4. **ZMIANA** `src/components/deals-team/MeetingOutcomeDialog.tsx` -- dostosowanie do recyklowania zadan
