-- Tabela członków grup kapitałowych
CREATE TABLE public.capital_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  
  -- Firma główna (która ma tę grupę)
  parent_company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Firma członkowska (może być istniejącą firmą w systemie)
  member_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  
  -- Dane z KRS/zewnętrzne
  external_name TEXT NOT NULL,
  external_krs TEXT,
  external_nip TEXT,
  external_regon TEXT,
  
  -- Rola w grupie: parent, subsidiary, affiliate, branch
  relationship_type TEXT NOT NULL DEFAULT 'affiliate',
  
  -- Dane finansowe
  ownership_percent NUMERIC,
  revenue_amount BIGINT,
  revenue_year INTEGER,
  
  -- Źródło danych
  data_source TEXT DEFAULT 'krs',
  krs_verified BOOLEAN DEFAULT false,
  
  -- Metadane
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.capital_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "capital_group_members_tenant_access" ON public.capital_group_members
  FOR ALL USING (auth.uid() IS NOT NULL AND tenant_id = get_current_tenant_id())
  WITH CHECK (auth.uid() IS NOT NULL AND tenant_id = get_current_tenant_id());

-- Indexy
CREATE INDEX idx_capital_group_parent ON public.capital_group_members(parent_company_id);
CREATE INDEX idx_capital_group_member ON public.capital_group_members(member_company_id);
CREATE INDEX idx_capital_group_tenant ON public.capital_group_members(tenant_id);

-- Unique constraints (ignoruj null)
CREATE UNIQUE INDEX idx_capital_group_unique_nip 
  ON public.capital_group_members(parent_company_id, external_nip) 
  WHERE external_nip IS NOT NULL;

CREATE UNIQUE INDEX idx_capital_group_unique_krs 
  ON public.capital_group_members(parent_company_id, external_krs) 
  WHERE external_krs IS NOT NULL;

-- Trigger do updated_at
CREATE TRIGGER update_capital_group_members_updated_at
  BEFORE UPDATE ON public.capital_group_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migracja istniejących danych z companies.group_companies JSONB
INSERT INTO public.capital_group_members (
  tenant_id, parent_company_id, external_name, external_nip, external_krs,
  relationship_type, ownership_percent, revenue_amount, revenue_year,
  data_source
)
SELECT 
  c.tenant_id,
  c.id as parent_company_id,
  gc->>'name' as external_name,
  gc->>'nip' as external_nip,
  gc->>'krs' as external_krs,
  COALESCE(gc->>'role', 'affiliate') as relationship_type,
  (gc->>'ownership_percent')::numeric as ownership_percent,
  (gc->>'revenue_amount')::bigint as revenue_amount,
  (gc->>'revenue_year')::integer as revenue_year,
  'ai_enrichment' as data_source
FROM public.companies c
CROSS JOIN LATERAL jsonb_array_elements(c.group_companies) as gc
WHERE c.group_companies IS NOT NULL 
  AND jsonb_typeof(c.group_companies) = 'array'
  AND gc->>'name' IS NOT NULL
ON CONFLICT DO NOTHING;