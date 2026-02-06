

# "Moj Dzien" (/my-day) -- Unified Daily View

## Overview

Create a new page at `/my-day` that combines today's tasks, overdue tasks, recent activity, a mini calendar, active projects, and quick actions into a single daily dashboard. Uses exclusively Phase 0 components (StatCard, DataCard, EmptyState, SkeletonCard).

## What changes

- **1 new page**: `src/pages/MyDay.tsx`
- **1 new hook**: `src/hooks/useMyDayData.ts` -- aggregates all queries for the page
- **1 new component**: `src/components/my-day/MiniCalendar.tsx` -- simple grid-based monthly calendar
- **2 files modified**: `src/App.tsx` (add route), `src/components/layout/AppSidebar.tsx` (add nav item)

## Data Sources

| Widget | Query | Table/Source |
|--------|-------|-------------|
| Tasks today | `tasks` WHERE `due_date = today` OR `status = 'in_progress'` | tasks |
| Tasks overdue | `tasks` WHERE `due_date < today` AND `status NOT IN ('done','cancelled')` | tasks |
| Tasks done today | `tasks` WHERE `status = 'done'` AND `updated_at >= today` | tasks |
| Recent activity | `contact_activity_log` ORDER BY `created_at DESC` LIMIT 8 | contact_activity_log |
| Active projects | `projects` WHERE `status IN ('new','in_progress','analysis')` | projects |
| Days with tasks (calendar) | `tasks` WHERE `due_date BETWEEN month_start AND month_end` | tasks |

## Layout Structure

```text
Desktop (grid-cols-12, gap-6):

+-------------------------------------------+-------------------+
| Greeting + 3 mini StatCards (inline flex)  |                   |
| col-span-8                                |  Mini Calendar    |
+-------------------------------------------+  col-span-4       |
| Zadania na dzis (DataCard)                |                   |
| col-span-8                                +-------------------+
|                                           | Moje projekty     |
+-------------------------------------------| col-span-4        |
| Zaglegle (DataCard, conditional)          |                   |
| col-span-8                                +-------------------+
|                                           | Szybkie akcje     |
+-------------------------------------------| col-span-4        |
| Ostatnia aktywnosc (DataCard)             |                   |
| col-span-8                                +-------------------+

Mobile (grid-cols-1):
- Everything stacks vertically
- Right column items appear after left column items
```

## Detailed Implementation

### Route + Sidebar

**App.tsx**: Add lazy import and route under DirectorGuard:
```text
const MyDay = lazy(() => import("./pages/MyDay"));
// In routes:
<Route path="/my-day" element={<DirectorGuard><MyDay /></DirectorGuard>} />
```

**AppSidebar.tsx**: Add to `overviewItems` array:
```text
{ title: 'Moj Dzien', url: '/my-day', icon: Sun }
```
`Sun` icon is already imported in AppSidebar.tsx (line 20) but unused. It will now be used.

### Hook: useMyDayData (src/hooks/useMyDayData.ts)

A single hook that runs 5 parallel queries using `useQuery`:

1. **tasksToday**: Fetches tasks where `due_date` equals today OR `status = 'in_progress'`, filtered by `owner_id` or `assigned_to` matching the current director. Ordered by priority DESC, due_date ASC.

2. **tasksOverdue**: Fetches tasks where `due_date < today` AND `status NOT IN ('done', 'cancelled')`, same ownership filter. Includes a `count` value.

3. **tasksDoneToday**: Counts tasks where `status = 'done'` AND `updated_at >= today start`, same ownership filter. Returns count only.

4. **recentActivity**: Fetches from `contact_activity_log` with `tenant_id` filter, joined with `contacts(id, full_name)`, ordered by `created_at DESC`, limit 8. Gracefully returns empty array on error (table might have no data).

5. **activeProjects**: Fetches from `projects` where `status IN ('new', 'in_progress', 'analysis')` with `tenant_id` filter, limit 5, ordered by `updated_at DESC`.

Return type:
```text
interface MyDayData {
  tasksToday: TaskWithDetails[];
  tasksOverdue: TaskWithDetails[];
  tasksDoneTodayCount: number;
  recentActivity: ActivityLogEntry[];
  activeProjects: ProjectWithOwner[];
  isLoading: boolean;
}
```

All queries use `staleTime: 30 * 1000` (30 seconds) for responsiveness.

### MiniCalendar Component (src/components/my-day/MiniCalendar.tsx)

A simple div-grid based monthly calendar:

- Props: `selectedDate?: Date`, `taskDates?: string[]` (array of 'yyyy-MM-dd' strings with tasks), `onDateSelect?: (date: Date) => void`
- Header: month name + year with prev/next arrows (ChevronLeft/ChevronRight icons)
- Day labels row: Pon, Wt, Sr, Czw, Pt, Sob, Ndz
- Grid: 7 columns, up to 6 rows of day numbers
- Today: `bg-violet-600 text-white rounded-full w-8 h-8`
- Days with tasks: small dot indicator below the number (`w-1 h-1 bg-violet-400 rounded-full`)
- Days outside current month: `text-muted-foreground/30`
- Built purely with divs and date-fns helpers (`startOfMonth`, `endOfMonth`, `eachDayOfInterval`, `startOfWeek`, `endOfWeek`, `isSameDay`, `isSameMonth`)
- No external calendar library

### Page: MyDay.tsx (src/pages/MyDay.tsx)

**Greeting Section** (col-span-8):
- "Dzien dobry, [firstName]!" using `useAuth().director.full_name`
- Formatted date using `toLocaleDateString('pl-PL', { weekday: 'long', ... })`
- 3x inline mini stats in `flex gap-3`:
  - "Na dzis" count (blue)
  - "Zalegle" count (red if > 0, otherwise muted)
  - "Ukonczone" count (emerald)
- These are small custom div badges, NOT full StatCards (too large for inline)

**Zadania na dzis** (col-span-8, DataCard):
- title: "Zadania na dzis"
- action: Button ghost "Wszystkie zadania" navigating to `/tasks`
- Each task row: flex items-center gap-3 py-3 border-b border-border last:border-0
  - Checkbox (Radix Checkbox) -- toggles task status between 'done' and 'pending' using existing `useUpdateTask` mutation with optimistic update
  - Priority dot: w-2 h-2 rounded-full colored by priority (urgent/critical -> red-500, high -> amber-500, medium -> blue-500, low -> slate-300)
  - Title: text-sm font-medium, when done -> line-through text-muted-foreground
  - Right side: project name badge (if project_id exists, from joined data) `bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400 text-xs px-2 py-0.5 rounded-full` + due time `text-xs text-muted-foreground`
- Empty: EmptyState icon CheckCircle title "Wszystko zrobione!" description "Brak zadan na dzis. Czas na nowe wyzwania."

**Zaglegle** (col-span-8, DataCard, CONDITIONAL):
- Only rendered when `tasksOverdue.length > 0`
- title: "Zaglegle" with badge `bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400 rounded-full px-2 text-xs` showing count
- className: `border-l-4 border-l-red-200 dark:border-l-red-800`
- Same task row layout as "Zadania na dzis"
- Shows overdue date relative ("3 dni temu")

**Ostatnia aktywnosc** (col-span-8, DataCard):
- title: "Ostatnia aktywnosc"
- Each activity: flex items-center gap-3 py-2
  - Icon based on `activity_type`: UserPlus for 'created', MessageSquare for 'note_added', Phone for 'call', default Activity icon
  - Description text: text-sm text-foreground (from `description` field)
  - Relative time: text-xs text-muted-foreground
- Empty: EmptyState icon Activity title "Brak aktywnosci" description "Aktywnosc pojawi sie tu automatycznie."

**Mini Calendar** (col-span-4):
- DataCard wrapping MiniCalendar component
- `taskDates` prop populated from a separate lightweight query that fetches task due_dates for the displayed month

**Moje projekty** (col-span-4, DataCard):
- title: "Moje projekty"
- Each project: flex items-center gap-2 py-2
  - Color dot (w-3 h-3 rounded-full, project.color)
  - Name text-sm font-medium truncate
  - Tasks progress not included (would require additional query per project -- too expensive)
- Footer: Button ghost "Wszystkie projekty" -> /projects
- Empty: EmptyState icon FolderOpen title "Brak projektow"

**Szybkie akcje** (col-span-4, DataCard):
- title: "Szybkie akcje"
- Grid grid-cols-2 gap-2 with 4 buttons:
  - "Nowe zadanie" -- Button outline, Plus icon, opens TaskModal (imported from existing component)
  - "Nowy kontakt" -- Button outline, UserPlus icon, navigates to /contacts (opens ContactModal via state)
  - "Nowy projekt" -- Button outline, FolderPlus icon, opens NewProjectDialog (imported from existing component)
  - "AI Chat" -- Button outline with violet accent styling, Bot icon, navigates to /ai

### Loading State

When `isLoading` is true:
- Left column: greeting with skeleton name + 3 skeleton mini stat badges + 2x SkeletonCard variant="list" lines={5}
- Right column: SkeletonCard variant="data" (calendar placeholder) + 2x SkeletonCard variant="list" lines={3}

### Checkbox Optimistic Update

Uses existing `useUpdateTask` from `src/hooks/useTasks.ts`:
```text
const updateTask = useUpdateTask();

const handleToggleTask = (task: Task) => {
  updateTask.mutate({
    id: task.id,
    status: task.status === 'done' ? 'pending' : 'done',
  });
};
```

React Query will automatically invalidate and refetch the task lists, providing near-instant feedback.

## Technical Details

### Task query for "today" tasks

```text
const today = format(new Date(), 'yyyy-MM-dd');

// Tasks for today
const { data } = await supabase
  .from('tasks')
  .select('*, task_contacts(contact_id, contacts(id, full_name))')
  .or(`due_date.eq.${today},status.eq.in_progress`)
  .or(`owner_id.eq.${directorId},assigned_to.eq.${directorId}`)
  .not('status', 'in', '("cancelled")')
  .order('priority', { ascending: false })
  .order('due_date', { ascending: true });
```

Note: Priority sorting will need client-side reordering since Supabase doesn't know the priority weight. The hook will sort client-side using the same `priorityOrder` map from useTasks.

### Activity log query

```text
const { data } = await supabase
  .from('contact_activity_log')
  .select('*, contacts:contact_id(id, full_name)')
  .eq('tenant_id', tenantId)
  .order('created_at', { ascending: false })
  .limit(8);
```

### Calendar task dates query

```text
const { data } = await supabase
  .from('tasks')
  .select('due_date')
  .eq('tenant_id', tenantId)
  .gte('due_date', monthStart)
  .lte('due_date', monthEnd)
  .not('status', 'eq', 'cancelled');

// Extract unique dates
const taskDates = [...new Set(data?.map(t => t.due_date).filter(Boolean))];
```

### Imports for MyDay.tsx

- `useAuth` from contexts
- `useMyDayData` from hooks
- `useUpdateTask` from hooks/useTasks
- `StatCard, DataCard, EmptyState, SkeletonCard` from components/ui
- `Button, Checkbox` from shadcn
- `TaskModal` from components/tasks/TaskModal
- `NewProjectDialog` from components/projects/NewProjectDialog
- `MiniCalendar` from components/my-day/MiniCalendar
- Lucide icons: `Sun, CheckCircle, AlertTriangle, Clock, Plus, UserPlus, FolderPlus, Bot, Activity, MessageSquare, Phone`
- `format, formatDistanceToNow` from date-fns
- `pl` locale

### What is NOT changed

- No existing pages modified (Dashboard, Tasks, Projects remain untouched)
- No existing hooks modified
- No database changes (contact_activity_log already exists)
- No new dependencies
- AppSidebar only gets one new entry in overviewItems array
- App.tsx only gets one new lazy import + route

