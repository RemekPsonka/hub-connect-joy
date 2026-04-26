# Sprint S7-v2 — DnD Kanban 5-kolumnowy

## Pre-flight (zgłoszone)

- **A.** `handleDragEnd(_event)` w `UnifiedKanban.tsx` linie 710-714 — pusty stub po S6.5 ✓
- **B.** `ScheduleMeetingDialog.tsx` + `SignPoaDialog.tsx` istnieją w `src/components/sgu/sales/` ✓
- **C.** Oba dialogi mają props: `dealTeamContactId, teamId, contactName` ✓
- **D.** ⚠️ **`MeetingDecisionDialog` (S5) ma węższe API niż brief**:
  ```ts
  { contactId, contactDisplayName, open, onOpenChange, onSuccess?: (decisionType) => void }
  ```
  Brak `teamId` w props (dialog sam aktualizuje DB przez `useCreateMeetingDecision`). Adaptujemy mount do realnego API.
- **E.** `KANBAN_COLUMN_ORDER = ['prospect','cold','lead','top','hot']` ✓

## Transition matrix

| From → To | Akcja |
|---|---|
| prospect → cold | inline `updateContact({ category: 'lead' })` |
| cold → lead | otwórz `ScheduleMeetingDialog` |
| lead → top | otwórz `MeetingDecisionDialog` (S5) |
| top → hot | otwórz `SignPoaDialog` |
| same | no-op |
| toIdx < fromIdx | toast: "Nie można cofnąć kontaktu w Kanbanie. Użyj akcji na karcie kontaktu." |
| toIdx > fromIdx + 1 | toast: "Wymaga wykonania pośrednich milestone'ów." |

Hot → klient pozostaje przez K4 button na karcie (poza DnD).

## Zmiany w `UnifiedKanban.tsx`

1. **Importy**: `KANBAN_COLUMN_ORDER, deriveKanbanColumn, type KanbanColumn` z `@/lib/sgu/deriveKanbanColumn`; `MeetingDecisionDialog` z `@/components/deals-team/MeetingDecisionDialog`; `ScheduleMeetingDialog`, `SignPoaDialog` z lokalnego folderu.
2. **State** (3 nowe): `scheduleMeetingContact`, `meetingDecisionContact`, `signPoaContact` — każdy `DealTeamContact | null`.
3. **`handleDragEnd`** — pełna implementacja matrixu wg tabeli; `fromCol` z `deriveKanbanColumn(contact)`, `toCol` z `over.id as KanbanColumn`. Cancel dialogu = drop wraca naturalnie (zero DB write).
4. **`handleOfferingStageChange`** — przywróć intercept dla `power_of_attorney`:
   ```ts
   if (next === 'power_of_attorney') { setSignPoaContact(c); return; }
   ```
5. **JSX** — dodaj 3 conditional mounty po `<ContactSheet>` (tuż przed końcem return). Dla `MeetingDecisionDialog`: `contactId={meetingDecisionContact.id}`, `contactDisplayName={...full_name ?? 'kontakt'}`, **bez `teamId`**.

## Hard constraints respected

- Nie modyfikuję `deriveKanbanColumn`, `useSguStageTransition`, ani API żadnego z 3 dialogów
- Nie dodaję kolumny Klient
- Nie piszę do `deal_stage` (GENERATED)
- Nie usuwam REQUIRE-DIRECTOR guardów
- Brak migracji SQL, brak nowych zależności

## Pliki

- **edit**: `src/components/sgu/sales/UnifiedKanban.tsx` (handleDragEnd, handleOfferingStageChange, 3 dialog mounts, importy, state)
- **edit**: `.lovable/plan.md` (entry S7-v2)

## Smoke test plan (po implementacji)

- Drop Prospekt→Cold (no dialog, inline category update)
- Drop Cold→Lead → ScheduleMeetingDialog
- Drop Lead→Top → MeetingDecisionDialog (S5 GO/POSTPONED/DEAD)
- Drop Top→Hot → SignPoaDialog
- Drop Hot→Top → toast "nie można cofnąć"
- Drop Cold→Top → toast "skip>1"
- Drop dialog cancel → kontakt wraca
- Sub-chip handshake→power_of_attorney w Hot → SignPoaDialog
- tsc + eslint clean


## S7-v2 (DONE)

5-kolumnowy DnD transition matrix przywrócony:
- prospect→cold: inline category=lead
- cold→lead: ScheduleMeetingDialog
- lead→top: MeetingDecisionDialog (S5)
- top→hot: SignPoaDialog
- wstecz / skip>1: toast blokady

Sub-chip handshake→power_of_attorney intercept przywrócony (otwiera SignPoaDialog).
Dialogi z S7-v1 + S5 reused bez modyfikacji API.
