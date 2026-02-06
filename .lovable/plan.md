

# Fix: Missing useDealsTeamAssignments hook + HotLeadCard task list

## Issues to fix

### Issue 1: Missing `src/hooks/useDealsTeamAssignments.ts`

The database table `deal_team_assignments` exists with correct schema and RLS policies, but there is no React hook to interact with it. This hook is needed for the HotLeadCard mini-task list.

**New file: `src/hooks/useDealsTeamAssignments.ts`**

The hook will provide:
- `useContactAssignments(teamContactId)` -- fetches assignments for a specific deal team contact
- `useCreateAssignment()` -- creates a new assignment
- `useUpdateAssignment()` -- updates assignment (including status toggle for checkbox)

Implementation details:
- Query `deal_team_assignments` filtered by `team_contact_id`
- JOIN with `directors` for `assigned_to` and `assigned_by` names
- On toggle: update `status` between `'pending'` and `'done'`, set `completed_at` when done
- Invalidate query keys: `['deal-team-assignments', teamContactId]`
- Use existing `useAuth()` for `tenant_id` and `director_id`

### Issue 2: HotLeadCard missing mini-task list

**Modified file: `src/components/deals-team/HotLeadCard.tsx`**

Add a compact task list below the existing content showing up to 3 assignments with checkboxes:

```text
Existing card content...
+---------------------------------+
| [x] Przygotuj oferte           |
| [ ] Wyslij kontrakt            |
| +1 wiecej                      |
+---------------------------------+
```

Implementation:
- Import `useContactAssignments` and `useUpdateAssignment` from the new hook
- Render up to 3 assignments with `Checkbox` from shadcn/ui
- Clicking checkbox toggles between `pending` and `done`
- Show "+N wiecej" if more than 3 assignments
- Style completed tasks with `line-through` and muted text

## Files to create/modify

| File | Action |
|------|--------|
| `src/hooks/useDealsTeamAssignments.ts` | CREATE -- CRUD hook for assignments table |
| `src/components/deals-team/HotLeadCard.tsx` | MODIFY -- Add mini-task list with checkboxes |

## Technical details

### useDealsTeamAssignments.ts structure

```typescript
// Query: fetch assignments for a team contact
export function useContactAssignments(teamContactId: string | undefined) {
  // SELECT * FROM deal_team_assignments
  // WHERE team_contact_id = teamContactId
  // ORDER BY status ASC (pending first), priority DESC, created_at DESC
}

// Mutation: toggle assignment status (pending <-> done)
export function useUpdateAssignment() {
  // UPDATE deal_team_assignments SET status, completed_at
  // Invalidate ['deal-team-assignments', teamContactId]
}

// Mutation: create new assignment
export function useCreateAssignment() {
  // INSERT INTO deal_team_assignments
  // Uses director_id for assigned_by
  // Invalidate ['deal-team-assignments', teamContactId]
}
```

### HotLeadCard changes

- Import `useContactAssignments`, `useUpdateAssignment`
- Add after the estimated_value row:

```tsx
// Fetch assignments for this contact
const { data: assignments = [] } = useContactAssignments(contact.id);
const updateAssignment = useUpdateAssignment();

// Render max 3 items
{assignments.length > 0 && (
  <div className="space-y-1">
    {assignments.slice(0, 3).map(a => (
      <div key={a.id} className="flex items-center gap-1.5">
        <Checkbox
          checked={a.status === 'done'}
          onCheckedChange={() => updateAssignment.mutate({
            id: a.id,
            teamContactId: contact.id,
            status: a.status === 'done' ? 'pending' : 'done',
          })}
          className="h-3 w-3"
        />
        <span className={cn("text-xs truncate",
          a.status === 'done' && "line-through text-muted-foreground"
        )}>
          {a.title}
        </span>
      </div>
    ))}
    {assignments.length > 3 && (
      <p className="text-xs text-muted-foreground">
        +{assignments.length - 3} wiecej
      </p>
    )}
  </div>
)}
```

## Guardrails
- No SQL changes needed (table and RLS already exist)
- No modifications to existing hooks
- HotLeadCard only gets additional content appended (no existing code removed)
- Uses existing shadcn/ui Checkbox component

