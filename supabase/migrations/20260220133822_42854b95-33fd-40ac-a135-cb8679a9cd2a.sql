
-- Table for tracking which CRM contacts are monitored in a deal team's funnel
CREATE TABLE public.deal_team_watched_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.deal_teams(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  added_by UUID REFERENCES public.directors(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, contact_id)
);

-- Enable RLS
ALTER TABLE public.deal_team_watched_contacts ENABLE ROW LEVEL SECURITY;

-- SELECT: team members can view watched contacts for their teams
CREATE POLICY "Team members can view watched contacts"
ON public.deal_team_watched_contacts
FOR SELECT
USING (
  tenant_id = public.get_current_tenant_id()
  AND (
    public.is_tenant_admin(auth.uid(), tenant_id)
    OR public.is_deal_team_member(team_id)
  )
);

-- INSERT: team members can add watched contacts
CREATE POLICY "Team members can add watched contacts"
ON public.deal_team_watched_contacts
FOR INSERT
WITH CHECK (
  tenant_id = public.get_current_tenant_id()
  AND (
    public.is_tenant_admin(auth.uid(), tenant_id)
    OR public.is_deal_team_member(team_id)
  )
);

-- DELETE: team members can remove watched contacts
CREATE POLICY "Team members can remove watched contacts"
ON public.deal_team_watched_contacts
FOR DELETE
USING (
  tenant_id = public.get_current_tenant_id()
  AND (
    public.is_tenant_admin(auth.uid(), tenant_id)
    OR public.is_deal_team_member(team_id)
  )
);
