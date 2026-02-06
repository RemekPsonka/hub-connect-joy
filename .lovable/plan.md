
# Dashboard Redesign with Phase 0 Components

## Overview

Rebuild `src/pages/Dashboard.tsx` into a widget-based 12-column grid layout using exclusively the Phase 0 components (StatCard, DataCard, EmptyState, SkeletonCard). The page will use existing hooks for data fetching and lazy-load recharts for the activity chart.

## What changes

- **1 file modified**: `src/pages/Dashboard.tsx` -- complete rewrite of the page layout and content

## Data Sources (existing hooks -- NOT modified)

| Widget | Hook | Data |
|--------|------|------|
| StatCards | `useDashboardStats()` | total_contacts, pending_tasks, today_consultations, healthy/warning/critical contacts |
| Activity Chart | `useContacts({ sortBy: 'created_at', sortOrder: 'desc' })` inline query | Last 7 days activity from direct Supabase query |
| Upcoming Meetings | `useUpcomingConsultations(5)` from `useConsultations` | Next 5 scheduled consultations |
| Active Projects | `useProjects()` | Filtered client-side to status IN (new, in_progress, analysis), limit 5 |
| Recent Contacts | `useContacts({ sortBy: 'created_at', sortOrder: 'desc', pageSize: 5 })` | 5 most recent contacts |

## Layout Structure

```text
Desktop (grid-cols-12):

+--------+--------+--------+--------+
| StatCard| StatCard| StatCard| StatCard|
| span-3 | span-3 | span-3 | span-3 |
+--------+--------+--------+--------+
| Activity Chart (recharts)  | Upcoming |
| col-span-8                 | span-4   |
+----------------------------+----------+
| Projects in Progress       | Recent   |
| col-span-6                 | Contacts |
|                            | span-6   |
+----------------------------+----------+

Tablet (sm:grid-cols-6):
- StatCards: span-3 each (2 per row)
- Activity Chart: span-6 (full width)
- Upcoming: span-6 (full width)
- Projects: span-6
- Recent Contacts: span-6

Mobile (grid-cols-1):
- Everything stacks vertically
```

## Detailed Implementation

### Welcome Section

Keep existing welcome header with director's first name and formatted date. Simplified layout -- no longer wrapped in extra divs.

### Top Row -- 4 StatCards

Each card uses the upgraded StatCard component with `color` prop:

1. **Kontakty** -- icon: `Users`, value: `total_contacts`, color: `'blue'`, trend: computed from `new_contacts_30d` and `contacts_prev_30d` (percentage change)
2. **Zadania w toku** -- icon: `CheckSquare`, value: `pending_tasks`, color: `'violet'`
3. **Spotkania dzis** -- icon: `Calendar`, value: `today_consultations`, color: `'emerald'`
4. **Srednia relacji** -- icon: `Heart`, value: computed health percentage from `healthy_contacts / (healthy + warning + critical) * 100`, formatted as `XX%`, color: `'amber'`

### Middle Row -- Activity Chart + Upcoming Meetings

**Activity Chart (col-span-8)**:
- DataCard with title "Aktywnosc tygodnia"
- Action slot: a Select dropdown with options Tydzien/Miesiac/Kwartal (only Tydzien functional)
- Body: Lazy-loaded recharts `LineChart` inside `Suspense` with `SkeletonCard variant="data" lines={6}` fallback
- Chart data: Simple inline query fetching contact/task creation counts over last 7 days using `supabase.from('contacts').select('created_at')` with date filtering, grouped by day
- Uses `ResponsiveContainer`, `Line`, `XAxis`, `YAxis`, `Tooltip`, `CartesianGrid`
- Line color: violet-500 (`#8b5cf6`)

**Upcoming Meetings (col-span-4)**:
- DataCard with title "Nadchodzace spotkania"
- Body: List of up to 5 consultations from `useUpcomingConsultations(5)`
- Each item: flex gap-3 with a violet dot indicator (`w-2 h-2 rounded-full bg-violet-500 mt-2`) + title (`text-sm font-medium`) + formatted time (`text-xs text-muted-foreground`)
- Empty state: `EmptyState` with Calendar icon, "Brak spotkan", "Spokojny dzien!"
- Footer: Link "Zobacz konsultacje" navigating to `/consultations`

### Bottom Row -- Projects + Recent Contacts

**Projects (col-span-6)**:
- DataCard with title "Projekty w toku"
- Action: Button ghost "Zobacz wszystkie" linking to `/projects`
- Body: Up to 5 projects filtered client-side from `useProjects()` where status is `new`, `in_progress`, or `analysis`
- Each item: flex justify-between items-center py-2 with bottom border
  - Left: color dot (w-3 h-3 rounded-full, using project.color) + name (text-sm font-medium)
  - Right: status badge using `getStatusConfig()`
- Empty state: EmptyState with FolderOpen icon, "Brak projektow", actionLabel "Utworz projekt", onAction navigates to `/projects`

**Recent Contacts (col-span-6)**:
- DataCard with title "Ostatnio dodane kontakty"
- Action: Button ghost "Wszyscy" linking to `/contacts`
- Body: 5 most recent contacts from `useContacts({ sortBy: 'created_at', sortOrder: 'desc', pageSize: 5 })`
- Each item: flex items-center gap-3 py-2 with bottom border
  - Avatar circle (w-8 h-8 rounded-full bg-muted) with initials
  - Name (text-sm font-medium) + company (text-xs text-muted-foreground)
  - Right: relative time using `formatDistanceToNow` from date-fns ("2h temu")

### Loading State

When `isLoading` is true:
- Top row: 4x `SkeletonCard variant="stat"`
- Middle left: `SkeletonCard variant="data" lines={6}` with col-span-8
- Middle right: `SkeletonCard variant="list" lines={5}` with col-span-4
- Bottom: 2x `SkeletonCard variant="data" lines={5}` with col-span-6 each

### Empty State (no contacts)

When `total_contacts === 0` and not loading, show a full-width DataCard with EmptyState (same as current behavior but styled consistently).

## Technical Details

### Recharts lazy loading

```text
const LazyLineChart = lazy(() =>
  import('recharts').then((m) => ({ default: m.LineChart }))
);
// Additional named exports loaded alongside:
// ResponsiveContainer, Line, XAxis, YAxis, Tooltip, CartesianGrid
// These will be imported via a wrapper component that's lazy-loaded as a whole
```

To avoid issues with multiple named exports, the chart will be extracted into a small inline component `ActivityChart` defined within Dashboard.tsx (not a separate file), and the entire recharts import block will be inside that component. The lazy boundary wraps this inline component.

### Activity data query

A simple `useQuery` inside the Dashboard component:

```text
useQuery({
  queryKey: ['dashboard-activity-7d', tenantId],
  queryFn: async () => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      return format(d, 'yyyy-MM-dd');
    });

    const { data: contacts } = await supabase
      .from('contacts')
      .select('created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', days[0]);

    const { data: tasks } = await supabase
      .from('tasks')
      .select('created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', days[0]);

    return days.map(day => ({
      day: format(new Date(day), 'EEE', { locale: pl }),
      kontakty: contacts?.filter(c => c.created_at?.startsWith(day)).length || 0,
      zadania: tasks?.filter(t => t.created_at?.startsWith(day)).length || 0,
    }));
  },
  enabled: !!tenantId,
  staleTime: 5 * 60 * 1000,
});
```

### Health score computation

```text
const total = (healthy_contacts || 0) + (warning_contacts || 0) + (critical_contacts || 0);
const healthPercent = total > 0 ? Math.round(((healthy_contacts || 0) / total) * 100) : 0;
```

### Contacts trend computation

```text
const prevCount = dashboardStats?.contacts_prev_30d || 0;
const newCount = dashboardStats?.new_contacts_30d || 0;
const trendValue = prevCount > 0 ? Math.round(((newCount - prevCount) / prevCount) * 100) : 0;
```

### Imports

- `useAuth`, `useDashboardStats`, `useUpcomingConsultations`, `useProjects`, `useContacts` -- existing hooks
- `StatCard`, `DataCard`, `EmptyState`, `SkeletonCard` -- Phase 0 components
- `Button` -- from shadcn
- `Users, CheckSquare, Calendar, Heart, FolderOpen, UserPlus` -- Lucide icons
- `useNavigate` -- react-router-dom
- `formatDistanceToNow, subDays, format` -- date-fns
- `lazy, Suspense, useState` -- React
- `useQuery` -- tanstack/react-query
- `supabase` -- integrations client

### What is NOT changed

- No hooks modified
- No other pages modified
- No new components created (chart is inline)
- No database changes
- Existing dashboard sub-components (QuickActions, RelationshipAlerts, etc.) are no longer imported but their files remain untouched for potential future use
- AppSidebar, HeaderBar, ErrorBoundary untouched
