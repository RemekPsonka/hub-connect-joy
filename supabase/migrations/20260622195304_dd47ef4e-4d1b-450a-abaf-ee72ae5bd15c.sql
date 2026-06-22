
-- ROLLBACK: DROP TABLE IF EXISTS public.contact_activity_log CASCADE; DROP TABLE IF EXISTS public.deal_history CASCADE;

-- 1) contact_activity_log
CREATE TABLE public.contact_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contact_activity_log_contact_id ON public.contact_activity_log (contact_id);
CREATE INDEX idx_contact_activity_log_tenant_created ON public.contact_activity_log (tenant_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_activity_log TO authenticated;
GRANT ALL ON public.contact_activity_log TO service_role;

ALTER TABLE public.contact_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY cal_select_tenant ON public.contact_activity_log
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_current_tenant_id());

-- 2) deal_history
CREATE TABLE public.deal_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  changed_by uuid,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  old_stage_id uuid,
  new_stage_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_deal_history_deal_created ON public.deal_history (deal_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_history TO authenticated;
GRANT ALL ON public.deal_history TO service_role;

ALTER TABLE public.deal_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY dh_select_tenant ON public.deal_history
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_current_tenant_id());
