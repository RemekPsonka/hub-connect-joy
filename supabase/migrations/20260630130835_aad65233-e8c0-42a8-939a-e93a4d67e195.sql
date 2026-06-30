
CREATE OR REPLACE FUNCTION public.is_tenant_owner(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.directors d
    WHERE d.user_id = _user_id
      AND d.tenant_id = _tenant_id
      AND d.role = 'owner'
  )
$$;

CREATE TABLE public.crm_outreach (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  owner_director_id uuid REFERENCES public.directors(id),
  campaign text,
  sequence_status text NOT NULL DEFAULT 'nowy'
    CHECK (sequence_status IN ('nowy','wyslano_1','wyslano_2','odpowiedzial','zamkniety')),
  next_action_at date,
  last_contact_at date,
  retries integer NOT NULL DEFAULT 0,
  sending_mailbox text,
  channel text DEFAULT 'email'
    CHECK (channel IN ('email','linkedin','whatsapp','telefon','inne')),
  last_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_outreach_contact_campaign_unique UNIQUE (contact_id, campaign)
);

CREATE INDEX idx_crm_outreach_next_action_at ON public.crm_outreach (next_action_at);
CREATE INDEX idx_crm_outreach_sequence_status ON public.crm_outreach (sequence_status);
CREATE INDEX idx_crm_outreach_tenant_id ON public.crm_outreach (tenant_id);
CREATE INDEX idx_crm_outreach_contact_id ON public.crm_outreach (contact_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_outreach TO authenticated;
GRANT ALL ON public.crm_outreach TO service_role;

ALTER TABLE public.crm_outreach ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_outreach_owner_select ON public.crm_outreach
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND public.is_tenant_owner(auth.uid(), tenant_id));

CREATE POLICY crm_outreach_owner_insert ON public.crm_outreach
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND public.is_tenant_owner(auth.uid(), tenant_id));

CREATE POLICY crm_outreach_owner_update ON public.crm_outreach
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL AND public.is_tenant_owner(auth.uid(), tenant_id))
  WITH CHECK (auth.uid() IS NOT NULL AND public.is_tenant_owner(auth.uid(), tenant_id));

CREATE POLICY crm_outreach_owner_delete ON public.crm_outreach
  FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL AND public.is_tenant_owner(auth.uid(), tenant_id));

CREATE TRIGGER trg_crm_outreach_updated_at
  BEFORE UPDATE ON public.crm_outreach
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
