-- Dodanie kolumny details do istniejącej tabeli deal_activities
ALTER TABLE public.deal_activities
ADD COLUMN IF NOT EXISTS details JSONB;

-- Indeks GIN dla szybkiego wyszukiwania w JSONB
CREATE INDEX IF NOT EXISTS idx_deal_activities_details 
ON public.deal_activities USING GIN (details);