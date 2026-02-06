-- Dodanie nowych kolumn do deal_stages
ALTER TABLE public.deal_stages
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS probability_default INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Trigger dla updated_at
CREATE TRIGGER update_deal_stages_updated_at
  BEFORE UPDATE ON public.deal_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Funkcja tworzenia domyślnych etapów przy nowym tenancie
CREATE OR REPLACE FUNCTION public.create_default_deal_stages()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.deal_stages 
    (tenant_id, name, color, position, probability_default, is_closed_won, is_closed_lost) 
  VALUES
    (NEW.id, 'Lead', '#6366f1', 1, 10, false, false),
    (NEW.id, 'Kwalifikacja', '#8b5cf6', 2, 25, false, false),
    (NEW.id, 'Propozycja', '#ec4899', 3, 50, false, false),
    (NEW.id, 'Negocjacje', '#f59e0b', 4, 75, false, false),
    (NEW.id, 'Zamknięty - Wygrany', '#10b981', 5, 100, true, false),
    (NEW.id, 'Zamknięty - Przegrany', '#ef4444', 6, 0, false, true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger na tabeli tenants
CREATE TRIGGER trigger_create_default_deal_stages
  AFTER INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_deal_stages();