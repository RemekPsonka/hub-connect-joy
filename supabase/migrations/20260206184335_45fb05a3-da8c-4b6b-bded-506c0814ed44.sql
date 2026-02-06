
-- ================================================
-- FAZA 1: Projects Module Database Schema
-- 9 new tables + tasks extension
-- ================================================

-- 1. project_templates (before projects, referenced by FK)
CREATE TABLE public.project_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  default_tasks jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.project_templates
  FOR ALL USING (tenant_id = public.get_current_tenant_id());

-- 2. projects
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'new',
  owner_id uuid NOT NULL REFERENCES public.directors(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.project_templates(id) ON DELETE SET NULL,
  color text DEFAULT '#7C3AED',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_projects_tenant ON public.projects(tenant_id);
CREATE INDEX idx_projects_owner ON public.projects(owner_id);
CREATE INDEX idx_projects_status ON public.projects(status);

CREATE POLICY "Tenant isolation" ON public.projects
  FOR ALL USING (tenant_id = public.get_current_tenant_id());

-- Trigger for updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 3. project_members
CREATE TABLE public.project_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  director_id uuid REFERENCES public.directors(id) ON DELETE CASCADE,
  assistant_id uuid REFERENCES public.assistants(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT member_type_check CHECK (
    (director_id IS NOT NULL AND assistant_id IS NULL) OR
    (director_id IS NULL AND assistant_id IS NOT NULL)
  )
);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_project_members_project ON public.project_members(project_id);
CREATE INDEX idx_project_members_director ON public.project_members(director_id) WHERE director_id IS NOT NULL;

CREATE POLICY "Tenant isolation" ON public.project_members
  FOR ALL USING (tenant_id = public.get_current_tenant_id());

-- 4. project_contacts
CREATE TABLE public.project_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  role_in_project text,
  added_at timestamptz NOT NULL DEFAULT now(),
  added_by uuid REFERENCES public.directors(id) ON DELETE SET NULL,
  UNIQUE(project_id, contact_id)
);

ALTER TABLE public.project_contacts ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_project_contacts_project ON public.project_contacts(project_id);
CREATE INDEX idx_project_contacts_contact ON public.project_contacts(contact_id);

CREATE POLICY "Tenant isolation" ON public.project_contacts
  FOR ALL USING (tenant_id = public.get_current_tenant_id());

-- 5. project_notes
CREATE TABLE public.project_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  content text NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  created_by uuid REFERENCES public.directors(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_project_notes_project ON public.project_notes(project_id);

CREATE POLICY "Tenant isolation" ON public.project_notes
  FOR ALL USING (tenant_id = public.get_current_tenant_id());

-- 6. project_files
CREATE TABLE public.project_files (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size bigint,
  uploaded_by uuid REFERENCES public.directors(id) ON DELETE SET NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_project_files_project ON public.project_files(project_id);

CREATE POLICY "Tenant isolation" ON public.project_files
  FOR ALL USING (tenant_id = public.get_current_tenant_id());

-- 7. project_comments (on tasks)
CREATE TABLE public.project_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  director_id uuid REFERENCES public.directors(id) ON DELETE SET NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_comments ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_project_comments_task ON public.project_comments(task_id);

CREATE POLICY "Tenant isolation" ON public.project_comments
  FOR ALL USING (tenant_id = public.get_current_tenant_id());

-- 8. nela_sessions
CREATE TABLE public.nela_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  director_id uuid NOT NULL REFERENCES public.directors(id) ON DELETE CASCADE,
  type text NOT NULL,
  content jsonb DEFAULT '{}'::jsonb,
  tasks_created integer DEFAULT 0,
  notes_created integer DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  CONSTRAINT nela_session_type_check CHECK (type IN ('morning', 'evening', 'debrief', 'ad_hoc'))
);

ALTER TABLE public.nela_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_nela_sessions_director ON public.nela_sessions(director_id);

CREATE POLICY "Own sessions only" ON public.nela_sessions
  FOR ALL USING (
    tenant_id = public.get_current_tenant_id()
    AND director_id = public.get_current_director_id()
  );

-- 9. nela_reminders
CREATE TABLE public.nela_reminders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  director_id uuid NOT NULL REFERENCES public.directors(id) ON DELETE CASCADE,
  type text NOT NULL,
  reference_id uuid,
  reference_type text,
  message text NOT NULL,
  scheduled_at timestamptz,
  sent_at timestamptz,
  channel text NOT NULL DEFAULT 'app'
);

ALTER TABLE public.nela_reminders ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_nela_reminders_director ON public.nela_reminders(director_id);
CREATE INDEX idx_nela_reminders_scheduled ON public.nela_reminders(scheduled_at) WHERE sent_at IS NULL;

CREATE POLICY "Own reminders only" ON public.nela_reminders
  FOR ALL USING (
    tenant_id = public.get_current_tenant_id()
    AND director_id = public.get_current_director_id()
  );

-- ================================================
-- EXTEND TASKS TABLE (Prompt 1.2)
-- ================================================

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS parent_task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS estimated_hours numeric(5,2);
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS actual_hours numeric(5,2);

CREATE INDEX IF NOT EXISTS idx_tasks_project ON public.tasks(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON public.tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;

-- Storage bucket for project files
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload project files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-files'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can read project files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-files'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can delete own project files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-files'
  AND auth.uid() IS NOT NULL
);
