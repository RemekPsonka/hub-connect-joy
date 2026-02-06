-- Create gcal_tokens table for storing Google Calendar OAuth tokens
CREATE TABLE public.gcal_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  director_id uuid NOT NULL REFERENCES public.directors(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  selected_calendars jsonb DEFAULT '[]'::jsonb,
  connected_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, director_id)
);

-- Index for fast lookup by director
CREATE INDEX idx_gcal_tokens_director ON public.gcal_tokens(director_id);

-- Enable RLS
ALTER TABLE public.gcal_tokens ENABLE ROW LEVEL SECURITY;

-- RLS: Directors can only access their own row
CREATE POLICY "gcal_tokens_own_only" ON public.gcal_tokens
  FOR ALL USING (
    tenant_id = public.get_current_tenant_id()
    AND director_id = public.get_current_director_id()
  );

-- Trigger for updated_at
CREATE TRIGGER update_gcal_tokens_updated_at
  BEFORE UPDATE ON public.gcal_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();