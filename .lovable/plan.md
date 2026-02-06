

# Fix: "invalid input syntax for type uuid" in PromoteDialog

## Problem
When promoting a contact from TOP to HOT, selecting "Kto idzie na spotkanie" (who goes to the meeting) sends the director's **name** (e.g., "Adam") to the database instead of their **UUID**. The `next_meeting_with` column in the database is of type `uuid`, which causes the error:

```
Blad aktualizacji: invalid input syntax for type uuid: "Adam"
```

## Root Cause
In `src/components/deals-team/PromoteDialog.tsx`, line 248:

```tsx
// BUG: uses full_name as value instead of director_id
<SelectItem key={member.id} value={member.director?.full_name || member.director_id}>
```

This passes the director's name as the select value, which then gets saved to the `next_meeting_with` UUID column.

## Fix
Change line 248 to use `member.director_id` as the value (matching the UUID type of the column):

```tsx
// FIXED: always use director_id (UUID) as value
<SelectItem key={member.id} value={member.director_id}>
```

## Files Changed

| File | Change |
|------|--------|
| `src/components/deals-team/PromoteDialog.tsx` | Line 248: Change `value` from `member.director?.full_name \|\| member.director_id` to `member.director_id` |

This is a one-line fix. No other files need to be modified.
