

# SGU-MÓJ-DZIEŃ v1 — naprawa liczników + sekcja "Twoi klienci"

## Cel
Widok `/sgu/zadania` (Dziennik) ma 4 kafelki, które kłamią (pokazują 0 mimo 18 zaległych na liście). Naprawiamy źródło danych liczników + dokładamy 5. kafelek "Pod opieką" + nową sekcję "Twoi klienci w lejku" (rozwijalne karty z otwartymi zadaniami klienta).

## Diagnoza
W `tasks` są 2 kolumny "kto wykonuje":
- `assigned_to` (→ `directors.id`) — używane wszędzie aktywnie (`MyTeamTasksView`, `useMyTeamAssignments`, trigger DB)
- `assigned_to_user_id` (→ `auth.users.id`) — **legacy**, prawie nigdy niewypełniana

`TasksHeader` + `useSGUTasks` filtrują po `assigned_to_user_id === user.id` → 0 trafień. `MyTeamTasksView` filtruje po `assigned_to === director.id` → 18 zaległych. Fix: liczniki idą po tym samym hooku co lista (`useMyTeamAssignments`).

## Pliki dotykane (4)

### 1. `src/lib/sguTaskBuckets.ts` (NOWY) — refactor DRY
Wyciągnięcie funkcji `bucketOf` z `MyTeamTasksView.tsx` (linie 38-50) do reusable utila. Eksport: `bucketOfTask(task) → 'today' | 'overdue' | 'upcoming' | 'rest'`. W `MyTeamTasksView` zaimportować i usunąć lokalną kopię.

### 2. `src/components/sgu/headers/TasksHeader.tsx` — przepisanie
- Usunąć: `useSGUTasks`, ręczne `supabase.from('tasks')` po `assigned_to_user_id`
- Dodać: `useMyTeamAssignments(sguTeamId)` + `useTeamContacts(sguTeamId)` + `useSGUTeamId()` + `useAuth()` (dla `director.id`)
- Liczyć w `useMemo`: `mineClients` (z `teamContacts.filter(tc => tc.assigned_to === director.id)`), `today`/`overdue`/`upcoming` (przez `bucketOfTask` na `assignments.filter(mine)`), `doneToday` (`status === 'completed' && completed_at >= startOfDay(today)`)
- Grid `md:grid-cols-5` (z 4) — **5 kafelków**:
  1. **Pod opieką** (Users icon, amber) — liczba klientów
  2. **Dziś** (CalendarDays, emerald)
  3. **Zaległe** (AlertCircle, destructive jeśli >0)
  4. **Najbliższe 7 dni** (CalendarRange, sky)
  5. **Zrobione dziś** (CheckCircle2, violet)
- Każdy kafelek = `<button>` → toggle `?bucket=<key>` w URL (`useSearchParams`)
- Aktywny kafelek dostaje `ring-2 ring-primary`

### 3. `src/components/deals-team/MyTeamTasksView.tsx` — reagowanie na URL + sekcja klientów + podsumowanie
- Import `useSearchParams`, `bucketOfTask` z `@/lib/sguTaskBuckets`, `MyClientsSection`
- Dodać `const [searchParams] = useSearchParams(); const urlBucket = searchParams.get('bucket')`
- W `useMemo filtered` — po istniejących filtrach dodać filtr po bucket:
  - `today` / `overdue` / `upcoming` → `result.filter(a => bucketOfTask(a) === urlBucket)`
  - `done_today` → `result.filter(a => a.status === 'completed' && (a.completed_at ?? '') >= startOfDay(today).toISOString())` (przy tym bucketcie ignorować `filterStatus === 'active'` — wewnętrzny override)
  - `mine_clients` → bez wpływu na listę zadań (działa tylko na widoczności sekcji klientów)
- Dodać `urlBucket` do deps `useMemo`
- Wyrenderować `<MyClientsSection teamId={teamId} onClientClick={(contactId) => navigate(`/contacts/${contactId}`)} />` **tylko gdy `filterMember === 'mine'` i `viewMode === 'grouped'`**, nad `renderSection('Dzisiaj', ...)`
- Pasek podsumowania (zamiana `<span>{filtered.length} zadań</span>` w member filter bar): gdy `filterMember === 'mine'` → `Twój dzień: X klientów · Y zadań aktywnych · Z zaległych` (X = `myClients.length` lokalnie liczone, Y = `filtered.length`, Z = `overdueCount`)

### 4. `src/components/sgu/MyClientsSection.tsx` (NOWY)
- Props: `{ teamId: string; onClientClick: (contactId: string) => void }`
- Hooks: `useTeamContacts(teamId)` + `useMyTeamAssignments(teamId)` + `useAuth()`
- `myClients = teamContacts.filter(tc => tc.assigned_to === director.id)`
- Render: `<Card>` z nagłówkiem "Twoi klienci w lejku" + badge z licznikiem; lista `Collapsible` per klient
- Każdy klient: `CollapsibleTrigger` z imieniem (button → `e.stopPropagation()` + `onClientClick(client.contact_id)`), firmą, badgem `client.category`, datą `next_action_date`, badgem "{N} zadań" (gdzie N = `assignments.filter(a => a.deal_team_contact_id === client.id && status !== completed/cancelled).length`)
- `CollapsibleContent`: lista `<UnifiedTaskRow>` dla otwartych zadań tego klienta (sygnatura jak w `MyTeamTasksView.renderTaskRow` — bez deal stage badge, bez handlerów workflow w v1, klik na row → no-op lub log; w v2 podepniemy detail sheet)
- Empty state per klient: "Brak otwartych zadań"
- Jeśli `myClients.length === 0` → `return null`

## ZERO zmian w
- Bazie danych (żadnych migracji)
- `useSGUTasks` (zostaje, może używać go dashboard)
- Kanban, ContactDetail, ContactTasksSheet, routach
- `TaskModal`, `NextActionDialog`, `SnoozeDialog`, `ConvertToClientDialog` — workflow zadań działa bez zmian

## Acceptance criteria

**Liczniki:**
- 5 kafelków = dokładnie liczby z odpowiadających sekcji listy
- "Pod opieką" = liczba klientów (NIE zadań)
- "Zrobione dziś" = moje completed od 00:00
- Klik kafelka → `?bucket=...` filtruje listę
- Klik aktywnego drugi raz → reset
- Refresh strony → filtr z URL nadal działa

**Sekcja "Twoi klienci":**
- Widoczna tylko gdy `filterMember === 'mine'` i `viewMode === 'grouped'` i ≥1 klient
- Każda karta: nazwisko, firma, badge etapu, next_action_date, licznik zadań
- Rozwinięcie → lista otwartych zadań przez `UnifiedTaskRow`
- Klik nazwiska → nawigacja do `/contacts/:id`

**Podsumowanie:**
- Pasek (gdy `mine`): "Twój dzień: X klientów · Y zadań · Z zaległych"

**Refactor:**
- `bucketOf` tylko w `src/lib/sguTaskBuckets.ts` (zero duplikatu)

**Nie psujemy:**
- Lista zadań działa identycznie dla "Wszyscy" / innych członków / wszystkich filtrów
- Workflow (Next Action / Snooze / Convert) bez zmian
- `tsc` + `eslint` clean

## Pre-flight
1. `grep -n "assigned_to_user_id" src/components/sgu/headers/TasksHeader.tsx` → 0 hits po patchu
2. `grep -n "function bucketOf\|bucketOfTask" src/components/deals-team/MyTeamTasksView.tsx` → tylko import + użycia (brak lokalnej definicji)
3. `npx tsc --noEmit` → 0 nowych errors
4. Manual smoke (user): `/sgu/zadania` → liczby na 5 kafelkach = liczby w sekcjach listy → klik "Zaległe" → URL `?bucket=overdue` → lista zwężona → przełącznik "Moje" + viewMode "Grupowane" → widoczna sekcja "Twoi klienci" → rozwinięcie → otwarte zadania klienta

## Backlog (nie ten sprint)
- **B-FIX.20** — Klik `UnifiedTaskRow` w `MyClientsSection` → otworzyć `TaskDetailSheet` (na razie no-op)
- **B-FIX.21** — `parent_task_id` w `tasks` (wariant C — odłożone do drugiego lejka)
- **B-FIX.22** — Decyzja: czy `useSGUTasks` jest gdzieś jeszcze używany — jeśli nie, deprecate

