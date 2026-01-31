-- Dodanie nowej kolumny JSONB dla ryzyka finansowego
ALTER TABLE public.insurance_risk_assessments
ADD COLUMN IF NOT EXISTS ryzyko_finansowe JSONB DEFAULT '{
  "gwarancje_kontraktowe_status": "nie_dotyczy",
  "gwarancje_celne_status": "nie_dotyczy",
  "kredyt_kupiecki_status": "nie_dotyczy",
  "ochrona_prawna_status": "nie_dotyczy"
}'::jsonb;

-- Komentarz opisujący kolumnę
COMMENT ON COLUMN public.insurance_risk_assessments.ryzyko_finansowe IS 
  'Ubezpieczenia finansowe: gwarancje kontraktowe, celne, kredyt kupiecki, ochrona prawna';