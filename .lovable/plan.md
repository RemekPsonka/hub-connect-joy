

## BLOK IA-3-FIX-2 — DealsTeamDashboard cleanup

### PRE-RECON (twarde dane)

**Aktualny stan `src/pages/DealsTeamDashboard.tsx`:**
- `VALID_VIEWS` (linia 24): `['kanban', 'table', 'prospecting', 'clients', 'tasks', 'offering']` — **tylko `offering` do usunięcia** (reszta śmieciowa już wyczyszczona w BLOK 2).
- `viewMode === '...'` branches (linie 186-191): kanban, table, prospecting, clients, tasks, **offering** — tylko offering do usunięcia.
- `forcedFilter` mapping (linie 99-105): `offering: { view: 'offering' }` — wymaga przemapowania.
- Toast redirect (linie 56-77): pełna mapa legacy → SGU, działa poprawnie. **Zostaje bez zmian** (per brief pkt 6).

**Brak referencji w `DealsTeamDashboard.tsx`** do: `SnoozedTeamView`, `TeamStats`, `SalesFunnelDashboard`, `CommissionsTab`, `CommissionsTable`, `SGUClientsView`, `Tabs/TabsList/...`. Te zostały wyczyszczone w poprzednich blokach.

**Pliki w repo (nie ruszamy):** `src/components/deals-team/OfferingTab.tsx`, `SnoozedTeamView.tsx`, `TeamStats.tsx`, oraz reeksporty w `src/components/deals-team/index.ts` (linie 35-36) — zostają (per brief: "tylko bez referencji z routera").

**Out of scope** (świadome odstępstwo): `src/components/layout/SGUSidebar.tsx` linie 53-57 wciąż używają legacy `/sgu/pipeline?view=...`. To inny route niż `/sgu/sprzedaz` i nie jest częścią tego BLOK-u.

### Zmiany

**1 plik EDITED:** `src/pages/DealsTeamDashboard.tsx`

**a)** Linia 17 — usuń import `OfferingTab`:
```ts
import {
  TeamSelector, KanbanBoard, CreateTeamDialog, WeeklyStatusPanel,
  TableView, TeamSettings, ProspectingTab, ClientsTab, MyTeamTasksView,
} from '@/components/deals-team';
```

**b)** Linia 21 — zwęź `ViewMode`:
```ts
type ViewMode = 'kanban' | 'table' | 'prospecting' | 'clients' | 'tasks';
```

**c)** Linia 24 — zwęź `VALID_VIEWS`:
```ts
const VALID_VIEWS: ViewMode[] = ['kanban', 'table', 'prospecting', 'clients', 'tasks'];
```

**d)** Linie 99-105 — przemapuj forcedFilter `'offering'` na `kanban` + filter=`offering` (KanbanBoard otrzyma filter z URL i może filtrować stage; brak dodatkowej zmiany w KanbanBoard — dziedziczone z poprzedniej IA):
```ts
const map: Record<SalesFilter, { view: ViewMode; filter?: string }> = {
  prospect: { view: 'kanban', filter: 'prospect' },
  lead:     { view: 'kanban', filter: 'lead' },
  offering: { view: 'kanban', filter: 'offering' },  // ← było view:'offering'
  today:    { view: 'tasks',  filter: 'today' },
  overdue:  { view: 'tasks',  filter: 'overdue' },
};
```

**e)** Linia 191 — usuń branch:
```tsx
{/* usunięte: viewMode === 'offering' */}
```

### Świadome odstępstwa

1. **SGUSidebar legacy linki** (`/sgu/pipeline?view=offering` itd.) zostają — to inny route. Toast redirect i tak je przekieruje na nowe SGU URL. Cleanup tych linków = osobny BLOK.
2. **`OfferingTab` reeksport** w `src/components/deals-team/index.ts` zostaje (per brief pkt 5 — pliki nie usuwane).
3. **Brak zmian w KanbanBoard** — zakładam że już obsługuje `filter=offering` z URL (z poprzednich IA). Jeśli nie filtruje na `category='offering'`, karty będą widoczne wszystkie — ale to logika lejka, nie cleanup routingu.

### DoD lokalny

| Check | Po patchu |
|---|---|
| `grep "SnoozedTeamView" src/pages/` | 0 ✅ (już 0) |
| `grep "OfferingTab" src/pages/` | 0 ✅ (po usunięciu importu i branch) |
| `grep "TeamStats" src/pages/` | 0 ✅ (już 0, tylko komentarz w linii 183 — neutralny) |
| `npm run typecheck` | przechodzi (mniejszy union type, brak nowych typów) |
| `/sgu/sprzedaz` przy klik karty Ofertowanie | URL → `view=kanban&filter=offering`, KanbanBoard renderuje |

### Pliki

| Plik | Zakres |
|---|---|
| `src/pages/DealsTeamDashboard.tsx` | -1 import, ViewMode union -1, VALID_VIEWS -1, forcedFilter mapping (offering→kanban), -1 JSX branch |

