
-- Add time_block column
ALTER TABLE public.workspace_schedule ADD COLUMN time_block integer NOT NULL DEFAULT 0;

-- Add validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_workspace_time_block()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.time_block < 0 OR NEW.time_block > 2 THEN
    RAISE EXCEPTION 'time_block must be between 0 and 2';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_workspace_time_block_trigger
BEFORE INSERT OR UPDATE ON public.workspace_schedule
FOR EACH ROW EXECUTE FUNCTION public.validate_workspace_time_block();

-- Drop old unique constraint and add new one
ALTER TABLE public.workspace_schedule DROP CONSTRAINT IF EXISTS workspace_schedule_director_id_day_of_week_key;
ALTER TABLE public.workspace_schedule ADD CONSTRAINT workspace_schedule_director_day_block_key UNIQUE (director_id, day_of_week, time_block);
