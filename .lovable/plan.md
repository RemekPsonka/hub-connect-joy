

# Upgrade Reusable Card Components to New Design Spec

## Current Situation

All four components already exist in `src/components/ui/` and are actively used across ~15 files (Dashboard, Projects, ProjectDetail, Analytics, BugReports, Matches, etc.). The updates must be **backward-compatible** to avoid breaking existing pages.

## Changes Summary

- 4 files modified (existing components upgraded)
- 0 new files (components already exist, no barrel export file needed as direct imports are the project convention)
- 0 pages modified (guardrail: no page changes)

---

## Component Updates

### 1. StatCard (`src/components/ui/stat-card.tsx`)

**What changes:**
- Add `color` prop: `'violet' | 'blue' | 'emerald' | 'amber' | 'red'` (default: `'violet'`)
- Add `label` as alias for `title` (keep `title` working for backward compat)
- Icon container color maps to the `color` prop:
  - `violet` -> `bg-violet-50 text-violet-600` / dark: `bg-violet-950/30 text-violet-400`
  - `blue` -> `bg-blue-50 text-blue-600` / dark: `bg-blue-950/30 text-blue-400`
  - `emerald` -> `bg-emerald-50 text-emerald-600` / dark variants
  - `amber` -> `bg-amber-50 text-amber-600`
  - `red` -> `bg-red-50 text-red-600`
- Add `hover:shadow-md transition-shadow` to outer container
- Keep existing props (`title`, `value`, `icon`, `loading`, `trend`, `className`) working unchanged

**Backward compat:** `title` still works, `color` defaults to `'violet'` (currently uses `bg-primary/10` which is violet anyway).

### 2. DataCard (`src/components/ui/data-card.tsx`)

**What changes:**
- Add `isLoading` prop (optional boolean)
- When `isLoading=true`, the body content is replaced with skeleton lines (3 animated pulse bars)
- Keep all existing props (`title`, `description`, `action`, `children`, `footer`, `className`, `noPadding`) unchanged

**Backward compat:** Fully backward-compatible, `isLoading` is optional and defaults to `false`.

### 3. EmptyState (`src/components/ui/empty-state.tsx`)

**What changes:**
- Add flat props `actionLabel` and `onAction` as alternatives to the current `action` object
- Component checks both: if `action` object exists, use it; else if `actionLabel` + `onAction` exist, use those
- Refine icon styling to `text-muted-foreground/40` (currently `text-muted-foreground`) for subtler look
- Adjust padding from `py-16` to `py-12` per spec

**Backward compat:** The `action` object prop remains fully functional. New `actionLabel`/`onAction` props are additive.

### 4. SkeletonCard (`src/components/ui/skeleton-card.tsx`)

**What changes:**
- Add `variant` prop: `'stat' | 'data' | 'list'` (default: `'data'`)
- `variant='stat'`: Circle icon placeholder (w-10 h-10 rounded-lg) + large value bar (h-8 w-24) + small label bar (h-4 w-16)
- `variant='data'`: Header bar (h-12 border-b) + body with `lines` x content bars -- similar to current but with header
- `variant='list'`: Each line shows avatar circle (w-8 h-8 rounded-full) + text bar (flex-1 h-4)
- Keep existing props (`height`, `className`, `lines`) working

**Backward compat:** Default variant is `'data'` which closely matches current behavior, so existing usages render the same way.

---

## Technical Details

### Color mapping (StatCard)

```text
const iconColorMap = {
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400',
  blue:   'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400',
  emerald:'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400',
  amber:  'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400',
  red:    'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400',
};
```

### Loading skeleton (DataCard)

When `isLoading` is true, body renders:
```text
<div className="space-y-3 animate-pulse">
  <div className="h-4 w-3/4 bg-muted rounded-md" />
  <div className="h-4 w-1/2 bg-muted rounded-md" />
  <div className="h-4 w-2/3 bg-muted rounded-md" />
</div>
```

### No barrel export file

The project convention is direct imports (e.g., `import { StatCard } from '@/components/ui/stat-card'`). All ~15 existing usage sites already use this pattern. Adding a barrel `index.ts` would be non-standard for this project, so it will be skipped.

### What is NOT changed
- No pages modified
- No hooks modified
- No database changes
- AppSidebar, HeaderBar, Breadcrumbs untouched
- All existing component usages continue working without changes

