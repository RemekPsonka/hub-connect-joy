

## Plan: Fix duplicate Timeline + final report

User wants 3 concrete steps. This is straightforward cleanup + verification — no new features. Build is broken (duplicate `timelineConfig`/`timelineData` in `ClientPaymentsTab.tsx`), blocking everything.

### Step 1 — Deduplicate `ClientPaymentsTab.tsx`

Per build error + visible file content: lines 67-92 (first `timelineData` + `timelineConfig`) and lines 95-120 (second pair) are duplicates. JSX likely also has duplicate Timeline `<Card>`.

Action:
- Read full file (need to see JSX section past line 220).
- Remove the SECOND `timelineData` useMemo + SECOND `timelineConfig` (lines ~94-122 based on view).
- Find duplicate Timeline `<Card>` in JSX and remove the second one. Keep first Timeline before filters/table.
- Leave imports untouched (first block still uses them).

### Step 2 — Typecheck

Run `npm run typecheck` and paste full output. Fix until 0 errors.

### Step 3 — Final report

Run 4 grep commands, list created/edited/deleted files across IA-2 finish iteration, answer 5 business confirmations.

### Files touched this iteration
- EDIT: `src/components/sgu/clients/ClientPaymentsTab.tsx` (dedup only)

That's it. Everything else from IA-2 is already done in previous iterations.

