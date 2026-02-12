-- Fix search_path hijacking vulnerability in 2 functions

CREATE OR REPLACE FUNCTION public.update_task_categories_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_default_deal_stages()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
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
$$;