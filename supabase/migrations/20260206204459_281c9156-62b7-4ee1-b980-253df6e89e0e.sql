
-- Sovra AI assistant tables

-- Sessions table (morning briefs, evening debriefs, chat sessions)
CREATE TABLE IF NOT EXISTS public.sovra_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  director_id uuid NOT NULL REFERENCES public.directors(id),
  type text NOT NULL CHECK (type IN ('morning', 'evening', 'debrief', 'chat')),
  title text,
  content jsonb DEFAULT '{}',
  tasks_created int4 DEFAULT 0,
  notes_created int4 DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  metadata jsonb DEFAULT '{}'
);

-- Reminders table
CREATE TABLE IF NOT EXISTS public.sovra_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  director_id uuid NOT NULL REFERENCES public.directors(id),
  type text NOT NULL CHECK (type IN ('contact', 'deadline', 'inactive_project', 'daily_summary', 'follow_up')),
  reference_id uuid,
  reference_type text CHECK (reference_type IN ('project', 'task', 'contact')),
  message text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  sent_at timestamptz,
  read_at timestamptz,
  channel text DEFAULT 'app' CHECK (channel IN ('app', 'email')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high'))
);

-- Enable RLS
ALTER TABLE public.sovra_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sovra_reminders ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "sovra_sessions_own" ON public.sovra_sessions
  FOR ALL USING (
    tenant_id = public.get_current_tenant_id()
    AND director_id = public.get_current_director_id()
  );

CREATE POLICY "sovra_reminders_own" ON public.sovra_reminders
  FOR ALL USING (
    tenant_id = public.get_current_tenant_id()
    AND director_id = public.get_current_director_id()
  );

-- Indexes
CREATE INDEX idx_sovra_sessions_director ON public.sovra_sessions(director_id, type);
CREATE INDEX idx_sovra_reminders_scheduled ON public.sovra_reminders(director_id, scheduled_at) WHERE sent_at IS NULL;
