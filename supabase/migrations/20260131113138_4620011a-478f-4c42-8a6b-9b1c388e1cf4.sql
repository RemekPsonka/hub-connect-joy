-- Helper function to get current director ID
CREATE OR REPLACE FUNCTION public.get_current_director_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.directors WHERE user_id = auth.uid() LIMIT 1
$$;

-- 1. Rozszerzenie tabeli tasks o nowe kolumny
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES public.directors(id),
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.directors(id),
ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private' CHECK (visibility IN ('private', 'team', 'public')),
ADD COLUMN IF NOT EXISTS category_id uuid,
ADD COLUMN IF NOT EXISTS workflow_step text,
ADD COLUMN IF NOT EXISTS snoozed_until date,
ADD COLUMN IF NOT EXISTS source_task_id uuid REFERENCES public.tasks(id);

-- 2. Tabela kategorii zadań
CREATE TABLE IF NOT EXISTS public.task_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text DEFAULT '#6366f1',
  icon text DEFAULT 'list-todo',
  visibility_type text DEFAULT 'individual' CHECK (visibility_type IN ('individual', 'team', 'shared')),
  is_kpi boolean DEFAULT false,
  kpi_target integer,
  workflow_steps jsonb,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Historia workflow
CREATE TABLE IF NOT EXISTS public.task_workflow_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  step_id text NOT NULL,
  completed_by uuid REFERENCES public.directors(id),
  completed_at timestamptz DEFAULT now(),
  notes text,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE
);

-- 4. FK dla category_id w tasks
ALTER TABLE public.tasks 
ADD CONSTRAINT tasks_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES public.task_categories(id) ON DELETE SET NULL;

-- 5. Indeksy dla wydajności
CREATE INDEX IF NOT EXISTS idx_tasks_owner_id ON public.tasks(owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_visibility ON public.tasks(visibility);
CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON public.tasks(category_id);
CREATE INDEX IF NOT EXISTS idx_tasks_snoozed_until ON public.tasks(snoozed_until);
CREATE INDEX IF NOT EXISTS idx_tasks_workflow_step ON public.tasks(workflow_step);
CREATE INDEX IF NOT EXISTS idx_task_categories_tenant_id ON public.task_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_task_workflow_history_task_id ON public.task_workflow_history(task_id);

-- 6. RLS dla task_categories
ALTER TABLE public.task_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Task categories tenant access" ON public.task_categories
FOR ALL USING (
  auth.uid() IS NOT NULL AND tenant_id = get_current_tenant_id()
)
WITH CHECK (
  auth.uid() IS NOT NULL AND tenant_id = get_current_tenant_id()
);

-- 7. RLS dla task_workflow_history
ALTER TABLE public.task_workflow_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Task workflow history tenant access" ON public.task_workflow_history
FOR ALL USING (
  auth.uid() IS NOT NULL AND tenant_id = get_current_tenant_id()
)
WITH CHECK (
  auth.uid() IS NOT NULL AND tenant_id = get_current_tenant_id()
);

-- 8. Aktualizacja RLS dla tasks - rozszerzona logika widoczności
-- Najpierw usuń stare polityki
DROP POLICY IF EXISTS "Tasks tenant access" ON public.tasks;
DROP POLICY IF EXISTS "Users can view own tenant tasks" ON public.tasks;

-- Polityka SELECT - widoczność zadań
CREATE POLICY "Tasks visibility select" ON public.tasks
FOR SELECT USING (
  auth.uid() IS NOT NULL 
  AND tenant_id = get_current_tenant_id()
  AND (
    -- Właściciel zawsze widzi swoje zadania
    owner_id = get_current_director_id()
    -- Przypisany użytkownik widzi zadanie
    OR assigned_to = get_current_director_id()
    -- Zadania zespołowe/publiczne widoczne dla wszystkich w tenant
    OR visibility IN ('team', 'public')
    -- Backward compatibility: zadania bez owner_id widoczne dla wszystkich w tenant
    OR owner_id IS NULL
  )
);

-- Polityka INSERT
CREATE POLICY "Tasks insert own" ON public.tasks
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL 
  AND tenant_id = get_current_tenant_id()
);

-- Polityka UPDATE - właściciel lub przypisany może edytować
CREATE POLICY "Tasks update own or assigned" ON public.tasks
FOR UPDATE USING (
  auth.uid() IS NOT NULL 
  AND tenant_id = get_current_tenant_id()
  AND (
    owner_id = get_current_director_id()
    OR assigned_to = get_current_director_id()
    OR owner_id IS NULL
  )
);

-- Polityka DELETE - tylko właściciel może usunąć
CREATE POLICY "Tasks delete own" ON public.tasks
FOR DELETE USING (
  auth.uid() IS NOT NULL 
  AND tenant_id = get_current_tenant_id()
  AND (
    owner_id = get_current_director_id()
    OR owner_id IS NULL
  )
);

-- 9. Trigger do automatycznej aktualizacji updated_at dla task_categories
CREATE OR REPLACE FUNCTION public.update_task_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_task_categories_updated_at ON public.task_categories;
CREATE TRIGGER update_task_categories_updated_at
BEFORE UPDATE ON public.task_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_task_categories_updated_at();