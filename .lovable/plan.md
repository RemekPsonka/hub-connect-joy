

# Design System Refresh -- Final Polish

## Current Status

The Design System Refresh (Phase 0) is **95% complete**. All 6 steps from the plan have been implemented:
- Design tokens (violet primary, blue secondary, dark mode)
- Dark sidebar with organized navigation groups
- Sticky header with breadcrumbs, search, theme toggle
- Card system (StatCard, DataCard, EmptyState, SkeletonCard)
- ErrorBoundary visual polish
- Dashboard redesign with new components

The screenshots confirm the sidebar is working correctly with all groups visible.

## Remaining Refinements

There are **3 small fixes** to finalize the design system:

### 1. Fix "Firmy" sidebar link

**Problem:** Both "Kontakty" and "Firmy" link to `/contacts`, but clicking "Firmy" doesn't auto-switch to company view.

**Fix:** Change the Firmy URL to `/contacts?view=companies` and update the Contacts page to read the query parameter and set the initial `viewMode` accordingly.

**Files:**
- `src/components/layout/AppSidebar.tsx` -- change Firmy URL
- `src/pages/Contacts.tsx` -- read `?view=companies` from URL on mount

### 2. Add "Projekty" to Breadcrumbs route map

**Problem:** The `routeLabels` map in Breadcrumbs is missing `projects` entry.

**Fix:** Add `'projects': 'Projekty'` to the routeLabels object.

**File:** `src/components/layout/Breadcrumbs.tsx`

### 3. Sidebar active state for "Firmy"

**Problem:** With the updated URL (`/contacts?view=companies`), the NavLink active state needs to correctly highlight "Firmy" when on the companies view.

**Fix:** Use NavLink's `end` prop and/or custom `isActive` logic for the Firmy item to check for the query parameter.

**File:** `src/components/layout/AppSidebar.tsx`

---

## Technical Details

### AppSidebar.tsx changes

```text
// CRM items - change Firmy URL
const crmItems = [
  { title: 'Kontakty', url: '/contacts', icon: Users },
  { title: 'Firmy', url: '/contacts?view=companies', icon: Building2 },
  { title: 'Siec kontaktow', url: '/network', icon: Network },
];
```

The NavItem component will need a small update to handle query-param-based active detection for the Firmy item.

### Contacts.tsx changes

Read the `view` search param on mount:

```text
const [searchParams] = useSearchParams();
const initialView = searchParams.get('view') === 'companies' ? 'companies' : 'people';
const [viewMode, setViewMode] = useState(initialView);
```

### Breadcrumbs.tsx changes

Add missing route label:

```text
'projects': 'Projekty',
```

## Scope

- 3 files modified
- No new components, hooks, or pages
- No database or backend changes
- Pure UI/navigation fix

