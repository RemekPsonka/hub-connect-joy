

# ErrorBoundary Enhancement + Standardized Toast Notifications

## Current Situation

### ErrorBoundary
The `ErrorBoundary` at `src/components/ErrorBoundary.tsx` is already a well-built class component with:
- Error logging to Supabase `error_logs` table
- Fallback UI with "Sprobuj ponownie", "Strona glowna", "Zglos blad" actions
- Collapsible error details (dev-only stack traces)
- `withErrorBoundary` HOC helper

It is used in two places:
- `src/App.tsx` -- wraps the entire app (top-level catch-all)
- `src/App.tsx` -- wraps the `<Network />` route specifically

However, `AppLayout.tsx` does NOT wrap the `<Outlet />` with ErrorBoundary, meaning page-level crashes still bubble up to the top-level boundary and lose the sidebar/header context.

### Toast Notifications
- Sonner is the primary toast library (~100 files import `toast` from `sonner`)
- Radix UI Toast (`use-toast`) also exists but is secondary
- No wrapper/utility -- every file imports `toast` directly from `sonner`
- No standardized styling for success/error/warning/info types

## Changes Summary

- **1 file modified**: `src/components/layout/AppLayout.tsx` -- wrap Outlet with ErrorBoundary
- **1 file created**: `src/lib/toast.ts` -- standardized toast wrapper
- **0 files modified** on ErrorBoundary itself -- it already meets all requirements

---

## Detailed Changes

### 1. ErrorBoundary -- NO changes needed

The existing component already satisfies every requirement from the prompt:
- Class component with proper error boundary lifecycle
- Fallback UI with AlertTriangle icon, "Cos poszlo nie tak" heading, description
- "Sprobuj ponownie" button (resets error state)
- "Strona glowna" button (navigates to `/`)
- Dev-only collapsible error details with stack trace
- `fallbackComponent` prop for custom fallbacks
- Supabase error logging
- `withErrorBoundary` HOC

No modifications are necessary.

### 2. Toast Wrapper (`src/lib/toast.ts`) -- NEW file

Create a standardized toast API that wraps Sonner's `toast()` function:

```text
showToast.success(message)   -> green accent, CheckCircle icon, 4s auto-dismiss
showToast.error(message, details?) -> red accent, XCircle icon, 8s auto-dismiss, optional subtitle
showToast.warning(message)   -> amber accent, AlertTriangle icon, 6s auto-dismiss
showToast.info(message)      -> blue accent, Info icon, 4s auto-dismiss
showToast.loading(message)   -> spinner, returns toast ID for later dismiss/update
```

Implementation approach:
- Import `toast` from `sonner`
- Use `toast.custom()` or `toast()` with `className` and `description` props
- Each method renders a custom React element with the icon + styled left border
- `showToast.loading` returns the toast ID so callers can do `toast.dismiss(id)` or `toast.success(message, { id })`

This is purely additive -- existing `toast()` calls throughout the app continue to work unchanged.

### 3. AppLayout Integration (`src/components/layout/AppLayout.tsx`) -- MODIFY

Wrap the `<Outlet />` inside the content area with an ErrorBoundary:

Before:
```text
<main className="flex-1 overflow-auto p-4 md:p-6 bg-background">
  <Outlet />
</main>
```

After:
```text
<main className="flex-1 overflow-auto p-4 md:p-6 bg-background">
  <ErrorBoundary>
    <Outlet />
  </ErrorBoundary>
</main>
```

This means page-level errors will be caught inside the layout, preserving the sidebar and header. The top-level ErrorBoundary in `App.tsx` remains as a final catch-all.

## Technical Details

### Toast wrapper API (src/lib/toast.ts)

The wrapper uses Sonner's `toast()` with custom JSX rendering:

```text
import { toast } from 'sonner';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

export const showToast = {
  success: (message: string) => {
    toast(message, {
      icon: <CheckCircle className="h-5 w-5 text-emerald-500" />,
      duration: 4000,
      className: 'border-l-4 border-l-emerald-500',
    });
  },
  error: (message: string, details?: string) => {
    toast(message, {
      icon: <XCircle className="h-5 w-5 text-red-500" />,
      duration: 8000,
      description: details,
      className: 'border-l-4 border-l-red-500',
    });
  },
  warning: (message: string) => {
    toast(message, {
      icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
      duration: 6000,
      className: 'border-l-4 border-l-amber-500',
    });
  },
  info: (message: string) => {
    toast(message, {
      icon: <Info className="h-5 w-5 text-blue-500" />,
      duration: 4000,
      className: 'border-l-4 border-l-blue-500',
    });
  },
  loading: (message: string) => {
    return toast.loading(message);
  },
};
```

### Sonner configuration update

The existing Sonner `<Toaster>` in `src/components/ui/sonner.tsx` may need a small props addition for `position="bottom-right"` and `visibleToasts={3}` to match the spec. This is a minor one-line change.

### What is NOT changed
- No pages modified
- No hooks modified
- No existing `toast()` calls changed anywhere
- ErrorBoundary.tsx untouched (already complete)
- No database changes

### Files summary
- 1 new file: `src/lib/toast.ts`
- 1 modified: `src/components/layout/AppLayout.tsx` (add ErrorBoundary around Outlet)
- 1 modified: `src/components/ui/sonner.tsx` (add position + visibleToasts props)

