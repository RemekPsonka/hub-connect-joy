# ODPRAWA-NEXTSTEP-01 — retrospektywa milestone + zadania

Pivot karty kontaktu w `/sgu/odprawa`: zamiast 4 abstrakcyjnych decyzji + 6 milestone w pasku operacyjnym budujemy 3 sekcje: **Co się stało** (pasek nieosiągniętych milestone'ów), **Co dalej** (jeden button "+ Stwórz zadanie"), **Wyjątki** (Odłóż / Utracony). Quick actions skracają się do Zadzwoń / Mail / Notatka. Manualny advance "→ Następny kontakt" zawsze w prawym górnym rogu karty. Auto-advance odpala się TYLKO po utworzeniu zadania.

## Pre-flight (raw)

- **0.1** `meeting_decisions.follow_up_task_id` — **brak** → migracja wymagana.
- **0.2** Trigger `trg_set_milestone_timestamps` (BEFORE UPDATE OF offering_stage):
  - `meeting_done` → `k1_meeting_done_at`
  - `handshake` → `handshake_at`
  - `power_of_attorney` → `handshake_at` + `poa_signed_at`
  - **`audit_done` → `audit_done_at`** ⚠️ (nie `'audit'` — spec mówiła `'audit'`, baza wymaga `'audit_done'`)
  - `won` → `won_at`
- **0.3** `tasks` schema: `title NOT NULL`, **`description`** (nie `body`), `assigned_to uuid`, `owner_id uuid`, `due_date date NULL`, `status text`, `deal_team_id`, `deal_team_contact_id`. **Brak `team_id`**, brak `created_by`. → INSERT używa `description` + `owner_id` (creator).
- **0.4** `task_contacts(task_id, contact_id, role)` — link przez `contact_id` (czyli `contacts.id`, nie `deal_team_contacts.id`).
- **0.5** **Brak tabeli `team_directors`**. Członkowie zespołu są w `deal_team_members(team_id, director_id, is_active)`. `directors(id, full_name, email)`. → hook `useTeamDirectors` zrobi join przez `deal_team_members`.

## Plan implementacji

### A. Migracja SQL
Plik `supabase/migrations/<ts>_meeting_decisions_follow_up_task.sql`:
```sql
ALTER TABLE public.meeting_decisions
  ADD COLUMN IF NOT EXISTS follow_up_task_id uuid
  REFERENCES public.tasks(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_meeting_decisions_follow_up_task
  ON public.meeting_decisions(follow_up_task_id)
  WHERE follow_up_task_id IS NOT NULL;
```

### B. `useContactTimelineState.ts` — modyfikacja
- Usuwa pole `availableDecisions` (oraz typ `DecisionKey` z eksportów modułu? **zostawiam typ** — na wszelki wypadek; tylko logika znika).
- Dodaje:
  - `availableMilestones: MilestoneKey[]` — lista nieosiągniętych w kolejności k1→k2→k2+→k3→k4 (k4 dopiero gdy k3 osiągnięty); pusta gdy `isLost || isWon`.
  - `nextStepSuggestion: { title: string; stageKey: MilestoneKey | null }` — pre-fill tytułu zadania per `currentMilestone` (Skontaktuj się…/Domknij handshake…/Wyślij POA…/Zaplanuj audyt…/Wyślij ofertę…). Dla `k4` zwraca `{ title: '', stageKey: null }`.
  - Imiona kontaktu pobiera z relacji `contact` na `DealTeamContact` (typ rozszerzymy na `Pick<...> & { full_name?, company_name? }` — w praktyce hook bierze teraz cały dtc i można sięgnąć do `contact.full_name`/`contact.company`; rozszerzam sygnaturę).

### C. `MilestoneActionStrip.tsx` (nowy)
`src/components/sgu/odprawa/MilestoneActionStrip.tsx`. Nagłówek: **"Co się stało od ostatniej odprawy?"**. Renderuje pasek przycisków `outline size="sm"` dla każdego `state.availableMilestones`:
- k1 → "Spotkanie odbyte" → `offering_stage='meeting_done'`
- k2 → "Handshake" → `'handshake'`
- k2+ → "POA podpisane" → `'power_of_attorney'`
- k3 → "Audyt zrobiony" → **`'audit_done'`** (per pre-flight 0.2)
- k4 → "Klient" → `'won'` + `status='won'` + `category='client'` (zielony `bg-emerald-600 text-white`)

Klik:
1. `UPDATE deal_team_contacts SET offering_stage=…` (trigger stempelmuje timestamp).
2. `useLogDecision({ decision:'push', milestoneVariant:k, odprawaSessionId, ... })` — audit w `meeting_decisions`.
3. Invalidate `['deal_team_contact_for_agenda']`, `['odprawa-agenda']`, `['odprawa-session-decisions']`.
4. Toast. **Karta zostaje** (brak auto-advance).

### D. `NextStepDialog.tsx` (nowy) + hook `useTeamDirectors`
`src/components/sgu/odprawa/NextStepDialog.tsx`. Nagłówek sekcji: **"Co dalej?"**. Pojedynczy `Button` "+ Stwórz zadanie" (ukryty gdy `nextStepSuggestion.title === ''`).

Dialog:
- **Tytuł** `Input` (pre-fill `state.nextStepSuggestion.title`).
- **Wykonawca** `Select` z directorami zespołu (default = opiekun kontaktu `dtc.assigned_director_id` jeśli istnieje, fallback = current user). Lista z nowego hooka.
- **Termin** `Select`: `+7 dni` (default → `due_date = today+7`), `Do kolejnej odprawy` (`null`), `Konkretna data` (otwiera inline `Calendar`), `Bez terminu` (`null`).
- **Notka** `Textarea` opcjonalna.

Submit:
1. INSERT `tasks`: `{ tenant_id, title, description: notes||null, status:'open', assigned_to: assigneeId, owner_id: authUserId, due_date, deal_team_id: teamId, deal_team_contact_id: dtc.id }`. **Brak** `team_id`/`body`/`created_by`.
2. INSERT `task_contacts`: `{ task_id, contact_id: dtc.contact_id, role:'primary' }` (uwaga: kolumna `contact_id`, nie `deal_team_contact_id` — per 0.4).
3. `useLogDecision({ decision:'push', milestoneVariant: state.nextStepSuggestion.stageKey ?? state.currentMilestone, odprawaSessionId, notes: title, followUpTaskId: task.id })`.
4. Invalidate `['odprawa-contact-tasks', dtc.contact_id]`, `['odprawa-session-decisions']`, `['tasks']`.
5. `onCreated()` → parent woła `handleManualAdvance` → **auto-advance**.

Nowy hook `src/hooks/odprawa/useTeamDirectors.ts`:
```ts
useQuery(['team-directors', teamId], async () => {
  const { data } = await supabase
    .from('deal_team_members')
    .select('director:directors!inner(id, full_name, email)')
    .eq('team_id', teamId).eq('is_active', true);
  return (data ?? []).map(r => r.director);
});
```

### E. `OdprawaExceptionsBar.tsx` (nowy)
`src/components/sgu/odprawa/OdprawaExceptionsBar.tsx`. Nagłówek: **"Wyjątki"**. Dwa buttony przeniesione 1:1 z `DecisionButtons`:
- **Odłóż** (`outline`) → dialog z `Calendar` (default +7d) → `useLogDecision('park', postponedUntil)` + `UPDATE deal_team_contacts SET snoozed_until=…`. Karta zostaje.
- **Utracony** (`destructive`) → `AlertDialog` z `Textarea` (powód wymagany) → `useLogDecision('kill', deadReason)` + `UPDATE deal_team_contacts SET is_lost=true, lost_reason=…, lost_at=now(), status='lost'`. Karta zostaje.

### F. `useLogDecision.ts` — rozszerzenie
- Dodaje pole `followUpTaskId?: string | null` do `LogDecisionInput`.
- W INSERT dorzuca `follow_up_task_id: input.followUpTaskId ?? null`.
- Bez zmian invalidate.

### G. `OperationalActions.tsx` — skrócenie
Usuwa: `Umów spotkanie`, `Spotkanie umówione`, `Spotkanie odbyte`, `Audyt zrobiony`, `Wyślij ofertę`, `10x` (przeniesione/wycofane). Zostają: **Zadzwoń**, **Mail**, **Notatka** + ich dialog notatki. Importy `CalendarPlus/Clock/Check`, `ClipboardCheck`, `Send`, `Sparkles`, `useUpdateTeamContact` — usuwane.

### H. `DecisionButtons.tsx` — DELETE
Plik kasowany. Wszystkie referencje (tylko `SGUOdprawa.tsx`) zastąpione 3 nowymi komponentami.

### I. `SGUOdprawa.tsx` — przebudowa karty
Layout `CardContent` w kolejności:
1. `ContactTimeline`
2. `ContactTasksInline`
3. `MilestoneActionStrip` (gdy `active`)
4. `NextStepDialog` (gdy `active`, z `onCreated={handleManualAdvance}`)
5. `OdprawaExceptionsBar` (gdy `active`)
6. `OperationalActions` (3 buttony)

W `CardHeader` (prawy róg, obok tytułu) — button **`→ Następny kontakt`** (variant=`outline`, widoczny gdy `active`). onClick = `handleManualAdvance`.

`handleManualAdvance` = wyciągnięta logika z dotychczasowego `handleDecisionLogged` (lookup `deal_team_contacts.id` przez `contact_id+team_id`, `advanceMut.mutateAsync`, fallback finish + `navigate('/sgu/odprawa/historia')`). Stara `handleDecisionLogged` znika razem z `DecisionButtons` (oraz import `DecisionKey` jeśli niepotrzebny).

### J. Acceptance
- SQL: `follow_up_task_id` istnieje + FK do `tasks` + index.
- `rg "DecisionButtons" src/` → 0 hitów.
- Pliki nowe: `MilestoneActionStrip.tsx`, `NextStepDialog.tsx`, `OdprawaExceptionsBar.tsx`, `useTeamDirectors.ts`.
- `npm run typecheck` clean.

## Odchylenia od specyfikacji (do akceptacji)

1. **K3 stage = `'audit_done'` (nie `'audit'`)** — trigger w bazie wymaga `audit_done`, inaczej `audit_done_at` nie zostanie ostemplowany. Spec mówiła `'audit'`. Stosuję wartość z bazy.
2. **`tasks` insert: `description` (nie `body`), `owner_id` (nie `created_by`), brak `team_id`** — używam `deal_team_id` na zespół + `deal_team_contact_id` dla bezpośredniego linka.
3. **`task_contacts.contact_id`** = `dtc.contact_id` (FK do `contacts.id`), per pre-flight 0.4.
4. **`team_directors` nie istnieje** — `useTeamDirectors` joinuje przez `deal_team_members(team_id, director_id) → directors`.
5. **10x button** — wycinam z `OperationalActions` razem z innymi (per spec sekcja F „werdykt opcjonalny"). Można dorzucić w osobnym ticketcie.

## Dotknięte pliki
- **+** `supabase/migrations/<ts>_meeting_decisions_follow_up_task.sql`
- **+** `src/components/sgu/odprawa/MilestoneActionStrip.tsx`
- **+** `src/components/sgu/odprawa/NextStepDialog.tsx`
- **+** `src/components/sgu/odprawa/OdprawaExceptionsBar.tsx`
- **+** `src/hooks/odprawa/useTeamDirectors.ts`
- **~** `src/hooks/odprawa/useContactTimelineState.ts` (usuń `availableDecisions`, dodaj `availableMilestones` + `nextStepSuggestion`)
- **~** `src/hooks/useLogDecision.ts` (+ `followUpTaskId`)
- **~** `src/components/sgu/odprawa/OperationalActions.tsx` (3 buttony zamiast 9)
- **~** `src/pages/sgu/SGUOdprawa.tsx` (nowe komponenty + manualny advance)
- **−** `src/components/sgu/odprawa/DecisionButtons.tsx`
