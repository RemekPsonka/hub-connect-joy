

# Drag & Drop w Kanban zadań (workflow) z automatyczną zmianą etapu kontaktu

## Opis
Dodanie obslugi przeciagania kart miedzy kolumnami w widoku Kanban workflow (`MyTeamTasksView`, tryb `kanban`). Po upuszczeniu karty zadania w nowej kolumnie, system automatycznie zaktualizuje kategorie i offering_stage powiazanego kontaktu (reverse-mapping z kolumny workflow) oraz tytul zadania.

## Plan techniczny

### Plik: `src/components/deals-team/MyTeamTasksView.tsx`

1. **Importy** -- dodac `DndContext`, `DragOverlay`, `DragStartEvent`, `DragEndEvent`, `PointerSensor`, `useSensor`, `useSensors`, `useDroppable` z `@dnd-kit/core` oraz `useUpdateTeamContact` z `@/hooks/useDealsTeamContacts`.

2. **Konfiguracja sensorow** -- w `MyTeamTasksView`:
```text
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
);
```

3. **Stan drag** -- `const [activeDragTask, setActiveDragTask] = useState<DealTeamAssignment | null>(null);`

4. **Handler `handleDragEnd`** -- glowna logika:
   - Wyciagnac `active.id` (task ID) i `over.id` (workflow column ID)
   - Znalezc zadanie w `filtered`
   - Sprawdzic czy kolumna docelowa rozni sie od biezacej (porownanie `match`)
   - Zastosowac te sama logike reverse-mapping co `handleWorkflowChange` w `TaskDetailSheet`:
     - Wyznaczyc nowa `category` i `offering_stage` z kolumny docelowej
     - Wywolac `updateTeamContact.mutate({ id: task.deal_team_contact_id, teamId, category, offeringStage })`
     - Zaktualizowac tytul zadania: `updateAssignment.mutate({ id: taskId, teamContactId, title: col.label })`

5. **Komponent `DroppableColumn`** -- wrapper na kolumne uzywajacy `useDroppable({ id: col.id })`:
```text
function DroppableWorkflowColumn({ colId, children }) {
  const { setNodeRef, isOver } = useDroppable({ id: colId });
  // ... render z ref i wizualnym feedbackiem isOver
}
```

6. **Komponent `DraggableTaskCard`** -- wrapper na karte zadania uzywajacy `useDraggable({ id: task.id })`:
```text
function DraggableWorkflowCard({ task, children }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  // ... render z transform i opacity
}
```

7. **Owinac sekcje Kanban** w `<DndContext sensors={sensors} onDragStart={...} onDragEnd={...}>` + `<DragOverlay>` z podgladem przeciaganej karty.

8. **Wizualny feedback** -- kolumna docelowa podswietla sie (`ring-2 ring-primary/50 bg-primary/5`) gdy karta jest nad nia.

### Logika reverse-mapping (identyczna jak w TaskDetailSheet)

Kolumna workflow -> (category, offering_stage):
- `meeting_plan` -> zachowaj hot/top, stage `meeting_plan`
- `meeting_scheduled` -> zachowaj hot/top, stage `meeting_scheduled`
- `meeting_done` -> zachowaj hot/top, stage `meeting_done`
- `handshake` -> offering, `handshake`
- `power_of_attorney` -> offering, `power_of_attorney`
- `preparation` -> offering, `preparation`
- `negotiation` -> offering, `negotiation`
- `accepted` -> offering, `accepted`
- `offering_lost` -> offering, `lost`
- `audit_plan` -> audit, `audit_plan`
- `audit_scheduled` -> audit, `audit_scheduled`
- `audit_done` -> audit, `audit_done`
- `client` -> client
- `lost` -> lost
- `other` -> lead

### Modyfikowany plik
- `src/components/deals-team/MyTeamTasksView.tsx`

