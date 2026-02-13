
-- Add snooze columns to deal_team_contacts
ALTER TABLE public.deal_team_contacts
  ADD COLUMN IF NOT EXISTS snoozed_until date,
  ADD COLUMN IF NOT EXISTS snooze_reason text,
  ADD COLUMN IF NOT EXISTS snoozed_from_category text;

-- Index for fast snooze filtering
CREATE INDEX IF NOT EXISTS idx_deal_team_contacts_snoozed
  ON public.deal_team_contacts (snoozed_until)
  WHERE snoozed_until IS NOT NULL;

-- Index for team-based assignment queries (for MyTeamTasks view)
CREATE INDEX IF NOT EXISTS idx_deal_team_assignments_assigned_to
  ON public.deal_team_assignments (assigned_to, status)
  WHERE status IN ('pending', 'in_progress');
