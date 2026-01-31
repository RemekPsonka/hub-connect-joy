-- Tabela ocen ryzyka ubezpieczeniowego dla firm
CREATE TABLE insurance_risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID NOT NULL,
  
  -- DNA Operacyjne
  typy_dzialalnosci TEXT[] DEFAULT '{}',
  ryzyka_specyficzne_branzowe JSONB DEFAULT '[]',
  
  -- Domeny ryzyka (JSONB dla elastyczności)
  ryzyko_majatkowe JSONB DEFAULT '{"status": "nie_dotyczy"}',
  ryzyko_oc JSONB DEFAULT '{"status": "nie_dotyczy"}',
  ryzyko_flota JSONB DEFAULT '{"status": "nie_dotyczy"}',
  ryzyko_specjalistyczne JSONB DEFAULT '{"cyber_status": "nie_dotyczy", "do_status": "nie_dotyczy", "car_ear_status": "nie_dotyczy"}',
  ryzyko_pracownicy JSONB DEFAULT '{"zycie_status": "nie_dotyczy", "zdrowie_status": "nie_dotyczy", "podroze_status": "nie_dotyczy"}',
  
  -- Treści generowane przez AI
  ai_analiza_kontekstu TEXT,
  ai_podpowiedzi JSONB DEFAULT '[]',
  ai_brief_brokerski TEXT,
  
  -- Metadane
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unikalny indeks - jedna ocena na firmę
CREATE UNIQUE INDEX idx_insurance_risk_assessments_company ON insurance_risk_assessments(company_id, tenant_id);

-- Polityka RLS
ALTER TABLE insurance_risk_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insurance_risk_assessments_tenant_access"
ON insurance_risk_assessments FOR ALL
USING (auth.uid() IS NOT NULL AND tenant_id = get_current_tenant_id())
WITH CHECK (auth.uid() IS NOT NULL AND tenant_id = get_current_tenant_id());

-- Trigger do aktualizacji updated_at
CREATE TRIGGER update_insurance_risk_assessments_updated_at
BEFORE UPDATE ON insurance_risk_assessments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();