

# Automatyczna zmiana tytulu zadania przy zmianie etapu

## Problem
Gdy uzytkownik zmienia "Etap zadania" lub "Etap lejka" (pod-etap) w panelu bocznym, tytul zadania pozostaje niezmieniony. Uzytkownik chce, aby tytul automatycznie aktualizowal sie do nazwy wybranego etapu (np. "Zaplanowac spotkanie", "Handshake", "Negocjacje").

## Plan

### Plik: `src/components/tasks/TaskDetailSheet.tsx`

1. **Rozszerzyc props `InteractivePipelineStageRow`** -- dodac `taskId` i `onTitleChange` callback:

```text
function InteractivePipelineStageRow({ 
  teamContactId, teamId, taskId, onTitleChange 
}: { 
  teamContactId: string; teamId: string; 
  taskId: string; onTitleChange: (title: string) => void;
})
```

2. **W `handleWorkflowChange`** -- po `updateContact.mutate(updates)` wywolac `onTitleChange(col.label)` aby zaktualizowac tytul zadania na nazwe kolumny workflow (np. "Zaplanowac spotkanie").

3. **W `handleStageChange`** -- po zmianie pod-etapu, pobrac label etapu z `subConfig` i wywolac `onTitleChange(stageLabel)`.

4. **W komponencie glownym `TaskDetailSheetContent`** -- dodac callback `handlePipelineTitleChange`:

```text
const handlePipelineTitleChange = async (newTitle: string) => {
  setTitleValue(newTitle);
  await updateTask.mutateAsync({ id: task.id, title: newTitle });
};
```

5. **Zaktualizowac wywolanie komponentu** (linia ~653):

```text
<InteractivePipelineStageRow 
  teamContactId={pipelineTeamContactId} 
  teamId={pipelineTeamId}
  taskId={task.id}
  onTitleChange={handlePipelineTitleChange}
/>
```

## Efekt

- Zmiana "Etap zadania" -> tytul = label kolumny workflow (np. "Zaplanowac spotkanie")
- Zmiana pod-etapu w "Etap lejka" -> tytul = label pod-etapu (np. "Handshake", "Spotkanie umowione")
- Tytul aktualizuje sie natychmiast w UI i jest zapisywany do bazy

