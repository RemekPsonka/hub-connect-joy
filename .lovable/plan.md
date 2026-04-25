## Problem

Na `/sgu/zadania` przy zadaniu Roberta Galary widzisz badge **„Umawiamy spotkanie"** (`offering_stage = meeting_plan`). Klikasz w niego → nic się nie dzieje. Powód: ten badge w `UnifiedTaskRow` jest **tylko wizualny** — nie ma żadnego `onClick`. Klik propaguje się do wiersza, który otwiera `TaskDetailSheet` (szczegóły zadania), a nie dialog umawiania spotkania.

Logicznie oczekujesz: skoro etap to „Umawiamy spotkanie", klik powinien otworzyć `MeetingScheduledDialog` (datownik + opcjonalnie „z kim"), który jest już w kodzie (`src/components/deals-team/MeetingScheduledDialog.tsx`) i robi dokładnie to: ustawia `offering_stage = decision_meeting`, zapisuje `next_meeting_date` i tworzy follow-up task.

## Zakres zmian

1. **`UnifiedTaskRow`** — dodaj prop opcjonalny `onStageBadgeClick?: () => void`. Gdy podany, badge dostaje `cursor-pointer hover:bg-muted` + `onClick={(e) => { e.stopPropagation(); onStageBadgeClick(); }}`. Brak propa = zachowanie stare (badge wizualny).

2. **`MyTeamTasksView`** — w `renderTaskRow` przekaż `onStageBadgeClick`, który gdy `task.contact_offering_stage === 'meeting_plan'`, ustawia stan `meetingScheduledFor = { teamContactId, contactId, contactName, teamId }` i otwiera istniejący `MeetingScheduledDialog`. Po `onConfirm` invalidacja query `['deal-team-assignments']` + ewentualne zamknięcie powiązanego task-a (jeśli to jest task „umów spotkanie z X" — sprawdzimy w czasie implementacji, czy `closesTask` ma być wywołane; na razie NIE zamykamy taska automatycznie, bo dialog tylko tworzy follow-up).

3. **Inne etapy (opcjonalne, scope-out)** — na razie tylko `meeting_plan` → `MeetingScheduledDialog`. Jeśli klikniesz w „Spotkanie umówione" / „Decyzja na spotkaniu" / „Handshake" itd., w tym kroku nadal nic się nie dzieje (brak handlera). Mogę to dorzucić w drugim ruchu po D2 review — zmapowanie wszystkich `offering_stage` na odpowiednie dialogi (`MeetingOutcomeDialog`, `EstimatedPremiumDialog` itp.).

4. **Affordance UX** — badge z `onStageBadgeClick` dostaje subtelny outline (`hover:border-primary/40`) + `title="Kliknij, aby zaktualizować etap"` żeby było jasne, że jest klikalny.

## Co BEZ zmian

- `MeetingScheduledDialog` — używamy 1:1, bez modyfikacji.
- `TaskDetailSheet` — nadal otwiera się klikiem w resztę wiersza.
- Schemat DB, RLS, edge functions — nic.
- Inne miejsca używające `UnifiedTaskRow` (Workspace, ContactTasksTab, Projekty) — bez zmian, bo `onStageBadgeClick` jest opcjonalne.

## Pliki dotknięte

- `src/components/tasks/UnifiedTaskRow.tsx` — nowy opcjonalny prop + handler na badge
- `src/components/deals-team/MyTeamTasksView.tsx` — stan dialogu + przekazanie callbacku + render `MeetingScheduledDialog`

## Smoke test po wdrożeniu

1. `/sgu/zadania` → znajdź zadanie z badge „Umawiamy spotkanie" (Robert Galara) → klik w badge → otwiera się `MeetingScheduledDialog`.
2. Wybierz datę → Zapisz → toast „Spotkanie umówione" → kontakt przesuwa się na etap `decision_meeting`, nowy task `Spotkanie z Robert Galara …` pojawia się na wskazaną datę.
3. Klik w wiersz poza badge nadal otwiera `TaskDetailSheet`.

## Po commicie

Jeśli OK — w drugim kroku domapuję pozostałe etapy klikalne (`decision_meeting` → `MeetingOutcomeDialog`, `handshake` → `EstimatedPremiumDialog` itd.), żeby cały wiersz był „one-click action" per etap.
