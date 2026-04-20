

## RECON — wynik

### MyTeamTasksView.tsx (806 linii)
- **Plik**: `src/components/deals-team/MyTeamTasksView.tsx`
- **ViewMode**: `'grouped' | 'list' | 'kanban' | 'team'` (linia 44) — **DO USUNIĘCIA: 'kanban' i 'team'**
- **Imports do usunięcia**:
  - linia 54: `import { WORKFLOW_COLUMNS, CATEGORY_OPTIONS, type WorkflowColumn } from '@/config/pipelineStages';`
  - linia 55: `import { usePipelineStages, usePipelineTransitions } from '@/hooks/usePipelineConfig';`
  - linia 56: `import { isTransitionAllowed } from '@/config/pipelineStagesAdapter';`
  - linia 33-34: `SnoozeDialog`, `ConvertToClientDialog` (używane tylko w kanban dnd) — **zostawić** (używane też w Workflow Dialogs blok 762-803)
  - DnD: `DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDroppable, useDraggable, DragStartEvent, DragEndEvent` (linie 4-8) — używane tylko w kanban → DO USUNIĘCIA
  - `Columns3, Users` (linia 13) — kanban + team toggle → DO USUNIĘCIA
  - `Progress` (linia 19) — tylko team view → DO USUNIĘCIA
- **Funkcje do usunięcia**:
  - `reverseMapColumn` (linie 59-77)
  - `DroppableWorkflowColumn`, `DraggableWorkflowCard` (linie 80-101)
- **State do usunięcia**: `activeDragTask`, sensors, DnD handlers (`handleDragStart`, `handleDragEnd`)
- **Memo do usunięcia**: `workflowKanban`, `funnelStats`, `teamData`, `FUNNEL_CATEGORIES`
- **JSX do usunięcia**: kanban block (578-689), team block (692-746), 2 ToggleGroupItem (431-438)
- **`SnoozedTeamView`**: nadal renderowany w `DealsTeamDashboard` jako osobny `viewMode === 'snoozed'` — **NIE TYKAĆ** (osobny widok, nie w MyTeamTasksView)

### useDealsTeamAssignments.ts (`useMyTeamAssignments`)
- Już zwraca `contact_category` i `contact_offering_stage` przez join `deal_team_contacts(category, offering_stage)`. **Brakuje**: `temperature`, `client_status`. Trzeba rozszerzyć select o te 2 kolumny + dodać do interfejsu `DealTeamAssignment` i mapowania.

### UnifiedTaskRow.tsx
- Brak propa `dealStageBadge`. Render aktualnie ma `task.deal_team` badge (kolor zespołu). Dodam nowy badge **przed** title, między title a due_date — wg specu "między title a due_date" → wstawić w `<div className="flex items-center shrink-0">` ale przed `getDueDateDisplay()`.

### Plan zmian (3 pliki)

1. **`src/hooks/useDealsTeamAssignments.ts`**:
   - Rozszerzyć `DealTeamAssignment` o: `contact_temperature?: string | null`, `contact_client_status?: string | null`
   - W `useMyTeamAssignments`: select `'id, contact_id, category, offering_stage, temperature, client_status'`
   - W mapowaniu: `contact_temperature: tc?.temperature || null`, `contact_client_status: tc?.client_status || null`

2. **`src/components/tasks/UnifiedTaskRow.tsx`**:
   - Dodać `import { Search, FileText, Handshake, X, Sprout } from 'lucide-react'` — używam emoji w specie więc tylko literały string
   - Stałe `STAGE_ICON` (emoji), `STAGE_LABEL` (PL), `SUB_LABEL` (PL z emoji)
   - Nowy prop:
     ```ts
     dealStageBadge?: { stage: string; subCategory?: string };
     ```
   - Render badge przed `{getDueDateDisplay()}` w sekcji metadata.

3. **`src/components/deals-team/MyTeamTasksView.tsx`**:
   - `type ViewMode = 'grouped' | 'list'`
   - Usunąć imports: WORKFLOW_COLUMNS/adapter/pipelineConfig/dnd-kit/Columns3/Users/Progress + `reverseMapColumn` + Droppable/Draggable wrappers
   - Usunąć stan/memo: activeDragTask, sensors, handleDragStart/End, workflowKanban, funnelStats, teamData, FUNNEL_CATEGORIES, wfPipelineStages/Transitions
   - Usunąć JSX: ToggleGroupItem kanban+team (431-438), VIEW Kanban (578-689), VIEW Team (692-746)
   - **NOWY layout `grouped`**: zastąpić obecny "grouped per teamContact" — 4 collapsible sekcje (Dzisiaj/Zaległe/Nadchodzące7d/Wszystkie) wg spec
   - W `<UnifiedTaskRow>` dodać prop `dealStageBadge={task.contact_category ? { stage: task.contact_category, subCategory: task.contact_temperature ?? task.contact_offering_stage ?? task.contact_client_status ?? undefined } : undefined}`

### Decyzje
- **`SnoozeDialog`/`ConvertToClientDialog`** zostają w imports (nadal używane w Workflow Dialogs przy completion)
- **`STATUS_LABELS`** local const (linia 46-51) nie jest już używany po usunięciu team view — usuwam też
- **Stara `grouped` per kontakt** vs nowa **per czas** — spec mówi jasno "Collapsible sekcje Dzisiaj/Zaległe/Nadchodzące7d/Wszystkie", więc **zastępuję**, nie dodaję obok. Wpisanie kontaktu jako podgrupy w Wszystkie byłoby zbyt zagnieżdżone — flat lista w każdej sekcji + `dealStageBadge` daje kontekst.
- **`InlineTaskCreate`** (per kontakt) — używane tylko w starej grouped per kontakt. **Usuwam użycie**, ale komponent zostawiam (może być użyty kiedyś).
- **TypeScheck** po zmianach — `npx tsc --noEmit`.

