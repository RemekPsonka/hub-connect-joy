ALTER TABLE public.deal_team_contacts 
ADD COLUMN review_frequency text DEFAULT 'quarterly';

-- Use trigger-based validation instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_review_frequency()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.review_frequency IS NOT NULL AND NEW.review_frequency NOT IN ('monthly', 'quarterly', 'semi_annual', 'annual') THEN
    RAISE EXCEPTION 'Invalid review_frequency value: %', NEW.review_frequency;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_review_frequency_trigger
BEFORE INSERT OR UPDATE ON public.deal_team_contacts
FOR EACH ROW
EXECUTE FUNCTION public.validate_review_frequency();