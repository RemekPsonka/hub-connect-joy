
-- 1. resource_institutions
CREATE TABLE public.resource_institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'inne',
  description text,
  logo_url text,
  created_by uuid REFERENCES public.directors(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.resource_institutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select" ON public.resource_institutions FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY "tenant_insert" ON public.resource_institutions FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY "tenant_update" ON public.resource_institutions FOR UPDATE USING (tenant_id = get_current_tenant_id());
CREATE POLICY "tenant_delete" ON public.resource_institutions FOR DELETE USING (tenant_id = get_current_tenant_id());

CREATE TRIGGER update_resource_institutions_updated_at
  BEFORE UPDATE ON public.resource_institutions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. resource_entries
CREATE TABLE public.resource_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.resource_institutions(id) ON DELETE CASCADE,
  title text NOT NULL,
  person_name text,
  person_position text,
  notes text,
  importance text NOT NULL DEFAULT 'medium',
  created_by uuid REFERENCES public.directors(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.resource_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select" ON public.resource_entries FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY "tenant_insert" ON public.resource_entries FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY "tenant_update" ON public.resource_entries FOR UPDATE USING (tenant_id = get_current_tenant_id());
CREATE POLICY "tenant_delete" ON public.resource_entries FOR DELETE USING (tenant_id = get_current_tenant_id());

CREATE TRIGGER update_resource_entries_updated_at
  BEFORE UPDATE ON public.resource_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. resource_connectors
CREATE TABLE public.resource_connectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  resource_entry_id uuid NOT NULL REFERENCES public.resource_entries(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  relationship_description text,
  strength text NOT NULL DEFAULT 'moderate',
  verified boolean NOT NULL DEFAULT false,
  last_verified_at timestamptz,
  created_by uuid REFERENCES public.directors(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.resource_connectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select" ON public.resource_connectors FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY "tenant_insert" ON public.resource_connectors FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY "tenant_update" ON public.resource_connectors FOR UPDATE USING (tenant_id = get_current_tenant_id());
CREATE POLICY "tenant_delete" ON public.resource_connectors FOR DELETE USING (tenant_id = get_current_tenant_id());

CREATE INDEX idx_resource_entries_institution ON public.resource_entries(institution_id);
CREATE INDEX idx_resource_connectors_entry ON public.resource_connectors(resource_entry_id);
CREATE INDEX idx_resource_connectors_contact ON public.resource_connectors(contact_id);
