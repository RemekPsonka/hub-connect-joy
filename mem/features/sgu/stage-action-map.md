---
name: SGU stage→action map
description: Centralna mapa offering_stage → przycisk + dialog + następny etap. Każdy kontakt w lejku ma 1 aktywny task; ghost rows pokrywają luki.
type: feature
---
Lejek SGU (kolejność uzgodniona z Remkiem 2026-04):
meeting_plan → meeting_scheduled → meeting_done → handshake → power_of_attorney → audit_scheduled → audit_done → won

Pojedyncze źródło prawdy: `src/lib/sgu/stageActionMap.ts` (`STAGE_ACTIONS`, `buildTaskTitle`, `asSguStage`).
Format tytułu zadania: "{akcja} — {Imię Nazwisko} ({Firma})".

Tranzycja etapu: `useSguStageTransition` (zamyka stary task, ustawia stage, tworzy nowy task z mapy).
Ghost rows: `useMyTeamAssignments` syntetyzuje wpis dla każdego kontaktu w trackedStages bez aktywnego taska.
Orphany: zadania bez `deal_team_contact_id` są filtrowane z widoku /sgu/zadania.

Dialogi per etap:
- meeting_plan → MeetingScheduledDialog
- meeting_scheduled → MeetingOutcomeDialog
- meeting_done → NextActionDialog
- handshake → EstimatedPremiumDialog (NOWY) — pole: składka roczna PLN
- power_of_attorney → PoaSignedDialog (NOWY) — pole: data podpisania
- audit_scheduled → AuditScheduleDialog (NOWY) — pole: data audytu
- audit_done → AuditDoneDialog (NOWY) — opcjonalna korekta składki
- won → ConvertToClientDialog
