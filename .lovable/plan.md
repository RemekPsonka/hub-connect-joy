
## Sprint SGU-04 — Dashboard + dzienny check-in + MyKanban

### Recon (READ-ONLY, równolegle przed implementacją)

**Tool calls round 1:**
1. `supabase--read_query` × 5 (równolegle):
   - `pg_matviews` dla `mv_dashboard_stats` (czy pokrywa SGU)
   - kolumny `tasks` (sprawdzenie czy `assigned_to_user_id` już istnieje, types `assigned_to`, `due_date`, `status`)
   - rozkład `deal_team_contacts.category` w SGU teamie (kluczowe dla MyKanban — które wartości mapować na 4 kolumny)
   - czy każdy rep z `deal_team_representative_assignments` ma row w `directors`/`assistants` (decyduje czy `assigned_to_user_id` jest jedyną drogą)
   - `cron.job` lista (czy `sgu_refresh_weekly_kpi` już nie istnieje, jakie inne SGU jobs są)
2. `code--view src/components/auth/PostLoginRedirect.tsx` — punkt zmiany rep redirect.
3. `code--view src/pages/sgu/SGUDashboard.tsx` — placeholder z SGU-01 do zastąpienia.
4. `code--view src/components/layout/SGUSidebar.tsx` — gdzie dodać link „Dziennik".
5. `code--view src/App.tsx` (sekcja SGU routes) — gdzie wpiąć `/sgu/tasks`.
6. `code--search_files` — `category` w `deal_team_contacts` (typy/enumy/walidacje), aby zmapować 4 kolumny MyKanban poprawnie.
7. `code--list_dir src/components/sgu` (po SGU-03 wiem że istnieje — sprawdzam co już mam).

Wypisuję 7-pkt status (OK/BRAK + cytaty).

### Implementacja (po reconie, 1 batch)

**A. Migracja SQL** `supabase/migrations/<ts>_sgu_04_dashboard.sql`
1. `ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assigned_to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;`
2. `CREATE INDEX IF NOT EXISTS idx_tasks_assigned_user_active ON public.tasks(assigned_to_user_id) WHERE assigned_to_user_id IS NOT NULL AND status != 'completed';`
3. `CREATE POLICY tasks_sgu_rep_select ON public.tasks FOR SELECT USING (assigned_to_user_id = auth.uid() AND public.is_sgu_representative());` (tylko ADD; nie ruszam istniejących policies)
4. `CREATE MATERIALIZED VIEW public.mv_sgu_weekly_kpi AS ...` — agregat z 7-dniowego okna: `meetings_count`, `policies_issued_count`, `commission_earned_gr` (sum z `commission_entries`), `premium_collected_gr` (sum z `deal_team_payment_schedule WHERE is_paid AND paid_at >= now() - 7d`). Per `team_id` + `week_start`. + `CREATE UNIQUE INDEX` na `(team_id, week_start)` dla CONCURRENTLY refresh.
5. `CREATE OR REPLACE FUNCTION public.rpc_sgu_weekly_kpi(p_week_offset int DEFAULT 0)` SECURITY DEFINER + `GRANT EXECUTE ... TO authenticated;` — zwraca jeden wiersz dla SGU teamu z porównaniem do poprzedniego tygodnia (delta).
6. `CREATE OR REPLACE FUNCTION public.rpc_sgu_team_performance(p_week_offset int DEFAULT 0)` SECURITY DEFINER + GRANT — zwraca listę per `recipient_user_id` z `commission_entries`: `policies_count`, `booked_premium_gr`, `collected_premium_gr`, `commission_earned_gr`. Tylko director/partner widzą wszystkich; rep widzi tylko siebie (warunek wewnątrz funkcji).
7. `cron.schedule('sgu_refresh_weekly_kpi', '*/10 * * * *', $$ REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_sgu_weekly_kpi; $$);` — wstawiane przez **insert tool** (nie migration, bo zawiera URL/anon-key style; faktycznie tylko REFRESH bez net.http_post → może iść w migracji, ale dla spójności z project-knowledge daję przez insert tool).
8. Pierwszy `REFRESH MATERIALIZED VIEW public.mv_sgu_weekly_kpi;` (bez CONCURRENTLY, pusta) na końcu migracji.
9. ROLLBACK comment: DROP cron job, DROP RPC×2, DROP MV, DROP POLICY, DROP INDEX, ALTER DROP COLUMN.

**B. Hooki** (`src/hooks/`)
- `useSGUWeeklyKPI.ts` — `supabase.rpc('rpc_sgu_weekly_kpi', { p_week_offset })`, staleTime 5 min, queryKey `['sgu-weekly-kpi', weekOffset]`.
- `useSGUTeamPerformance.ts` — `rpc_sgu_team_performance`, staleTime 5 min.
- `useSGUTasks.ts` — `filter: 'today' | 'overdue' | 'my_clients'`. Direct query `tasks` z RLS (rep widzi tylko swoje przez nową policy). Joiny: `contacts`, `deal_team_contacts`.
- `useSGUAlerts.ts` — 3 query Promise.all:
  - polisy kończące się w ≤14d (`insurance_policies WHERE valid_to BETWEEN now() AND now()+14d AND deal_team_id = sgu`)
  - raty overdue (`deal_team_payment_schedule WHERE is_paid=false AND scheduled_date < now() AND team_id = sgu`)
  - klienci bez kontaktu >30d (`deal_team_contacts WHERE last_contact_at < now()-30d AND team_id = sgu`) — jeśli kolumny brak (recon zweryfikuje), fallback na `updated_at`.

**C. Komponenty** (`src/components/sgu/`)
- `KPICard.tsx` — atom `{ label, value, delta?, icon, variant: 'default'|'success'|'warning' }` (reuse `StatCard` pattern z `src/components/ui/stat-card.tsx`, ale dedykowany SGU wariant z deltą tygodniową).
- `MyKanban.tsx` — 4 kolumny z `dnd-kit` (Lead → Hot → Klient → Stracony, dokładny mapping z reconu #6). Drag end → `UPDATE deal_team_contacts SET category = X WHERE id = Y`. Optymistyczny update React Query.
- `AlertsPanel.tsx` — shadcn `<Accordion>` z 3 sekcjami; każda lista alertów z linkiem do encji (`/sgu/pipeline?view=clients&highlight=...`).
- `TeamPerformanceTable.tsx` — `<Table>` shadcn: kolumny `Osoba | Polisy | Booked PLN | Collected PLN | Commission PLN | Target progress`. Progress bar = `commission_earned_gr / weekly_target_gr` (target hardcode MVP: 50000 gr/tydzień, później z `commission_base_split`).
- `TaskRow.tsx` — wiersz z `Checkbox` (mark done), button „+1 dzień" (UPDATE `due_date`), inline `<Textarea>` notatka (UPDATE `tasks.notes`), call link `<a href="tel:...">`.

**D. Strony**
- `src/pages/sgu/SGUDashboard.tsx` — REPLACE placeholder. 5 sekcji:
  1. Heading „Dashboard SGU — tydzień <data>"
  2. KPI grid (4× `<KPICard>`) z `useSGUWeeklyKPI`
  3. `<TeamPerformanceTable>` (tylko partner/director widzi wszystkich)
  4. `<AlertsPanel>` (3 kategorie)
  5. CTA „Zobacz wszystkie zadania" → `/sgu/tasks`
- `src/pages/sgu/SGUTasks.tsx` — NEW. Tabs: „Lista" (3 accordion sekcje: Dziś / Zaległe / Moi klienci) + „Tablica" (`<MyKanban>`).

**E. Modyfikacje**
- `src/App.tsx` — `<Route path="/sgu/tasks" element={<SGUTasks/>} />` w bloku SGU routes (lazy import).
- `src/components/layout/SGUSidebar.tsx` — link „Dziennik" (ikona `ListTodo`) → `/sgu/tasks` w grupie OVERVIEW.
- `src/components/auth/PostLoginRedirect.tsx` — zmiana docelowej trasy rep z `/sgu/pipeline?view=tasks` na `/sgu/tasks`.

**F. Walidacja**
- Po migracji types.ts auto-regenerowany (nowa kolumna + 2 RPC).
- `npm run build` + `npm run lint`.
- Smoke test: query `mv_sgu_weekly_kpi` (sprawdzenie czy ma wiersze), `cron.job` (czy job aktywny).

### Pliki

**Nowe (10):**
- `supabase/migrations/<ts>_sgu_04_dashboard.sql`
- `src/hooks/useSGUWeeklyKPI.ts`
- `src/hooks/useSGUTeamPerformance.ts`
- `src/hooks/useSGUTasks.ts`
- `src/hooks/useSGUAlerts.ts`
- `src/components/sgu/KPICard.tsx`
- `src/components/sgu/MyKanban.tsx`
- `src/components/sgu/AlertsPanel.tsx`
- `src/components/sgu/TeamPerformanceTable.tsx`
- `src/components/sgu/TaskRow.tsx`
- `src/pages/sgu/SGUTasks.tsx`

**Modyfikowane (4):**
- `src/pages/sgu/SGUDashboard.tsx` (zastąpienie placeholdera)
- `src/App.tsx` (route)
- `src/components/layout/SGUSidebar.tsx` (link „Dziennik")
- `src/components/auth/PostLoginRedirect.tsx` (rep target)

### Ryzyka / decyzje
- **`mv_dashboard_stats` reuse vs nowy MV**: jeśli recon #1 pokaże że istniejący MV nie ma `team_id` ani SGU-specific danych → tworzę dedykowany `mv_sgu_weekly_kpi`. Decyzja default: **nowy MV** (izolacja modułu, nie ryzykuję regression na CRM dashboardzie).
- **Mapping `category` na MyKanban**: zależnie od recon #3. Jeśli wartości to `lead/hot/client/lost` → 4 kolumny direct. Jeśli inne (`prospect/active/won/snoozed`) → mapuję semantycznie i dokumentuję w komentarzu komponentu. **Nie zmieniam danych w bazie**.
- **`tasks.assigned_to_user_id` + RLS**: nowa policy tylko **dodatkowa** (RLS w PG = OR), więc rep widzi swoje zadania bez zmiany istniejącego dostępu director/admin. Director nadal widzi wszystkie przez istniejące policies.
- **Rep w `directors`/`assistants`**: jeśli recon #4 pokaże że żaden rep nie ma row w directors/assistants → uzasadnienie nowej kolumny `assigned_to_user_id` jest pełne (`tasks.assigned_to` FK do `directors` jest ślepe dla repów).
- **pg_cron job**: insert przez **insert tool** (project-knowledge: REFRESH MV w cronie OK, ale dla spójności z `<schedule-jobs-supabase-edge-functions>` używam insert tool). Schedule `*/10 * * * *`.
- **Target tygodniowy w `TeamPerformanceTable`**: MVP hardcode `WEEKLY_TARGET_PLN = 500` (komentarz TODO: w SGU-08 przeniesienie do `commission_base_split.weekly_target_gr` albo nowej tabeli `sgu_targets`).

### Raport końcowy
1. Lista nowych + modyfikowanych plików (absolute paths).
2. Status migracji + insert pg_cron job.
3. Wyniki 5-pkt reconu.
4. `SELECT jobname, schedule, active FROM cron.job WHERE jobname='sgu_refresh_weekly_kpi';`
5. Smoke test query: `SELECT count(*) FROM mv_sgu_weekly_kpi;`, `SELECT * FROM rpc_sgu_weekly_kpi(0);`.
6. `npm run build` + `npm run lint` output.
7. Manualny check — Remek loguje się → `/sgu/dashboard` widzi KPI + tabelę + alerty; rep → po loginie redirect na `/sgu/tasks`.

Po Twojej akceptacji: recon (7 calls równolegle) → implementacja (1 batch) → migracja + insert pg_cron → smoke test → raport.
