## Pre-flight findings (A/B/C/D)

**A. DnD handler** — `src/components/sgu/sales/UnifiedKanban.tsx` (line 700, `handleDragEnd`) uses `@dnd-kit/core`. Cards = `useDraggable({ id: contact.id })`, columns = `useDroppable({ id: col.stage })`. Stage IDs = `DealStage`. Legacy `KanbanBoard.tsx` (deals-team/) and `OfferingKanbanBoard.tsx` use HTML5 native `onDragEnd/onDrop`.

**B. Real Kanban columns today** (UnifiedKanban, line 72):
```
COLUMNS: prospect | lead | offering
```
Comment in code: column `client` was removed (clients live in `/sgu/klienci`). Subgroups inside the `lead` column = `temperature` (`hot/top/10x/cold`); subgroups inside `offering` = `offering_stage` (`decision_meeting/handshake/power_of_attorney/audit/offer_sent/negotiation/won/lost`).

**This contradicts the brief**, which assumes 6 separate columns (`Cold/Lead/Top/Hot/Klient`). Cold/Top/Hot/10x are NOT columns — they're badges/chips inside the `lead` column.

**C. Prospect → lead writes** — no `promote_to_lead` RPC. Inline `updateContact.mutate({ category: 'lead' })` is used in 2 places (UnifiedKanban L712, ConvertProspectDialog L89). Other relevant writes: `MyKanban.tsx`, `MilestoneActionStrip.tsx`.

**D. `useSguStageTransition`** — exists at `src/hooks/useSguStageTransition.ts`. API: `{ teamId, teamContactId, contactId, contactName, contactCompany, nextStage: SguStage|null, sourceTaskId, newTaskDueDate?, contactPatch? }`. It (1) closes source task, (2) UPDATEs `deal_team_contacts.offering_stage` + patch, (3) creates next task per `STAGE_ACTIONS` map. `SguStage` = `meeting_plan|meeting_scheduled|meeting_done|handshake|power_of_attorney|audit_scheduled|audit_done|won` — these are **offering stages**, not category columns.

**Legacy DnD in KanbanBoard.tsx**: separate component, has its own handler with 7 columns. Out of scope for this sprint (brief says only UnifiedKanban).

---

## Decision needed: column model conflict

The brief's transition matrix (Cold/Lead/Top/Hot/Klient as separate columns) does **not** match the current UnifiedKanban (`prospect/lead/offering` 3-column with sub-chips). Two options:

**Option A — Map brief intent onto real 3-column Kanban** (recommended, no UI restructure):
| Drop target | Source | Action |
|---|---|---|
| `lead` (column) | `prospect` | inline `category='lead'` (no dialog, current behavior kept) |
| `offering` | `lead` | open `ScheduleMeetingDialog` (NEW), then `category='offering'` + `offering_stage='meeting_scheduled'` + create meeting task |
| `client` reached via card K4 button | `offering` | `WonPremiumBreakdownDialog` (already wired via `convertContact` state, NOT via DnD) |
| Backwards (`offering→lead`, `lead→prospect`) | any | toast block "użyj akcji na karcie" |
| Skip >1 (`prospect→offering`) | any | toast block "wymaga pośrednich milestone'ów" |

`SignPoaDialog` would be invoked **inside the `offering` column** when user changes the sub-chip `offering_stage` from `handshake → power_of_attorney`, not on inter-column DnD (because POA is an offering sub-stage, not a column).

**Option B — Restructure Kanban to 6 columns** matching brief literally. Requires:
- Removing temperature sub-grouping from `lead`
- Re-adding `client` column (recently removed per code comment L76)
- Splitting `offering` into Top/Hot
- Big UX change beyond Sprint S7 scope, breaks existing meeting-progress logic, conflicts with Etap 2 decision that clients live in `/sgu/klienci`

---

## Proposed plan (Option A)

### New components
1. **`src/components/sgu/sales/ScheduleMeetingDialog.tsx`** — DatePicker + TimePicker (default +3 days, 10:00). Save uses `useSguStageTransition` with `nextStage='meeting_scheduled'`, `contactPatch={ category: 'offering', meeting_scheduled_at: <ISO> }`, and `newTaskDueDate=<ISO>`. Cancel = no-op. Includes `useRequireDirector` guard with toast on missing director.

2. **`src/components/sgu/sales/SignPoaDialog.tsx`** — DatePicker (default today). Save uses `useSguStageTransition` with `nextStage='power_of_attorney'`, `contactPatch={ poa_signed_at, handshake_at: COALESCE }`. Wired into the offering sub-chip change (handshake→power_of_attorney), not into inter-column DnD. `useRequireDirector` guard.

### Refactor `UnifiedKanban.handleDragEnd`
Replace the existing 3 inline branches with a transition matrix:
```text
prospect → lead     : inline category='lead' (no dialog)
lead     → offering : open ScheduleMeetingDialog → save uses useSguStageTransition
offering → *        : block (clients via card K4)
backward (target idx < source idx)         : toast "Nie można cofnąć…"
skip > 1 (target idx > source idx + 1)     : toast "Wymaga pośrednich milestone'ów"
same column                                : no-op (existing)
```
Cancel of dialog = no DB write → @dnd-kit naturally leaves the card visually unmoved (no optimistic update is applied before save).

### Hook usage
Both new dialogs go through `useSguStageTransition` (no inline `supabase.from().update()`). `MeetingDecisionDialog` (S5) and `WonPremiumBreakdownDialog` (Etap 2) remain untouched and keep their card-button entry points.

### Hard constraints honored
- No changes to `useSguStageTransition` API
- No changes to `MeetingDecisionDialog`, `WonPremiumBreakdownDialog`
- No new column added (and none removed)
- No writes to `deal_stage` (GENERATED)
- `useRequireDirector` guard preserved
- No DnD library swap, no animations, no tests
- Legacy `KanbanBoard.tsx` / `OfferingKanbanBoard.tsx` not touched

### Files to create / edit
- create `src/components/sgu/sales/ScheduleMeetingDialog.tsx`
- create `src/components/sgu/sales/SignPoaDialog.tsx`
- edit `src/components/sgu/sales/UnifiedKanban.tsx` (handleDragEnd + state for new dialogs + sub-chip handler wiring SignPoaDialog when offering_stage moves to power_of_attorney)
- edit `.lovable/plan.md`

### Smoke checklist (after build)
- prospect→lead: no dialog, card moves
- lead→offering: ScheduleMeetingDialog opens, save → `meeting_scheduled_at` set, meeting task created, card lands in offering
- lead→offering then cancel: card returns to lead, no DB write
- offering→lead (backward): toast "Nie można cofnąć…", card returns
- prospect→offering (skip): toast "Wymaga pośrednich…", card returns
- offering sub-chip handshake→power_of_attorney: SignPoaDialog opens, save → `poa_signed_at` set
- Klient conversion still works via card K4 → WonPremiumBreakdownDialog (unchanged)

---

## Open question for approval

**Approve Option A** (map brief's intent onto real 3-column Kanban + wire `SignPoaDialog` into the offering sub-chip change), **or** push back and request Option B (restructure to 6 columns)? Option A keeps Etap 2 decisions intact and is ~1/4 the scope.