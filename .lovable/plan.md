

# HOTFIX-OS2 plan-v2 — Wire "Spotkanie odbyte" w TaskDetailSheet → MeetingDecisionDialog + zamknięcie taska

## Kluczowe ustalenia z reconu (commit 0724311)

| Założenie plan-v1 | Realny kod |
|---|---|
| Props: `teamContactId, teamId, contactId, onDecisionSaved(decision)` | **`contactId, contactDisplayName, open, onOpenChange, onSuccess()`** — bez payload |
| Trigger N-apply zadba o `tasks` | **FAŁSZ** — `trg_apply_meeting_decision` rusza tylko `deal_team_contacts` |
| `tasks.completed_at` istnieje | **NIE ISTNIEJE** — set tylko `status='completed'` |
| `TaskDetailSheet` musi liczyć contactId | **JUŻ POLICZONE** w linii 461-465 (`pipelineContactId`, `pipelineContactName`, `isPipelineTask`) |

## Scope: 1 plik, ~20 linii diff

`src/components/tasks/TaskDetailSheet.tsx`

### Zmiany

**1. Importy (top)**
```tsx
import { MeetingDecisionDialog } from '@/components/deals-team/MeetingDecisionDialog';
import { useUpdateTask } from '@/hooks/useTasks';
```

**2. State + hook** (obok istniejących `useState`)
```tsx
const [meetingDecisionOpen, setMeetingDecisionOpen] = useState(false);
const updateTask = useUpdateTask();
```

**3. Guard w `handleWorkflowChange`** (po `const match = ...`, PRZED `if (!match) return;`)
```tsx
if (!match) return;

// HOTFIX-OS2: meeting_done → otwórz dialog decyzji zamiast cichego UPDATE
if (match.stage === 'meeting_done' && isPipelineTask && pipelineContactId) {
  setMeetingDecisionOpen(true);
  return;
}
```

**4. Render dialogu** (na końcu JSX)
```tsx
{isPipelineTask && pipelineContactId && (
  <MeetingDecisionDialog
    open={meetingDecisionOpen}
    onOpenChange={setMeetingDecisionOpen}
    contactId={pipelineContactId}
    contactDisplayName={pipelineContactName || 'kontakt'}
    onSuccess={async () => {
      setMeetingDecisionOpen(false);
      // Każda decyzja (go/postponed/dead) = spotkanie odbyte → task zamknięty
      try {
        await updateTask.mutateAsync({
          id: task.id,
          status: 'completed',
        });
      } catch (err) {
        console.error('[HOTFIX-OS2] Failed to close task after meeting decision', err);
      }
    }}
  />
)}
```

## Dlaczego każda decyzja zamyka task

`MeetingDecisionDialog` ma 3 opcje (`go` / `postponed` / `dead`). Wszystkie oznaczają że spotkanie się odbyło i user podjął decyzję — task "umów/przygotuj K1" zrealizowany. `dead` = "spotkanie odbyte, kontakt odpada" (N-apply trigger ustawia `is_lost=true` per kontakt). Nie zostawiamy logiki rozróżniającej decision type, bo `onSuccess` nie dostaje payload — i nie potrzebuje.

## ZERO zmian w

- `MeetingDecisionDialog.tsx`
- `useTasks.ts` / `useDealsTeamContacts.ts` / `useMeetingDecisions.ts`
- Migracje DB (N-apply trigger już aplikuje wszystko po stronie kontaktu)
- Każdy parent renderujący `<TaskDetailSheet>` (zero callback props do dodania — dialog lokalny)

## Pre-flight (po execute)

1. `grep -n "setMeetingDecisionOpen" src/components/tasks/TaskDetailSheet.tsx` → 2 hits (declare + setter)
2. `grep -n "MeetingDecisionDialog" src/components/tasks/TaskDetailSheet.tsx` → 2 hits (import + render)
3. `grep -rn "MeetingDecisionDialog" src/ --include="*.tsx"` poza TaskDetailSheet → bez nowych usages w innych plikach (UnifiedKanban.tsx pozostaje)
4. `npx tsc --noEmit` → 0 nowych errors
5. Lint na zmodyfikowanym pliku → 0 nowych warnings

## STOP conditions

- TYLKO 1 plik: `TaskDetailSheet.tsx`
- Guard `match.stage === 'meeting_done' && isPipelineTask && pipelineContactId` (3-warunkowy AND)
- `status='completed'` BEZ `completed_at` (kolumna nie istnieje)
- `setMeetingDecisionOpen(false)` PRZED `try` — dialog zamknięty nawet jeśli update task fails
- Zero `console.log` poza `console.error` w catch (debugging hotfixu)
- Zero `any` (jeśli `(task as any).deal_team_id` już jest w pliku, nie dodawaj nowych)

## Edge cases

| Scenariusz | Zachowanie |
|---|---|
| Cancel w dialogu | Dialog zamknięty, task stage NIE zmieniony, task NIE zamknięty |
| `updateTask` throw | console.error + toast.error z `useUpdateTask.onError`, dialog mimo wszystko zamknięty, task pozostaje otwarty (user widzi w refresh) |
| `pipelineContactId` pusty mimo `isPipelineTask=true` | Guard nie odpala, fallback na zwykły `updateContact.mutate` (legacy) |
| Task spoza lejka (`isPipelineTask=false`) | Guard nie odpala — `meeting_done` nie powinien wystąpić w workflow takiego taska |
| Decyzja `dead` | N-apply trigger: `is_lost=true, category='lost'`. Task: `status='completed'`. Spójne. |

## Raport po execute

1. Diff `TaskDetailSheet.tsx` (linie zmienione, ~+20/-0)
2. Pre-flight #1-#5 wyniki (grep counts, tsc, lint)
3. Confirm grep #3: `MeetingDecisionDialog` poza TaskDetailSheet = tylko `UnifiedKanban.tsx` (bez nowych usages)
4. Manual smoke wskazówka dla usera: Mirek Pawełczyk → /sgu/sprzedaz → klik task → "Etap zadania" → "Spotkanie odbyte" → dialog → "Idziemy" + data → Zapisz → task zamknięty + kontakt w Ofertowanie

## Backlog (osobne sprinty, NIE ten hotfix)

- **B-FIX.13** — Trigger BEFORE INSERT ON tasks: `deal_team_contacts.assigned_to → tasks.assigned_to` (Problem 2: RP vs Nieprzypisane)
- **B-FIX.14** — `useCurrentDirector` fallback dla admin/owner bez wpisu w `directors` (entry point #1: ikona ✓ na kanbanie)
- **B-FIX.15** — Memory cleanup: poprawić `project_meeting_decision_application_gap.md` na "DOMKNIĘTY przez 2 entry points + zamknięcie taska"
- **DIAG-1** — Problem 1 (HOT+TOP badges): potrzebny screenshot z dokładnego miejsca przed diagnozą
- **ODPRAWA-00** — Problem 4: greenfield spec dla `/sgu/odprawa` (osobny duży sprint)

