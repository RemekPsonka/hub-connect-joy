

# HeaderBar + Command Palette + Enhanced Breadcrumbs

## Overview

Extract the current inline header from `AppLayout.tsx` into a dedicated `HeaderBar` component, build a proper Command Palette using Shadcn's `CommandDialog` (cmdk), and enhance Breadcrumbs with dynamic name resolution from React Query cache.

## What will change

### New Files
1. **`src/components/layout/HeaderBar.tsx`** -- Standalone header component
2. **`src/components/layout/CommandPalette.tsx`** -- Cmd+K search palette

### Modified Files
3. **`src/components/layout/Breadcrumbs.tsx`** -- Enhanced with dynamic name resolution
4. **`src/components/layout/AppLayout.tsx`** -- Simplified to use HeaderBar

## Detailed Implementation

### 1. HeaderBar (`src/components/layout/HeaderBar.tsx`)

Sticky header bar extracted from the current `AppLayout.tsx` inline header:

- **Layout**: `sticky top-0 z-30 h-14 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800`
- **Left section**: `SidebarTrigger` + `Breadcrumbs`
- **Center section**: Quick search trigger -- a styled button/div that looks like a search input:
  - `rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-400 cursor-pointer`
  - Shows "Szukaj... (Cmd+K)" placeholder text with a Search icon
  - On click: opens the CommandPalette
- **Right section**: Theme toggle (Sun/Moon), NotificationBell, UserMenu
- Manages `isSearchOpen` state and passes it to CommandPalette
- Contains the `useEffect` for Cmd+K / Ctrl+K keyboard shortcut

### 2. Command Palette (`src/components/layout/CommandPalette.tsx`)

Built on top of `CommandDialog` from `src/components/ui/command.tsx`:

- **Props**: `open: boolean`, `onOpenChange: (open: boolean) => void`
- **Search Input**: `CommandInput` with autofocus, placeholder "Wpisz aby szukac..."
- **Debounced queries** (300ms): When user types, fires three parallel queries:
  - Contacts via `supabase.from('contacts').select('id, full_name, company, email').ilike('full_name', '%query%').limit(5)`
  - Companies via `supabase.from('companies').select('id, name, city, industry').ilike('name', '%query%').limit(5)`
  - Projects via `supabase.from('projects').select('id, name, status').ilike('name', '%query%').limit(5)`
- **Result Groups** (using `CommandGroup`):
  - "Kontakty" -- icon Users, shows `full_name` + subtitle `company`
  - "Firmy" -- icon Building2, shows `name` + subtitle `city / industry`
  - "Projekty" -- icon FolderKanban, shows `name` + badge `status`
  - "Nawigacja" -- static quick links (Dashboard, Kontakty, Projekty, Zadania, Siec, Ustawienia, AI Chat), always visible when query is empty
- **On select**: `navigate()` to detail page + close dialog
  - Contact: `/contacts/:id`
  - Company: `/companies/:id`
  - Project: `/projects/:id`
  - Navigation item: direct URL
- **Empty state**: "Brak wynikow" message when no results found
- **Footer**: Keyboard shortcuts hint (arrow navigate, Enter select, Esc close)
- **Coexistence**: The existing `SemanticSearchModal` will be replaced by this CommandPalette. The new palette covers quick navigation + simple search. The full AI semantic search remains available on the `/search` page.

### 3. Enhanced Breadcrumbs (`src/components/layout/Breadcrumbs.tsx`)

Improvements over the current implementation:

- **Dynamic name resolution**: When a segment is a UUID, use `useQueryClient().getQueryData()` to look up the entity name from React Query cache:
  - Check cache key patterns: `['project', id]`, `['contact', id]`, `['company', id]`
  - Extract the `name` or `full_name` field from cached data
  - Fall back to "Szczegoly" if not in cache (keeps current behavior)
- **Style updates**: Keep current styles which already match the design system (text-sm, text-muted-foreground, ChevronRight separator, last item font-medium)
- **Route labels**: Already complete from previous work -- includes 'projects': 'Projekty' and all other routes

### 4. Simplified AppLayout (`src/components/layout/AppLayout.tsx`)

- Remove the inline `<header>` block (lines 44-82)
- Remove `SemanticSearchModal` import and usage
- Remove `isSearchOpen` state and Cmd+K `useEffect`
- Remove unused imports (`Search`, `Input`, `Sun`, `Moon`, `SemanticSearchModal`, `useTheme`)
- Replace with: `<HeaderBar />`
- Keep: `RemekChatWidget`, `ReportBugButton`

## Technical Details

### Data flow

```text
AppLayout
  +-- HeaderBar
  |     +-- SidebarTrigger
  |     +-- Breadcrumbs (enhanced with QueryClient cache lookup)
  |     +-- SearchTrigger (opens CommandPalette)
  |     +-- ThemeToggle + NotificationBell + UserMenu
  |     +-- CommandPalette (CommandDialog with grouped search)
  +-- <main> <Outlet /> </main>
```

### Dependencies used
- `cmdk` (already installed) via `@/components/ui/command`
- `@supabase/supabase-js` for direct search queries in CommandPalette
- `@tanstack/react-query` for `useQueryClient` in Breadcrumbs
- `react-router-dom` for `useNavigate` in CommandPalette

### What is NOT changed
- `AppSidebar.tsx` -- untouched
- No page components modified
- No hooks modified
- No database changes
- `SemanticSearchModal` file remains but is no longer imported in AppLayout (can be cleaned up later)

## Scope

- 2 new files created
- 2 existing files modified
- 0 database changes
- 0 hook changes

