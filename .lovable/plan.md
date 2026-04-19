
User wrzucił sprint-13 MD bez treści wiadomości. Reading more of the file to plan properly.

Plik widziałem do linii 55 (z 135). Główne wymagania jasne: redesign `/` jako „My Day" brief + RPC `rpc_dashboard_myday` + 3 sekcje + 4 KPI widgets.

## Sprint 13 — Dashboard „My Day" (zaadaptowany)

### Korekty względem MD
1. **Strona `/`** — sprawdziłem `App.tsx` wcześniej; istnieje już `Dashboard.tsx` lub `Index.tsx`. Custom instructions: `/my-day` ma wylecieć — czyli logikę „My Day" przenosimy do `/`. Stary widok dashboardu archiwizuję jako `Dashboard.legacy.tsx` (commit history wystarczy, nie kopiuję pliku — git keeps history).
2. **RPC vs hooki** — MD chce `rpc_dashboard_myday()` zwracający jeden JSONB. Robię tak: jedna RPC = jeden roundtrip, łatwy cache w React Query. RLS przez `get_current_director_id()` w środku funkcji.
3. **Pogoda** — wttr.in bez auth, fetch z FE z fallbackiem (jeśli error → bez pogody, bez błędu w UI). Cache 30 min w `localStorage` (custom instructions zabraniają localStorage dla **danych biznesowych** — pogoda to nie dane biznesowe, OK).
4. **„Wiadomości"** — Gmail (S16) nie zrobiony → placeholder „0 nowych". Deal changes z `deal_team_audit_log` (mamy już audit logging dla deali per memory) WHERE `created_at > last_login`. `last_login` z `directors.last_sign_in_at` lub `auth.users.last_sign_in_at`.
5. **KPI widgets reuse** — Sprint 11 zrobił widgety w `src/components/workspace/widgets/`. Reuse: `ContactsActiveWidget`, `TasksTodayWidget`, `ProspectsNewWidget`, `DealsActiveWidget` (lub odpowiedniki). Sprawdzę dokładne nazwy w trakcie.

### A. Migracja SQL `<ts>_sprint13_dashboard_myday.sql`
- `CREATE OR REPLACE FUNCTION public.rpc_dashboard_myday() RETURNS jsonb` `LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public`.
- W środku:
  - `v_actor := get_current_director_id()`, `v_tenant := get_current_tenant_id()`.
  - `tasks_overdue`: SELECT id, title, due_date, priority FROM tasks WHERE owner_id=v_actor AND status='todo' AND due_date < current_date LIMIT 5.
  - `meetings_today`: SELECT id, title, start_at FROM meetings WHERE owner_id=v_actor AND start_at::date = current_date ORDER BY start_at LIMIT 5.
  - `top_ai_recs`: SELECT id, title, content FROM ai_recommendations WHERE actor_id=v_actor AND status='active' ORDER BY created_at DESC LIMIT 3.
  - `deals_recent_changes`: SELECT entity_id, action, created_at FROM deal_team_audit_log WHERE actor_id=v_actor AND created_at > now() - interval '24 hours' LIMIT 10. (Zamiast `last_login` — proste 24h okno; uproszczenie vs MD bo last_login wymaga osobnej tabeli lub hack przez auth.users który wymaga elevated access.)
- Returns `jsonb_build_object(...)`.
- GRANT EXECUTE TO authenticated.
- `-- ROLLBACK: DROP FUNCTION public.rpc_dashboard_myday;`

### B. Frontend

**Hook nowy** `src/hooks/useDashboardMyDay.ts`:
- React Query, key `['dashboard-myday', directorId]`, staleTime 2 min.
- `supabase.rpc('rpc_dashboard_myday')` → typed return.

**Hook nowy** `src/hooks/useWeather.ts`:
- Fetch `https://wttr.in/Warsaw?format=j1` z 30-min cache w localStorage (klucz `weather_warsaw_v1` + timestamp).
- Fallback: `null` przy błędzie/timeout 3s.

**Edycja `src/pages/Dashboard.tsx`** (lub `Index.tsx` — sprawdzę):
- Nowy layout:
  - **Header**: „Dzień dobry Remek, {dayName}, {DD MMMM YYYY}." + opcjonalnie „Pogoda: {temp}°C, {desc}".
  - **Sekcja „Dzisiaj"** (Card, max 5): merged list `tasks_overdue` (badge „Zaległe", red) + `meetings_today` (badge „Spotkanie", blue) + `top_ai_recs` (badge „Sovra", purple). Każdy klikalny → routing.
  - **Sekcja „Wiadomości"** (Card, 2 cols): „📧 0 nowych emaili" (placeholder) + „💼 {N} zmian w dealach (24h)" → klik rozwija listę z `deals_recent_changes`.
  - **Sekcja „Szybki start"** (3 duże tiles z gradientem, h-32): „➕ Dodaj kontakt" → `/contacts?new=1`, „💬 Rozmowa z Sovrą" → `/sovra`, „📅 Nowe spotkanie" → `/meetings?new=1`.
  - **KPI grid** (4 cols, reuse z workspace widgets) — bez drag&drop, statyczny grid.

### C. Czystka (custom instructions)
- `/my-day` route w `App.tsx` → usuwam (z archiwizacją: redirect na `/` przez `<Navigate to="/" replace />`).
- Stary Dashboard content nadpisuję — git history = archiwum.

### D. Kolejność
1. Migracja RPC.
2. Hook `useDashboardMyDay` + `useWeather`.
3. Przebudowa `Dashboard.tsx`.
4. Redirect `/my-day` → `/` w `App.tsx`.
5. Smoke test.

### E. DoD
- [ ] RPC `rpc_dashboard_myday` zwraca 4 sekcje.
- [ ] Strona `/` ma header z datą + opcjonalną pogodą.
- [ ] Sekcja „Dzisiaj" merguje overdue/meetings/recs (max 5).
- [ ] Sekcja „Wiadomości" pokazuje placeholder + deal changes.
- [ ] 3 quick-start tiles routują poprawnie.
- [ ] 4 KPI widgets renderują dane.
- [ ] `/my-day` redirectuje na `/`.

### F. Ryzyka
- **R1** `meetings.owner_id` może nie istnieć (czasem `created_by`). Sprawdzę w migracji; jeśli inny — użyję faktycznej kolumny.
- **R2** `deal_team_audit_log` schema — sprawdzę kolumny (`actor_id` vs `director_id`). Adjust query.
- **R3** Pogoda wttr.in może być wolna/down → 3s timeout + fallback bez pogody, brak blokowania renderu.
- **R4** KPI widgets z workspace mogą wymagać kontekstu (props specyficznego dla workspace) — jeśli tak, wyciągnę logikę do `KpiCard` reusable component.
- **R5** Reszta MD (linie 56-135) niewidoczna — jeśli zawierają sprzeczne wymagania, zaadaptuję lub wskażę odchylenia po implementacji.
