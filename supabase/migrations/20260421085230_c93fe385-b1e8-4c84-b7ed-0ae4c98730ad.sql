ALTER TABLE public.deal_team_contacts
  ADD CONSTRAINT deal_team_contacts_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES public.directors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_deal_team_contacts_assigned_to
  ON public.deal_team_contacts(assigned_to)
  WHERE assigned_to IS NOT NULL;

-- ROLLBACK:
-- DROP INDEX IF EXISTS public.idx_deal_team_contacts_assigned_to;
-- ALTER TABLE public.deal_team_contacts DROP CONSTRAINT IF EXISTS deal_team_contacts_assigned_to_fkey;