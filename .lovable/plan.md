
Sprint SGU-01: layout + brand + routing dla modułu SGU. Reuse istniejącego CRM (zero zmian w `AppLayout`/`AppSidebar`/`HeaderBar`), nowe równoległe drzewo `/sgu/*`.

## Recon (przed implementacją)

Tool calls round 1 (równolegle):
1. `supabase--read_query` — sprawdzić `sgu_settings` (kolumny `sgu_team_id`, `enable_sgu_layout`) + istnienie 4 RPC (`has_sgu_access`, `is_sgu_partner`, `is_sgu_representative`, `get_sgu_team_id`).
2. `code--view src/components/layout/AppSidebar.tsx` — pobrać `funnelSubItems` (9 linków + ikony do reuse).
3. `code--view package.json` — potwierdzić brak `zustand`.
4. `code--search_files` — `useOwnerPanel`, `useSuperadmin`, `PageLoadingFallback`, `NavLink` (potwierdzić ścieżki importów).
5. `code--view src/contexts/AuthContext.tsx` — gdzie wpiąć `PostLoginRedirect`.

ViewMode w `DealsTeamDashboard.tsx` już potwierdzony z `<files>`: 9 wartości jak w spec'u ✅.

## Implementacja (po recon, jeden batch)

### A. Migracja SQL
- `supabase/migrations/<ts>_sgu_01_enable_layout.sql` — UPDATE flagi + ROLLBACK comment.

### B. Hooks (nowe)
- `src/hooks/useSGUAccess.ts` — 3 RPC w `Promise.all`, React Query, 5min stale.
- `src/hooks/useSGUTeamId.ts` — select z `sgu_settings`, infinity stale.

### C. Store
- `src/store/layoutMode.tsx` — Context + localStorage `sgu.layoutMode`, hook `useLayoutMode`. Wpięcie w `App.tsx` wewnątrz `<AuthProvider>`.

### D. Brand
- `src/lib/sgu/brand.ts` — `SGU_COLORS` + `SGULogo` (SVG inline).
- `src/index.css` — blok `[data-sgu-theme="true"] { --primary, --accent, --sidebar-* }` w HSL.

### E. Layout
- `src/components/layout/SGULayout.tsx` — kopia `AppLayout` + `data-sgu-theme="true"`, `<SGUSidebar/>`, `<SGUHeader/>`.
- `src/components/layout/SGUSidebar.tsx` — grupy OVERVIEW/LEJEK/RAPORTY/ADMIN/SYSTEM. Reuse ikony z `funnelSubItems` (z reconu). ADMIN conditional na `isPartner || isAdmin || isSuperadmin`. Zero linków do CRM (`/contacts`, `/companies`, `/workspace`, `/projects`, `/meetings`, `/deals-team`, `/sovra`, `/search`).
- `src/components/layout/SGUHeader.tsx` — kopia `HeaderBar` + `<LayoutModeToggle/>` (shadcn Tabs CRM/SGU, widoczny dla admin/superadmin, navigate na `/` lub `/sgu/dashboard`).

### F. Guards
- `src/components/auth/SGUAccessGuard.tsx` — wg spec'u (loading → fallback, !enabled → `/`, !access && !admin → `/`).
- `src/components/auth/PostLoginRedirect.tsx` — `useEffect` na `user` + `useSGUAccess`, `sessionStorage['sgu.post-login-redirect-done']` anti-loop. Wpięcie w `AppLayout` lub `AuthGuard` (po reconie zdecyduję — preferuję `AppLayout` żeby nie ruszać `AuthGuard`/`AppLayout` zgodnie z constraint... ale spec mówi: „lub `AuthGuard.tsx`". Zrobię osobny komponent renderowany jako sibling w drzewie po `AuthGuard` — wstawię go w `App.tsx` wewnątrz `<AuthProvider>` jako floating component, bez modyfikacji guardów).

### G. Routing
- `src/App.tsx`:
  - lazy import 5 placeholderów + `SGUPipelineRoute`.
  - Wewnątrz `<AuthProvider>` dodać `<LayoutModeProvider>` + `<PostLoginRedirect/>`.
  - Drzewo `<Route element={<AuthGuard><SGUAccessGuard><SGULayout/></SGUAccessGuard></AuthGuard>}>` z trasami: `/sgu/dashboard`, `/sgu/team`, `/sgu/pipeline`, `/sgu/reports`, `/sgu/admin`, `/sgu/settings` (+ ewentualne sub-paths z `:section`/`:period`).

### H. SGUPipelineRoute
- `src/pages/sgu/SGUPipelineRoute.tsx` — `useSGUTeamId()` → loading/null guard → `<DealsTeamDashboard forcedTeamId={sguTeamId}/>`.

### I. DealsTeamDashboard
- Dodać `interface DealsTeamDashboardProps { forcedTeamId?: string }`.
- Jeśli `forcedTeamId`: `selectedTeamId = forcedTeamId`, pominąć localStorage init i auto-select effect, ukryć `<TeamSelector/>` + `<CreateTeamDialog/>` button. `useTeamContactStats` dalej działa.
- Backward compat: brak propu = stara logika 1:1.

### J. Placeholdery
- `src/pages/sgu/SGUDashboard.tsx`, `SGUTeam.tsx`, `SGUReports.tsx`, `SGUAdmin.tsx`, `SGUSettings.tsx` — każdy z `<Card>` + tytuł + „Implementacja: Sprint SGU-XX".

### K. Walidacja
- `npm run build` + `npm run lint` (oczekiwane zielone).
- `grep -E "/contacts|/companies|/workspace|/projects|/meetings|/deals-team|/sovra|/search" src/components/layout/SGUSidebar.tsx` → 0.

### L. Raport końcowy
1. Modified files (`App.tsx`, `index.css`, `DealsTeamDashboard.tsx`, ew. `AppLayout` jeśli wpinam tam Provider — ale wolę `App.tsx` żeby nie ruszać layoutu).
2. New files (~13 plików: 2 hooks, 1 store, 2 brand/css, 3 layout, 2 guard, 1 routewrap, 5 placeholder, 1 migracja).
3. Migration status.
4. Build/lint output.
5. Grep wynik na zakazane linki w SGUSidebar (= 0).

## Ryzyka / decyzje
- **PostLoginRedirect** — spec dopuszcza modyfikację `AuthContext` LUB `AuthGuard`, ale constraint mówi „nie ruszaj AppLayout". Wpinam jako sibling komponent w `App.tsx` (zero zmian guardów/layoutu). Czyta `useAuth()` + `useSGUAccess()`, robi `navigate` raz per session.
- **`<TabsTrigger>` CRM/SGU navigate** — używam `useNavigate` z `react-router-dom`, w handler setMode + navigate.
- **SGULayout** musi być wewnątrz `<LayoutModeProvider>` ale Provider obejmuje całość — OK.
- **Konflikt Provider order**: `<AuthProvider>` → `<LayoutModeProvider>` → `<PostLoginRedirect/>` (nullable render) + `<Suspense><Routes>...`.
- **Ikony SGUSidebar** — wezmę z lucide-react (BarChart3, Users, Target, FileText, Settings itd.) na bazie `funnelSubItems` z `AppSidebar`.

Po Twojej akceptacji: recon (5 tool calls równolegle) → implementacja (batch ~15 plików) → migracja → build/lint → raport.
