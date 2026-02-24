
-- Pipeline stages (per team configuration)
CREATE TABLE public.pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.deal_teams(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  stage_key TEXT NOT NULL,
  kanban_type TEXT NOT NULL CHECK (kanban_type IN ('main', 'sub', 'workflow')),
  parent_stage_key TEXT,
  label TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📋',
  color TEXT NOT NULL DEFAULT '',
  position INT NOT NULL DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  section TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, kanban_type, stage_key)
);

ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view pipeline stages"
  ON public.pipeline_stages FOR SELECT
  USING (public.is_deal_team_member(auth.uid(), team_id));

CREATE POLICY "Team leaders and admins can insert pipeline stages"
  ON public.pipeline_stages FOR INSERT
  WITH CHECK (
    public.is_tenant_admin(auth.uid(), tenant_id)
    OR EXISTS (
      SELECT 1 FROM public.deal_team_members dtm
      JOIN public.directors d ON d.id = dtm.director_id
      WHERE dtm.team_id = pipeline_stages.team_id
        AND d.user_id = auth.uid()
        AND dtm.role = 'leader'
    )
  );

CREATE POLICY "Team leaders and admins can update pipeline stages"
  ON public.pipeline_stages FOR UPDATE
  USING (
    public.is_tenant_admin(auth.uid(), tenant_id)
    OR EXISTS (
      SELECT 1 FROM public.deal_team_members dtm
      JOIN public.directors d ON d.id = dtm.director_id
      WHERE dtm.team_id = pipeline_stages.team_id
        AND d.user_id = auth.uid()
        AND dtm.role = 'leader'
    )
  );

CREATE POLICY "Team leaders and admins can delete pipeline stages"
  ON public.pipeline_stages FOR DELETE
  USING (
    public.is_tenant_admin(auth.uid(), tenant_id)
    OR EXISTS (
      SELECT 1 FROM public.deal_team_members dtm
      JOIN public.directors d ON d.id = dtm.director_id
      WHERE dtm.team_id = pipeline_stages.team_id
        AND d.user_id = auth.uid()
        AND dtm.role = 'leader'
    )
  );

-- Pipeline transitions
CREATE TABLE public.pipeline_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.deal_teams(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  from_stage_id UUID NOT NULL REFERENCES public.pipeline_stages(id) ON DELETE CASCADE,
  to_stage_id UUID NOT NULL REFERENCES public.pipeline_stages(id) ON DELETE CASCADE,
  kanban_type TEXT NOT NULL CHECK (kanban_type IN ('main', 'sub', 'workflow')),
  label TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, from_stage_id, to_stage_id)
);

ALTER TABLE public.pipeline_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view pipeline transitions"
  ON public.pipeline_transitions FOR SELECT
  USING (public.is_deal_team_member(auth.uid(), team_id));

CREATE POLICY "Team leaders and admins can insert pipeline transitions"
  ON public.pipeline_transitions FOR INSERT
  WITH CHECK (
    public.is_tenant_admin(auth.uid(), tenant_id)
    OR EXISTS (
      SELECT 1 FROM public.deal_team_members dtm
      JOIN public.directors d ON d.id = dtm.director_id
      WHERE dtm.team_id = pipeline_transitions.team_id
        AND d.user_id = auth.uid()
        AND dtm.role = 'leader'
    )
  );

CREATE POLICY "Team leaders and admins can update pipeline transitions"
  ON public.pipeline_transitions FOR UPDATE
  USING (
    public.is_tenant_admin(auth.uid(), tenant_id)
    OR EXISTS (
      SELECT 1 FROM public.deal_team_members dtm
      JOIN public.directors d ON d.id = dtm.director_id
      WHERE dtm.team_id = pipeline_transitions.team_id
        AND d.user_id = auth.uid()
        AND dtm.role = 'leader'
    )
  );

CREATE POLICY "Team leaders and admins can delete pipeline transitions"
  ON public.pipeline_transitions FOR DELETE
  USING (
    public.is_tenant_admin(auth.uid(), tenant_id)
    OR EXISTS (
      SELECT 1 FROM public.deal_team_members dtm
      JOIN public.directors d ON d.id = dtm.director_id
      WHERE dtm.team_id = pipeline_transitions.team_id
        AND d.user_id = auth.uid()
        AND dtm.role = 'leader'
    )
  );

-- Seed function for default pipeline stages
CREATE OR REPLACE FUNCTION public.seed_pipeline_stages_for_team(p_team_id UUID, p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Main kanban stages
  INSERT INTO pipeline_stages (team_id, tenant_id, stage_key, kanban_type, label, icon, color, position, is_default) VALUES
    (p_team_id, p_tenant_id, 'hot', 'main', 'HOT LEAD', '🔥', 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300', 0, false),
    (p_team_id, p_tenant_id, 'top', 'main', 'TOP LEAD', '⭐', 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300', 1, false),
    (p_team_id, p_tenant_id, 'offering', 'main', 'OFERTOWANIE', '📝', 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300', 2, false),
    (p_team_id, p_tenant_id, 'audit', 'main', 'AUDYT', '📋', 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300', 3, false),
    (p_team_id, p_tenant_id, 'lead', 'main', 'LEAD', '📋', 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300', 4, true),
    (p_team_id, p_tenant_id, '10x', 'main', '10X', '🚀', 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300', 5, false),
    (p_team_id, p_tenant_id, 'cold', 'main', 'COLD LEAD', '❄️', 'bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-300', 6, false),
    (p_team_id, p_tenant_id, 'client', 'main', 'KLIENT', '✅', 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300', 7, false),
    (p_team_id, p_tenant_id, 'lost', 'main', 'PRZEGRANE', '✖️', 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', 8, false)
  ON CONFLICT (team_id, kanban_type, stage_key) DO NOTHING;

  -- Sub-kanban: audit
  INSERT INTO pipeline_stages (team_id, tenant_id, stage_key, kanban_type, parent_stage_key, label, icon, color, position, is_default) VALUES
    (p_team_id, p_tenant_id, 'audit_plan', 'sub', 'audit', 'Do zaplanowania', '📋', 'border-t-slate-500', 0, true),
    (p_team_id, p_tenant_id, 'audit_scheduled', 'sub', 'audit', 'Zaplanowany', '📅', 'border-t-blue-500', 1, false),
    (p_team_id, p_tenant_id, 'audit_done', 'sub', 'audit', 'Odbyty', '✅', 'border-t-green-500', 2, false)
  ON CONFLICT (team_id, kanban_type, stage_key) DO NOTHING;

  -- Sub-kanban: hot
  INSERT INTO pipeline_stages (team_id, tenant_id, stage_key, kanban_type, parent_stage_key, label, icon, color, position, is_default) VALUES
    (p_team_id, p_tenant_id, 'meeting_plan', 'sub', 'hot', 'Zaplanować spotkanie', '📋', 'border-t-slate-500', 0, true),
    (p_team_id, p_tenant_id, 'meeting_scheduled', 'sub', 'hot', 'Spotkanie umówione', '📅', 'border-t-blue-500', 1, false),
    (p_team_id, p_tenant_id, 'meeting_done', 'sub', 'hot', 'Spotkanie odbyte', '✅', 'border-t-green-500', 2, false)
  ON CONFLICT (team_id, kanban_type, stage_key) DO NOTHING;

  -- Sub-kanban: top (same stages as hot)
  INSERT INTO pipeline_stages (team_id, tenant_id, stage_key, kanban_type, parent_stage_key, label, icon, color, position, is_default) VALUES
    (p_team_id, p_tenant_id, 'top_meeting_plan', 'sub', 'top', 'Zaplanować spotkanie', '📋', 'border-t-slate-500', 0, true),
    (p_team_id, p_tenant_id, 'top_meeting_scheduled', 'sub', 'top', 'Spotkanie umówione', '📅', 'border-t-blue-500', 1, false),
    (p_team_id, p_tenant_id, 'top_meeting_done', 'sub', 'top', 'Spotkanie odbyte', '✅', 'border-t-green-500', 2, false)
  ON CONFLICT (team_id, kanban_type, stage_key) DO NOTHING;

  -- Sub-kanban: offering
  INSERT INTO pipeline_stages (team_id, tenant_id, stage_key, kanban_type, parent_stage_key, label, icon, color, position, is_default) VALUES
    (p_team_id, p_tenant_id, 'handshake', 'sub', 'offering', 'Handshake', '🤝', 'border-t-slate-500', 0, true),
    (p_team_id, p_tenant_id, 'power_of_attorney', 'sub', 'offering', 'Pełnomocnictwo', '📄', 'border-t-blue-500', 1, false),
    (p_team_id, p_tenant_id, 'preparation', 'sub', 'offering', 'Przygotowanie', '📋', 'border-t-amber-500', 2, false),
    (p_team_id, p_tenant_id, 'negotiation', 'sub', 'offering', 'Negocjacje', '💬', 'border-t-purple-500', 3, false),
    (p_team_id, p_tenant_id, 'accepted', 'sub', 'offering', 'Zaakceptowano', '✅', 'border-t-green-500', 4, false),
    (p_team_id, p_tenant_id, 'lost', 'sub', 'offering', 'Przegrano', '✖️', 'border-t-gray-400', 5, false)
  ON CONFLICT (team_id, kanban_type, stage_key) DO NOTHING;

  -- Workflow columns
  INSERT INTO pipeline_stages (team_id, tenant_id, stage_key, kanban_type, parent_stage_key, label, icon, color, position, is_default, section) VALUES
    (p_team_id, p_tenant_id, 'wf_meeting_plan', 'workflow', 'hot,top', 'Zaplanować spotkanie', '📞', 'amber', 0, false, 'spotkania'),
    (p_team_id, p_tenant_id, 'wf_meeting_scheduled', 'workflow', 'hot,top', 'Spotkanie umówione', '📅', 'blue', 1, false, 'spotkania'),
    (p_team_id, p_tenant_id, 'wf_meeting_done', 'workflow', 'hot,top', 'Spotkanie odbyte', '✅', 'emerald', 2, false, 'spotkania'),
    (p_team_id, p_tenant_id, 'wf_handshake', 'workflow', 'offering', 'Handshake', '🤝', 'slate', 3, false, 'ofertowanie'),
    (p_team_id, p_tenant_id, 'wf_power_of_attorney', 'workflow', 'offering', 'Pełnomocnictwo', '📄', 'blue', 4, false, 'ofertowanie'),
    (p_team_id, p_tenant_id, 'wf_preparation', 'workflow', 'offering', 'Przygotowanie', '📋', 'amber', 5, false, 'ofertowanie'),
    (p_team_id, p_tenant_id, 'wf_negotiation', 'workflow', 'offering', 'Negocjacje', '💬', 'purple', 6, false, 'ofertowanie'),
    (p_team_id, p_tenant_id, 'wf_accepted', 'workflow', 'offering', 'Zaakceptowano', '🎉', 'emerald', 7, false, 'ofertowanie'),
    (p_team_id, p_tenant_id, 'wf_offering_lost', 'workflow', 'offering', 'Przegrano', '✖️', 'gray', 8, false, 'ofertowanie'),
    (p_team_id, p_tenant_id, 'wf_audit_plan', 'workflow', 'audit', 'Do zaplanowania', '🔍', 'cyan', 9, false, 'audyt'),
    (p_team_id, p_tenant_id, 'wf_audit_scheduled', 'workflow', 'audit', 'Zaplanowany', '📅', 'blue', 10, false, 'audyt'),
    (p_team_id, p_tenant_id, 'wf_audit_done', 'workflow', 'audit', 'Odbyty', '✅', 'emerald', 11, false, 'audyt'),
    (p_team_id, p_tenant_id, 'wf_client', 'workflow', 'client', 'Klient', '🏆', 'emerald', 12, false, 'zamkniecie'),
    (p_team_id, p_tenant_id, 'wf_lost', 'workflow', 'lost', 'Przegrane', '✖️', 'gray', 13, false, 'zamkniecie'),
    (p_team_id, p_tenant_id, 'wf_other', 'workflow', 'lead,cold,10x', 'Inne', '📁', 'slate', 14, false, 'inne')
  ON CONFLICT (team_id, kanban_type, stage_key) DO NOTHING;
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_pipeline_stages_updated_at
  BEFORE UPDATE ON public.pipeline_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster lookups
CREATE INDEX idx_pipeline_stages_team_type ON public.pipeline_stages(team_id, kanban_type);
CREATE INDEX idx_pipeline_transitions_team_type ON public.pipeline_transitions(team_id, kanban_type);
