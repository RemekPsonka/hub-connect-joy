
## Plan: Restrukturyzacja SGU Sidebar + konsolidacja Prowizji + landing partner

### 1. `src/components/layout/SGUSidebar.tsx` — pełna przebudowa

**Nowa struktura grup** (z localStorage per grupa, klucz `sgu-sidebar-group-<label>`):

```ts
const salesItems = [
  { title: 'Kanban', url: '/sgu/pipeline?view=kanban', icon: LayoutGrid },
  { title: 'Klienci', url: '/sgu/pipeline?view=clients', icon: UserCheck },
  { title: 'Prospecting', url: '/sgu/pipeline?view=prospecting', icon: Search },
  { title: 'Ofertowanie', url: '/sgu/pipeline?view=offering', icon: Briefcase },
  { title: 'Zadania', url: '/sgu/pipeline?view=tasks', icon: ClipboardList },
  { title: 'Prowizje', url: '/sgu/pipeline?view=commissions', icon: Receipt },
  { title: 'Odłożone', url: '/sgu/pipeline?view=snoozed', icon: Moon },
];

const analyticsItems = [
  { title: 'Dashboard', url: '/sgu/dashboard', icon: LayoutDashboard },
  { title: 'Tabela', url: '/sgu/pipeline?view=table', icon: List },
  { title: 'Raporty', url: '/sgu/reports', icon: BarChart3 },
];

const adminItems = [
  { title: 'Zespół', url: '/sgu/admin/team', icon: Users },
  { title: 'Przedstawiciele', url: '/sgu/admin/representatives', icon: UserCog },
  { title: 'Przypisania', url: '/sgu/admin/assignments', icon: UserPlus },
  { title: 'Produkty', url: '/sgu/admin/products', icon: Package },
  { title: 'Konfiguracja prowizji', url: '/sgu/admin/commissions', icon: DollarSign },
  { title: 'Case D', url: '/sgu/admin/case-d', icon: Calculator },
];

const systemItems = [
  { title: 'Ustawienia', url: '/sgu/settings', icon: Settings },
];
```

**Co usuwam:**
- Cała sekcja `overviewItems` (Dashboard/Dziennik/Mój zespół) i `reportItems` (osobna grupa).
- Komponent `FunnelCollapsible` + tablica `funnelSubItems` — pozycje renderowane płasko w grupie Sprzedaż.
- Stara grupa Admin (`/sgu/admin/commissions/case-d` → zmiana ścieżki na `/sgu/admin/case-d` zgodnie z wymaganiem).

**Default open state** (zapisywany w localStorage):
- Sprzedaż: `true`
- Analityka: `true`
- Admin: `false` (collapsed)
- System: `true`

`useState` z lazy init czytającym `localStorage.getItem('sgu-sidebar-group-<label>')`, fallback do defaultu. `toggleGroup` zapisuje do localStorage.

**Widoczność Admin:** `showAdmin = isPartner || isAdmin || isSuperadmin` (bez zmian względem obecnego — odpowiada wymaganiu „is_sgu_partner || director || superadmin"; `isAdmin` z `useOwnerPanel` to owner/director).

**Aktywność linków:** zachowuję obecną logikę z `NavItem` (porównanie pathname + query params).

**Footer:** zostawiam przycisk „Wróć do CRM" bez zmian.

**Nagłówek:** zostawiam „CRM SGU Brokers" (poprzednia poprawka).

### 2. `src/components/auth/PostLoginRedirect.tsx`

Zmiana targetów:
- `isRep && !isPartner` → `/sgu/pipeline?view=tasks` (było `/sgu/tasks`)
- `isPartner` → `/sgu/pipeline?view=kanban` (było `/sgu/dashboard`)
- Director (bez SGU role) → bez zmian (zostaje na `/`).

`navigate(..., { replace: true })` z pełnym query stringiem.

### 3. `src/pages/DealsTeamDashboard.tsx` — Tabs „Cele/Wpisy" w trybie SGU

Gdy `forcedTeamId` jest ustawione (tryb SGU) **i** `viewMode === 'commissions'`:
- Lokalny stan `commissionsTab: 'entries' | 'goals'`, default `'entries'`, persist w localStorage `sgu-commissions-tab`.
- Renderuję `<Tabs>` z shadcn z dwiema zakładkami:
  - „Wpisy" → `<CommissionsTable teamId={selectedTeamId} />` (obecny widok `entries`)
  - „Cele" → `<CommissionsTab teamId={selectedTeamId} />` (obecny widok `commissions`)
- Usuwam (w trybie SGU) osobny rendering dla `viewMode === 'entries'` — w SGU sidebarze nie ma już tej pozycji, ale dla bezpieczeństwa zostawiam handler dla nie-SGU (forcedTeamId === undefined).

Logika non-SGU (`!forcedTeamId`) pozostaje bez zmian — użytkownicy CRM Deals Team nadal mają dwie osobne pozycje, jeśli ich sidebar je ma.

### 4. Build + raport
- `npm run build`
- Lista zmodyfikowanych plików.

### Pliki
- `src/components/layout/SGUSidebar.tsx` — przebudowa.
- `src/components/auth/PostLoginRedirect.tsx` — zmiana targetów.
- `src/pages/DealsTeamDashboard.tsx` — Tabs Cele/Wpisy w SGU.

### Ryzyka
- Trasa `/sgu/admin/case-d` — wcześniej była `/sgu/admin/commissions/case-d`. Sidebar wskazuje nową ścieżkę zgodnie z wymaganiem; jeśli routing nie ma jej zarejestrowanej, link da 404. Nie zmieniam routingu (poza zakresem „zero zmian backend/DB", ale to FE — zostawiam zgodnie z wymaganiem klienta; ewentualną korektę routingu zrobię osobno, jeśli okaże się że route nie istnieje).
- Trasy `/sgu/admin/team`, `/sgu/settings`, `/sgu/admin/products` — zakładam że istnieją (były w obecnym sidebarze).
- localStorage SSR-safe: sprawdzam `typeof window !== 'undefined'` przy lazy init.
- `PostLoginRedirect` używa `navigate('/sgu/pipeline?view=kanban', { replace: true })` — react-router 6 obsługuje query w stringu, OK.
