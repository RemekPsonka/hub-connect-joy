

# SGU-MÓJ-DZIEŃ v1.1 — polerka po v1 (completed_at + filtry w URL)

## Cel
Domknąć 2 luki po v1:
1. Kafel "Zrobione dziś" ma fallback na `created_at` → fałszywe trafienia. Liczyć tylko po `completed_at`.
2. Kafle filtrują przez URL (`?bucket=`), ale `member`/`status`/`priority` siedzą w `useState` → reset po F5, niedzielenie linkiem. Ujednolicić: 4 filtry w URL.

## Pliki dotykane (2)

### 1. `src/components/sgu/headers/TasksHeader.tsx` — fix `doneToday`
W `useMemo counts` zamienić:
```ts
const doneToday = mine.filter(
  a => a.status === 'completed' && (a.completed_at ?? a.created_at ?? '') >= todayStart
).length;
```
na:
```ts
const doneToday = mine.filter(
  a => a.status === 'completed' && !!a.completed_at && a.completed_at >= todayStart
).length;
```
Zero nowych importów. To jedyna zmiana w pliku.

### 2. `src/components/deals-team/MyTeamTasksView.tsx` — filtry do URL
- Zachować `useSearchParams` (już jest po v1) i dodać `setSearchParams` do destrukturyzacji.
- **Usunąć** 3 `useState`: `filterMember`, `filterStatus`, `filterPriority`.
- **Zachować** `useState` dla: `searchQuery` (debounce per-litera = osobny temat) i `viewMode` (preferencja osobista).
- Zastąpić odczytami z URL z defaultami:
  ```ts
  const filterMember = searchParams.get('member') ?? 'mine';
  const filterStatus = searchParams.get('status') ?? 'active';
  const filterPriority = searchParams.get('priority') ?? 'all';
  ```
- Helper `setUrlParam` w `useCallback` (deps: `searchParams`, `setSearchParams`) — usuwa parametr gdy `value === defaultValue`, w przeciwnym razie ustawia. `setSearchParams(next, { replace: true })`.
- Settery: `setFilterMember = (v) => setUrlParam('member', v, 'mine')` (analogicznie status/priority).
- W JSX: nazwy zmiennych i setterów się nie zmieniają → wszystkie istniejące wywołania (`onClick`, `onValueChange`, odczyty w filtrach) działają bez zmian.
- `useMemo filtered` — deps zostają (`filterMember`, `filterStatus`, `filterPriority`, `urlBucket` itd.), zmienia się tylko źródło wartości.

## ZERO zmian w
- `searchQuery` (zostaje useState)
- `viewMode` (zostaje useState)
- `urlBucket` z v1 (działa dalej, koegzystuje z 3 nowymi paramami)
- `useSGUTasks`, `useMyTeamAssignments`, `useTeamContacts`
- `sguTaskBuckets.ts`, `MyClientsSection.tsx`
- DB (żadnych migracji, żadnego backfillu `completed_at`)

## Acceptance criteria

**Fix `doneToday`:**
- Kafel liczy tylko `status='completed' && completed_at != null && completed_at >= startOfDay(today)`
- Tasky completed bez `completed_at` NIE wpadają (nawet gdy `created_at` = dziś)

**Filtry w URL:**
- Klik "Wszyscy" → `?member=all`; klik "Moje" → URL traci `member` (default)
- Klik członek zespołu → `?member={director-id}`
- Status "Zakończone" → `?status=completed`; powrót "Aktywne" → URL traci `status`
- Priorytet "Wysoki" → `?priority=high`; powrót "Wszystkie" → URL traci `priority`
- 4 parametry koegzystują: `?member=all&status=all&priority=high&bucket=overdue`
- F5 → filtry zostają; kopia linka → ten sam stan w innej sesji

**Nie psujemy:**
- "Szukaj" działa per-litera (useState)
- viewMode (Grupowane/Lista/Kanban/Zespół) w useState
- Kafle z v1 + sekcja "Twoi klienci" działają dalej
- Pozostałe 4 kafle (Pod opieką, Dziś, Zaległe, Najbliższe 7 dni) bez zmian
- `tsc` + `eslint` clean

## Pre-flight
1. `grep -n "useState.*filter\(Member\|Status\|Priority\)" src/components/deals-team/MyTeamTasksView.tsx` → 0 hits po patchu
2. `grep -n "completed_at ?? a.created_at" src/components/sgu/headers/TasksHeader.tsx` → 0 hits
3. `npx tsc --noEmit` → 0 nowych errors
4. Manual smoke: `/sgu/zadania` → klik "Wszyscy"+"Wysoki"+"Zaległe" → URL ma 3 paramy → F5 → stan zachowany

## Backlog (nie ten sprint)
- **B-FIX.23** — `searchQuery` do URL z debounce 300ms
- **B-FIX.24** — Audyt rekordów `tasks` z `status='completed' AND completed_at IS NULL` (tech-debt, ewentualny backfill)
- **B-FIX.25** — `viewMode` do localStorage per-user (preferencja perzystentna)

