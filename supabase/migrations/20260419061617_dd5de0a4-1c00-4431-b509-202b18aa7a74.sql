-- Sprint 15 — Gmail outbox + scopes snapshot
-- ROLLBACK:
--   DROP TABLE IF EXISTS public.gmail_outbox;
--   DROP TABLE IF EXISTS archive.gcal_tokens_scopes_snapshot_20260419;

CREATE SCHEMA IF NOT EXISTS archive;

CREATE TABLE IF NOT EXISTS archive.gcal_tokens_scopes_snapshot_20260419 AS
  SELECT id, tenant_id, director_id, scopes, connected_email, updated_at
  FROM public.gcal_tokens;

CREATE TABLE IF NOT EXISTS public.gmail_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  director_id uuid NOT NULL REFERENCES public.directors(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  gmail_message_id text,
  gmail_draft_id text,
  gmail_thread_id text,
  "to" text NOT NULL,
  cc text,
  bcc text,
  subject text NOT NULL,
  body_plain text NOT NULL,
  body_html text,
  status text NOT NULL DEFAULT 'sending' CHECK (status IN ('draft','sending','sent','failed')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_gmail_outbox_director_created
  ON public.gmail_outbox (director_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gmail_outbox_contact_created
  ON public.gmail_outbox (contact_id, created_at DESC) WHERE contact_id IS NOT NULL;

ALTER TABLE public.gmail_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gmail_outbox_select_own"
  ON public.gmail_outbox FOR SELECT
  USING (
    director_id = public.get_current_director_id()
    OR public.is_tenant_admin(auth.uid(), tenant_id)
  );

CREATE POLICY "gmail_outbox_insert_own"
  ON public.gmail_outbox FOR INSERT
  WITH CHECK (
    director_id = public.get_current_director_id()
    AND tenant_id = public.get_current_tenant_id()
  );

CREATE POLICY "gmail_outbox_update_own"
  ON public.gmail_outbox FOR UPDATE
  USING (director_id = public.get_current_director_id())
  WITH CHECK (director_id = public.get_current_director_id());

CREATE POLICY "gmail_outbox_delete_own"
  ON public.gmail_outbox FOR DELETE
  USING (director_id = public.get_current_director_id());

COMMENT ON TABLE public.gmail_outbox IS 'Sprint 15 — historia wysłanych maili i szkiców Gmail';