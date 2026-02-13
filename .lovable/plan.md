
# Naprawa dodawania i edycji zadan z panelu bocznego kontaktu w lejku

## Problem
Panel boczny kontaktu (`DealContactDetailSheet`) posiada przycisk "+ Nowe" do tworzenia zadan oraz otwiera `TaskDetailSheet` po kliknieciu zadania. Jednak przycisk "Edytuj" w `TaskDetailSheet` otwiera `TaskModal` bez przekazania obiektu `task` (linia 716-722), wiec zamiast edycji otwiera sie pusty formularz tworzenia. Brakuje tez mozliwosci szybkiej zmiany statusu i priorytetu bezposrednio z listy zadan.

## Rozwiazanie

Zmiany w jednym pliku: `src/components/deals-team/DealContactDetailSheet.tsx`

### 1. Przekazanie wybranego zadania do TaskModal

Obecnie (linia 716-722):
```tsx
<TaskModal
  open={taskModalOpen}
  onOpenChange={setTaskModalOpen}
  preselectedContactId={contact.contact_id}
  dealTeamId={teamId}
  dealTeamContactId={contact.id}
/>
```

Po zmianie:
```tsx
<TaskModal
  open={taskModalOpen}
  onOpenChange={(open) => {
    setTaskModalOpen(open);
    if (!open) setSelectedTask(null);
  }}
  task={selectedTask}
  preselectedContactId={contact.contact_id}
  dealTeamId={teamId}
  dealTeamContactId={contact.id}
/>
```

### 2. Poprawka callbacku onEdit w TaskDetailSheet

Obecnie (linia 730-733):
```tsx
onEdit={() => {
  setTaskDetailOpen(false);
  setTaskModalOpen(true);
}}
```

`selectedTask` jest juz ustawiony wczesniej (linia 494), wiec wystarczy zamknac detail sheet i otworzyc modal — `selectedTask` pozostaje ustawiony.

### 3. Dodanie inline akcji na liscie zadan

Do kazdego wiersza zadania dodanie:
- Ikona statusu (Circle/Clock/CheckCircle2) z cyklicznym przelaczaniem: pending -> in_progress -> done
- Ikona edycji (MoreHorizontal lub Edit) otwierajaca TaskModal z wybranym zadaniem
- Wizualne oznaczenie priorytetu (kolorowa kropka)

### 4. Reset selectedTask przy tworzeniu nowego zadania

Przycisk "+ Nowe" musi czyscic `selectedTask`:
```tsx
onClick={() => {
  setSelectedTask(null);
  setTaskModalOpen(true);
}}
```

## Szczegoly techniczne

| Zmiana | Linie | Opis |
|--------|-------|------|
| Reset selectedTask przy "+ Nowe" | ~479 | Dodanie `setSelectedTask(null)` przed `setTaskModalOpen(true)` |
| Przekazanie task do TaskModal | ~716-722 | Dodanie prop `task={selectedTask}` i czyszczenie przy zamknieciu |
| Nowe importy | ~8-11 | Dodanie `MoreHorizontal`, `Circle`, `Clock`, `CheckCircle2` z lucide |
| Inline status cycling | ~489-513 | Dodanie ikony statusu z handlerem cyklicznej zmiany |
| Priorytet wizualny | ~504-505 | Kolorowa kropka przy tytule zadania |

Wszystkie uzyte komponenty (ikony lucide, Checkbox, Button) sa juz zaimportowane w pliku. Nie sa wymagane nowe zaleznosci.
