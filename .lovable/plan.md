

## BLOK SGU-IA-FIX-1 — SGUSidebar 6 pozycji

### Cel

Zastąpić aktualny `SGUSidebar.tsx` (4 grupy collapsible × ~10 pozycji) prostą płaską listą 6 pozycji z gatingiem dla Raporty/Admin.

### Plik do edycji

`src/components/layout/SGUSidebar.tsx` — pełna podmiana zawartości.

### Nowa struktura

**Importy (ikony):** `LayoutDashboard, LayoutGrid, UserCheck, ClipboardList, BarChart3, Settings, ArrowRightLeft`

**Hooki gatingu:**
- `useSGUAccess()` → `isPartner`
- `useOwnerPanel()` → `isAdmin`
- `useSuperadmin()` → `isSuperadmin`
- `useSGUTeamId()` → `enableReports`

**Logika widoczności:**
```ts
const showAdmin = isPartner || isAdmin || isSuperadmin;
const showReports = enableReports;

const items = [
  { title: 'Dashboard', url: '/sgu',          icon: LayoutDashboard, show: true },
  { title: 'Sprzedaż',  url: '/sgu/sprzedaz', icon: LayoutGrid,      show: true },
  { title: 'Klienci',   url: '/sgu/klienci',  icon: UserCheck,       show: true },
  { title: 'Zadania',   url: '/sgu/zadania',  icon: ClipboardList,   show: true },
  { title: 'Raporty',   url: '/sgu/raporty',  icon: BarChart3,       show: showReports },
  { title: 'Admin',     url: '/sgu/admin',    icon: Settings,        show: showAdmin },
].filter(i => i.show);
```

**Render:** jeden `SidebarGroup` → `SidebarMenu` → mapowanie 6 (lub mniej) `NavItem`. Bez `GroupLabel`, bez collapsible state, bez `localStorage`.

**Zachowane:**
- `SidebarHeader` (SGULogo + "CRM SGU Brokers", `isCollapsed` handling)
- `SidebarFooter` (NavLink "Wróć do CRM" → `/`)
- `NavItem` helper (active state przez `useLocation`, ale uproszczony — bez query params, bo nowe URL nie używają `?view=`)
- `isCollapsed` tooltip przez `SidebarMenuButton tooltip={item.title}`

**Usunięte (per brief):**
- `salesItems`, `analyticsItemsBase`, `reportsItem`, `adminItems`, `systemItems`
- `groups`, `openGroups`, `toggleGroup`, `readGroupOpen`, `writeGroupOpen`, `STORAGE_PREFIX`
- `GroupLabel` komponent
- Importy ikon: `Users, UserPlus, UserCog, Search, Briefcase, Receipt, Moon, Calculator, Package, DollarSign, List, ChevronDown, Moon`
- `useState` (już niepotrzebny)

### NavItem — uproszczenie

Stary `NavItem` obsługiwał query params (`?view=...`). Nowe URL są czyste (`/sgu/sprzedaz`), więc:
```tsx
function NavItem({ item }: { item: NavItemDef }) {
  const location = useLocation();
  const isActive = item.url === '/sgu'
    ? location.pathname === '/sgu'
    : location.pathname.startsWith(item.url);
  // ... NavLink z classami active/inactive
}
```

Uwaga: dla `/sgu` używamy exact match (żeby nie podświetlało się przy `/sgu/sprzedaz`), dla pozostałych `startsWith` (żeby `/sgu/klienci?tab=portfel` też podświetlał Klienci).

### Weryfikacje po edycji (default mode)

1. `npx tsc --noEmit` — exit 0
2. `grep -E "/sgu/pipeline|/sgu/dashboard|/sgu/reports|/sgu/tasks" src/components/layout/SGUSidebar.tsx` → 0 dopasowań
3. `grep -E "/sgu/sprzedaz|/sgu/klienci|/sgu/zadania|/sgu/raporty" src/components/layout/SGUSidebar.tsx` → 4 dopasowania

### Świadome odstępstwa

1. **Brak `useState` / `localStorage`** — per brief, 6 pozycji w jednej grupie nie wymaga collapsible.
2. **`NavLink end` prop** — używamy tylko dla `/sgu` (Dashboard), żeby uniknąć match na sub-routes.
3. **Brak grupy/labela** — wszystko w jednym `SidebarGroup` bez `GroupLabel`.
4. **Sidebar elementy nawigacyjne dla legacy URL** (`/sgu/pipeline?view=...`) z poprzedniego stanu znikają — to było out-of-scope FIX-2, teraz domknięte przy okazji.

### DoD

| Check | Po patchu |
|---|---|
| Liczba pozycji w sidebar (partner+reports on) | 6 |
| Liczba pozycji (seller, reports off) | 4 (Dashboard/Sprzedaż/Klienci/Zadania) |
| `tsc --noEmit` | 0 errors |
| Grep legacy URL | 0 |
| Grep nowe URL | 4 |
| `localStorage` użycie | usunięte |

