-- Sprint 14: GCal write + sync + token encryption (app-side AES-GCM via Edge Function)
-- ROLLBACK:
--   SELECT cron.unschedule('gcal_sync_events_15min');
--   DROP TABLE IF EXISTS public.gcal_events;
--   ALTER TABLE public.gcal_tokens RENAME COLUMN deprecated_refresh_token_20260419 TO refresh_token;
--   ALTER TABLE public.gcal_tokens RENAME COLUMN deprecated_access_token_20260419 TO access_token;
--   ALTER TABLE public.gcal_tokens DROP COLUMN refresh_token_encrypted, DROP COLUMN refresh_token_iv, DROP COLUMN scopes;

-- 1. Archive snapshot
CREATE SCHEMA IF NOT EXISTS archive;
CREATE TABLE IF NOT EXISTS archive.gcal_tokens_backup_20260419
  AS SELECT * FROM public.gcal_tokens;

-- 2. Add encrypted columns + scopes
ALTER TABLE public.gcal_tokens
  ADD COLUMN IF NOT EXISTS refresh_token_encrypted text,
  ADD COLUMN IF NOT EXISTS refresh_token_iv text,
  ADD COLUMN IF NOT EXISTS scopes text[] DEFAULT ARRAY[]::text[];

-- 3. Rename plaintext columns to deprecated (NOT dropped — per project rules)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='gcal_tokens' AND column_name='refresh_token'
  ) THEN
    ALTER TABLE public.gcal_tokens ALTER COLUMN refresh_token DROP NOT NULL;
    ALTER TABLE public.gcal_tokens RENAME COLUMN refresh_token TO deprecated_refresh_token_20260419;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='gcal_tokens' AND column_name='access_token'
  ) THEN
    ALTER TABLE public.gcal_tokens ALTER COLUMN access_token DROP NOT NULL;
    ALTER TABLE public.gcal_tokens RENAME COLUMN access_token TO deprecated_access_token_20260419;
  END IF;
END $$;

-- 4. gcal_events cache table
CREATE TABLE IF NOT EXISTS public.gcal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  director_id uuid NOT NULL REFERENCES public.directors(id) ON DELETE CASCADE,
  gcal_event_id text NOT NULL,
  calendar_id text NOT NULL,
  calendar_name text,
  calendar_color text,
  summary text,
  description text,
  location text,
  start_at timestamptz,
  end_at timestamptz,
  all_day boolean DEFAULT false,
  attendees jsonb DEFAULT '[]'::jsonb,
  html_link text,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (director_id, gcal_event_id, calendar_id)
);

CREATE INDEX IF NOT EXISTS idx_gcal_events_director_start
  ON public.gcal_events(director_id, start_at);
CREATE INDEX IF NOT EXISTS idx_gcal_events_tenant
  ON public.gcal_events(tenant_id);

ALTER TABLE public.gcal_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gcal_events_own_only" ON public.gcal_events;
CREATE POLICY "gcal_events_own_only" ON public.gcal_events
  FOR ALL
  USING (
    tenant_id = public.get_current_tenant_id()
    AND director_id = public.get_current_director_id()
  )
  WITH CHECK (
    tenant_id = public.get_current_tenant_id()
    AND director_id = public.get_current_director_id()
  );

DROP TRIGGER IF EXISTS update_gcal_events_updated_at ON public.gcal_events;
CREATE TRIGGER update_gcal_events_updated_at
  BEFORE UPDATE ON public.gcal_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Schedule sync cron (every 15 minutes)
SELECT public.schedule_edge_function(
  'gcal_sync_events_15min',
  '*/15 * * * *',
  'gcal-sync-events',
  '{}'::jsonb
);