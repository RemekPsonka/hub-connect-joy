-- Sprint 16: Gmail full sync infrastructure

-- A. Snapshot
CREATE SCHEMA IF NOT EXISTS archive;
CREATE TABLE IF NOT EXISTS archive.tables_snapshot_20260419_s16 AS
SELECT table_schema, table_name, now() AS snapshot_at
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'gmail_%';

-- B. Extend gcal_tokens with Gmail history pointers
ALTER TABLE public.gcal_tokens
  ADD COLUMN IF NOT EXISTS gmail_history_id text,
  ADD COLUMN IF NOT EXISTS gmail_initial_synced_at timestamptz;

-- C. gmail_labels
CREATE TABLE IF NOT EXISTS public.gmail_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  director_id uuid NOT NULL REFERENCES public.directors(id) ON DELETE CASCADE,
  gmail_label_id text NOT NULL,
  name text NOT NULL,
  type text,
  color jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (director_id, gmail_label_id)
);
CREATE INDEX IF NOT EXISTS idx_gmail_labels_director ON public.gmail_labels(director_id);
ALTER TABLE public.gmail_labels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gmail_labels_own_select" ON public.gmail_labels;
CREATE POLICY "gmail_labels_own_select" ON public.gmail_labels
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND tenant_id = get_current_tenant_id()
    AND director_id = get_current_director_id()
  );
DROP POLICY IF EXISTS "gmail_labels_own_modify" ON public.gmail_labels;
CREATE POLICY "gmail_labels_own_modify" ON public.gmail_labels
  FOR ALL USING (
    auth.uid() IS NOT NULL
    AND tenant_id = get_current_tenant_id()
    AND director_id = get_current_director_id()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = get_current_tenant_id()
    AND director_id = get_current_director_id()
  );

-- D. gmail_threads
CREATE TABLE IF NOT EXISTS public.gmail_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  director_id uuid NOT NULL REFERENCES public.directors(id) ON DELETE CASCADE,
  gmail_thread_id text NOT NULL,
  history_id text,
  subject text,
  snippet text,
  last_message_at timestamptz,
  message_count int NOT NULL DEFAULT 0,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  label_ids text[] DEFAULT '{}',
  is_unread boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (director_id, gmail_thread_id)
);
CREATE INDEX IF NOT EXISTS idx_gmail_threads_director_last ON public.gmail_threads(director_id, last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_gmail_threads_contact_last ON public.gmail_threads(contact_id, last_message_at DESC NULLS LAST);
ALTER TABLE public.gmail_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gmail_threads_own_select" ON public.gmail_threads;
CREATE POLICY "gmail_threads_own_select" ON public.gmail_threads
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND tenant_id = get_current_tenant_id()
    AND director_id = get_current_director_id()
  );
DROP POLICY IF EXISTS "gmail_threads_own_modify" ON public.gmail_threads;
CREATE POLICY "gmail_threads_own_modify" ON public.gmail_threads
  FOR ALL USING (
    auth.uid() IS NOT NULL
    AND tenant_id = get_current_tenant_id()
    AND director_id = get_current_director_id()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = get_current_tenant_id()
    AND director_id = get_current_director_id()
  );

-- E. gmail_messages
CREATE TABLE IF NOT EXISTS public.gmail_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  director_id uuid NOT NULL REFERENCES public.directors(id) ON DELETE CASCADE,
  thread_id uuid NOT NULL REFERENCES public.gmail_threads(id) ON DELETE CASCADE,
  gmail_message_id text NOT NULL,
  "from" text,
  "to" text,
  cc text,
  bcc text,
  subject text,
  body_plain text,
  body_html text,
  date timestamptz,
  labels text[] DEFAULT '{}',
  raw_headers jsonb,
  fts tsvector,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (director_id, gmail_message_id)
);
CREATE INDEX IF NOT EXISTS idx_gmail_messages_thread_date ON public.gmail_messages(thread_id, date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_gmail_messages_fts ON public.gmail_messages USING GIN(fts);
CREATE INDEX IF NOT EXISTS idx_gmail_messages_director_date ON public.gmail_messages(director_id, date DESC NULLS LAST);

-- FTS trigger
CREATE OR REPLACE FUNCTION public.gmail_messages_fts_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.fts :=
    setweight(to_tsvector('simple', coalesce(NEW.subject, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW."from", '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW."to", '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(left(NEW.body_plain, 100000), '')), 'C');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gmail_messages_fts ON public.gmail_messages;
CREATE TRIGGER trg_gmail_messages_fts
  BEFORE INSERT OR UPDATE OF subject, "from", "to", body_plain
  ON public.gmail_messages
  FOR EACH ROW EXECUTE FUNCTION public.gmail_messages_fts_update();

ALTER TABLE public.gmail_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gmail_messages_own_select" ON public.gmail_messages;
CREATE POLICY "gmail_messages_own_select" ON public.gmail_messages
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND tenant_id = get_current_tenant_id()
    AND director_id = get_current_director_id()
  );
DROP POLICY IF EXISTS "gmail_messages_own_modify" ON public.gmail_messages;
CREATE POLICY "gmail_messages_own_modify" ON public.gmail_messages
  FOR ALL USING (
    auth.uid() IS NOT NULL
    AND tenant_id = get_current_tenant_id()
    AND director_id = get_current_director_id()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = get_current_tenant_id()
    AND director_id = get_current_director_id()
  );

-- F. Cron jobs (idempotent via schedule_edge_function helper from earlier sprints)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'schedule_edge_function') THEN
    PERFORM public.schedule_edge_function('gmail_incremental_sync_5min', '*/5 * * * *', '/functions/v1/gmail-incremental-sync', '{}'::jsonb);
    PERFORM public.schedule_edge_function('gmail_labels_sync_daily', '0 3 * * *', '/functions/v1/gmail-labels-sync', '{}'::jsonb);
  END IF;
END $$;

-- ROLLBACK:
-- SELECT cron.unschedule('gmail_incremental_sync_5min');
-- SELECT cron.unschedule('gmail_labels_sync_daily');
-- DROP TABLE IF EXISTS public.gmail_messages CASCADE;
-- DROP TABLE IF EXISTS public.gmail_threads CASCADE;
-- DROP TABLE IF EXISTS public.gmail_labels CASCADE;
-- DROP FUNCTION IF EXISTS public.gmail_messages_fts_update();
-- ALTER TABLE public.gcal_tokens DROP COLUMN IF EXISTS gmail_history_id, DROP COLUMN IF EXISTS gmail_initial_synced_at;