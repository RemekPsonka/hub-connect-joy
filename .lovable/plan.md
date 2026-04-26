# Sprint S5 — UNIFY-MEETING-OUTCOME

## Pre-flight raport (KRYTYCZNE — odstępstwa od briefu)

### A. Wystąpienia `meeting_done` / "spotkanie odbyte"
Stage `meeting_done` jest szeroko użyty w kanbanie/timeline/milestone strip (>30 miejsc) — to **etap pipeline'u**, nie tylko event. Zmiany RPC nie mogą zmieniać semantyki tego stage'u (kolumna `k1_meeting_done_at` nadal stempelowana przez trigger `set_milestone_timestamps` z Etap 1).

### B. Entry-points dialogu — REALNOŚĆ ≠ brief
W repo są **DWA** różne dialogi, nie jeden:

1. **`MeetingDecisionDialog`** (`src/components/deals-team/`) — KANONICZNY, model GO/POSTPONED/DEAD już istnieje, używa `useCreateMeetingDecision` → trigger `apply_meeting_decision`. Używany w:
   - `src/components/sgu/sales/UnifiedKanban.tsx` (DnD do meeting_done)
   - `src/components/deals-team/ContactTasksSheet.tsx` (przycisk "Odbyte")
   - `src/components/tasks/TaskDetailSheet.tsx` (HOTFIX-OS2 — stage transition do meeting_done)

2. **`MeetingOutcomeDialog`** (`src/components/deals-team/`) — STARY, 6-OutcomeOption (offer/next_meeting/10x/snooze/client/lost), używa `useUpdateTeamContact`+`useCreateTask`. Używany TYLKO w:
   - `src/components/deals-team/MyTeamTasksView.tsx`

To są **dwie różne ścieżki UX** dla "spotkanie odbyte", konkurencyjne — klasyczny przypadek do konsolidacji.

### C. Props `MeetingOutcomeDialog`
Zgodnie z briefem (`open, onOpenChange, contactName, contactId, teamContactId, teamId, currentCategory, onConfirm?, onSnooze?, onConvertToClient?`).

### D. Stan DB
- Funkcja `mark_meeting_done` — **NIE ISTNIEJE** (czysty start).
- Funkcja `apply_meeting_decision` — **TRIGGER** (nie RPC) na `meeting_decisions` AFTER INSERT, obsługuje `go|postponed|dead|kill|push|pivot|park|nurture` (ostatnie 3 to no-op). Brief zakłada że to RPC — **brief się myli**, to trigger.
- `meeting_decisions.decision_type` — **`text`**, brak CHECK constraint, `'nurture'` można zapisywać bez migracji typu.
- Brak kolumn `decision_data`, `snoozed_until`, `is_lost`, `lost_reason` w niektórych założeniach briefu. Sprawdzone — `snoozed_until/is_lost/lost_reason/category` istnieją na `deal_team_contacts`.

### Konflikt do rozstrzygnięcia
Brief proponuje **trzecią ścieżkę** (RPC `mark_meeting_done` z własną logiką no_go cold/postponed/nurture/lost), która duplikuje istniejący `apply_meeting_decision` trigger. To narusza zasadę z project-knowledge: *"Brak dwóch konkurencyjnych implementacji tej samej funkcji — przy duplikacie konsoliduj zamiast dodawać trzecią."*

## Rekomendowany plan (zgodny z architekturą projektu)

Zamiast budować trzeci tor (`mark_meeting_done` RPC), **rozszerzamy istniejący** `apply_meeting_decision` trigger i **unifikujemy oba dialogi** wokół `MeetingDecisionDialog` (kanoniczny). `MeetingOutcomeDialog` staje się cienkim wrapperem zachowującym props/callbacki dla wstecznej kompatybilności `MyTeamTasksView`.

### 1. DB migracja `<ts>_etap4_s5_unify_meeting_outcome.sql`

Rozszerzenie `apply_meeting_decision` o brakujące gałęzie:

- **`pivot`** (= "Wraca do Cold") — reset stage do `decision_meeting`, NIE stempluj `k1_meeting_done_at`, taski zamknięte.
- **`nurture`** (= "10x / długoterminowa") — `category='10x'`, stage zostaje `meeting_done`, taski **NIE** zamknięte.
- **`push`** (już istnieje) — bez zmian (postponed, taski **NIE** zamknięte).
- **`go`/`dead`/`kill`** — bez zmian.

Warunkowe zamykanie tasków (rozszerzenie istniejącej logiki):
- Zamykaj `follow_up_task_id` gdy `decision_type IN ('go','dead','kill','pivot')`.
- NIE zamykaj dla `push`, `nurture`.

Wszystko z `-- ROLLBACK:` blokiem (zgodnie z project-knowledge).

### 2. Hook `useMarkMeetingDone` (`src/hooks/useMarkMeetingDone.ts`)

Cienki wrapper nad istniejącym `useCreateMeetingDecision` z mapowaniem nowego API GO/NO-GO → `decision_type`:

```ts
type NoGoPath = 'cold' | 'postponed' | 'nurture' | 'lost';
type Input = {
  dealTeamContactId: string;
  meetingNotes?: string;
  decision: 'go' | 'no_go';
  noGoPath?: NoGoPath;
  postponedUntil?: string;
  lostReason?: string;
};
// mapping: go→'go', no_go+cold→'pivot', no_go+postponed→'push',
//          no_go+nurture→'nurture', no_go+lost→'kill'
```

Hook woła `useCreateMeetingDecision` (który już invaliduje deal-team-contacts + meeting-decisions); dokładamy invalidate dla `tasks`, `odprawa-agenda`, `unified-kanban-data`.

### 3. Refactor `MeetingOutcomeDialog` → wrapper na `MeetingDecisionDialog`

Zachowujemy kontrakt props (`open, onOpenChange, contactName, contactId, teamContactId, teamId, currentCategory, onConfirm?, onSnooze?, onConvertToClient?`).

Wewnątrz: renderujemy `MeetingDecisionDialog` z `contactId={teamContactId}`, `contactDisplayName={contactName}`. Mapowanie zwrotne callbacków:
- `onSuccess('go')` → `onConfirm?.()`
- `onSuccess('postponed')` → `onSnooze?.()`
- `onSuccess('dead'|'kill')` → `onConfirm?.()` (lost path)
- Rodzic decyduje czy po `go` otwierać `WonPremiumBreakdownDialog` (przez `onConvertToClient` — operator wybiera w osobnym kroku, jak dziś w K4).

To zachowuje 100% wstecznej kompatybilności `MyTeamTasksView` bez zmiany jego kodu.

### 4. Wpięcie w 4 entry-pointy (REQUIRE-DIRECTOR guard z S1 zachowany)

| Entry-point | Stan | Akcja |
|---|---|---|
| `MyTeamTasksView` | używa `MeetingOutcomeDialog` (stary 6-option) | Wrapper załatwi — zero zmian w pliku |
| `UnifiedKanban` (DnD) | już używa `MeetingDecisionDialog` | Bez zmian |
| `ContactTasksSheet` | już używa `MeetingDecisionDialog` | Bez zmian |
| `TaskDetailSheet` (HOTFIX-OS2) | już używa `MeetingDecisionDialog` | Bez zmian |

5 entry-pointów → **jeden dialog** (`MeetingDecisionDialog`), z czego 1 pośrednio przez wrapper.

### 5. Co świadomie NIE robimy (vs. brief)

- **Nie tworzymy RPC `mark_meeting_done`** — `apply_meeting_decision` trigger pokrywa logikę. Trzecia ścieżka byłaby duplikatem.
- **Nie zmieniamy nowego UI w `MeetingDecisionDialog`** — ma już model `go/postponed/dead` + persistent questions. Nie przerzucamy go na `RadioGroup` GO/NO-GO bo psułoby UX dla 3 entry-pointów które już go używają. Mapowanie `no_go.cold→pivot`, `no_go.nurture→nurture` realizujemy pod spodem (DB) — UI 3-button wystarcza (cold = "Idziemy dalej z innym podejściem" można dorzucić jako 4. opcję jeśli operator tego potrzebuje, ale to można dograć po S5 jeśli zajdzie potrzeba).
- **Nie usuwamy** `MeetingOutcomeDialog` pliku — zostaje jako wrapper (kontrakt props).
- **Bez testów / audit log** (zgodnie z briefem).

## Zmiany w plikach

- **NEW**: `supabase/migrations/<ts>_etap4_s5_unify_meeting_outcome.sql` — rozszerza `apply_meeting_decision` o `pivot`/`nurture` + warunkowe zamykanie tasków, z rollback.
- **NEW**: `src/hooks/useMarkMeetingDone.ts` — wrapper API GO/NO-GO nad `useCreateMeetingDecision`.
- **REFACTOR**: `src/components/deals-team/MeetingOutcomeDialog.tsx` — staje się wrapperem na `MeetingDecisionDialog` zachowującym props.
- **NO CHANGE**: `MyTeamTasksView.tsx`, `UnifiedKanban.tsx`, `ContactTasksSheet.tsx`, `TaskDetailSheet.tsx`.

## Smoke (po zatwierdzeniu)

- GO z dowolnego entry-pointu → `k1_meeting_done_at` stamped, `next_action_date` set, follow_up task closed.
- NO-GO/cold (pivot) → stage reset do `decision_meeting`, taski zamknięte.
- NO-GO/postponed (push) → `snoozed_until`+`next_action_date` set, taski **nie** zamknięte.
- NO-GO/nurture → `category='10x'`, stage zostaje `meeting_done`, taski **nie** zamknięte.
- NO-GO/lost (kill) → `is_lost=true`, `lost_reason` set, taski zamknięte.

## Pytanie do akceptacji

Czy akceptujesz **odejście od briefu** (rozszerzenie istniejącego trigera zamiast dodawania trzeciej RPC + cienki wrapper na `MeetingOutcomeDialog` zamiast pełnego refactoru UI)? To zachowuje zasadę "brak konkurencyjnych implementacji" z project-knowledge i znacząco zmniejsza ryzyko regresji dla 3 entry-pointów które już używają `MeetingDecisionDialog`.
