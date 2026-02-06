
-- Table to link Google Calendar events with CRM entities (tasks, contacts, projects)
CREATE TABLE public.gcal_event_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  director_id uuid NOT NULL REFERENCES public.directors(id),
  gcal_event_id text NOT NULL,
  gcal_calendar_id text NOT NULL,
  linked_type text NOT NULL CHECK (linked_type IN ('task', 'contact', 'project')),
  linked_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, gcal_event_id, linked_type, linked_id)
);

-- Enable RLS
ALTER TABLE public.gcal_event_links ENABLE ROW LEVEL SECURITY;

-- RLS: directors can manage only their own links within their tenant
CREATE POLICY "gcal_links_own" ON public.gcal_event_links
  FOR ALL USING (
    tenant_id = get_current_tenant_id()
    AND director_id = get_current_director_id()
  );

-- Index for efficient lookups by linked entity
CREATE INDEX idx_gcal_event_links_linked ON public.gcal_event_links(tenant_id, linked_type, linked_id);

-- Index for efficient lookups by gcal event
CREATE INDEX idx_gcal_event_links_event ON public.gcal_event_links(tenant_id, gcal_event_id);
