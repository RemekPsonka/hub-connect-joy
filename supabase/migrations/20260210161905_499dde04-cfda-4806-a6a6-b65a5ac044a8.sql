
-- Add auto_assign_mode to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS auto_assign_mode TEXT;

-- Create trigger function for auto-assigning tasks
CREATE OR REPLACE FUNCTION public.auto_assign_new_task()
RETURNS TRIGGER AS $$
DECLARE
  v_mode TEXT;
  v_member_id UUID;
BEGIN
  -- Only proceed if task has a project_id and no owner_id set
  IF NEW.project_id IS NULL OR NEW.owner_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Check if project has auto_assign_mode enabled
  SELECT auto_assign_mode INTO v_mode
  FROM public.projects
  WHERE id = NEW.project_id;

  IF v_mode IS NULL THEN
    RETURN NEW;
  END IF;

  -- Find the project member with the fewest active tasks
  SELECT pm.director_id INTO v_member_id
  FROM public.project_members pm
  WHERE pm.project_id = NEW.project_id
  ORDER BY (
    SELECT COUNT(*)
    FROM public.tasks t
    WHERE t.owner_id = pm.director_id::text
      AND t.project_id = NEW.project_id
      AND t.status IN ('pending', 'in_progress')
  ) ASC
  LIMIT 1;

  IF v_member_id IS NOT NULL THEN
    NEW.owner_id := v_member_id::text;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS auto_assign_task_trigger ON public.tasks;
CREATE TRIGGER auto_assign_task_trigger
  BEFORE INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_new_task();
