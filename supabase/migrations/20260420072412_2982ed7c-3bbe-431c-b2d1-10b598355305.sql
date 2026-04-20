BEGIN;

-- 1. FEATURE FLAGS w directors
ALTER TABLE public.directors
  ADD COLUMN IF NOT EXISTS feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_directors_feature_flags
  ON public.directors USING gin (feature_flags);

UPDATE public.directors
SET feature_flags = feature_flags || '{"contact_detail_v2": true}'::jsonb
WHERE email = 'remek@ideecom.pl';

-- 2. CONTACT_NOTES
CREATE TABLE IF NOT EXISTS public.contact_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_by uuid REFERENCES public.directors(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_contact_notes_contact ON public.contact_notes (contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_notes_tenant ON public.contact_notes (tenant_id);

ALTER TABLE public.contact_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY contact_notes_select ON public.contact_notes FOR SELECT
  USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY contact_notes_insert ON public.contact_notes FOR INSERT
  WITH CHECK (tenant_id = public.get_current_tenant_id() AND created_by = public.get_current_director_id());
CREATE POLICY contact_notes_update ON public.contact_notes FOR UPDATE
  USING (tenant_id = public.get_current_tenant_id() AND created_by = public.get_current_director_id());
CREATE POLICY contact_notes_delete ON public.contact_notes FOR DELETE
  USING (tenant_id = public.get_current_tenant_id() AND created_by = public.get_current_director_id());

-- 3. CONTACT_AI_CACHE
CREATE TABLE IF NOT EXISTS public.contact_ai_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  tldr text,
  summary_json jsonb,
  model text,
  cost_cents int DEFAULT 0,
  generated_at timestamptz NOT NULL DEFAULT now(),
  invalidated_at timestamptz,
  UNIQUE (contact_id)
);

CREATE INDEX IF NOT EXISTS idx_cac_fresh
  ON public.contact_ai_cache (contact_id)
  WHERE invalidated_at IS NULL;

ALTER TABLE public.contact_ai_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY cac_all ON public.contact_ai_cache FOR ALL
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());

-- 4. Funkcja invalidująca
CREATE OR REPLACE FUNCTION public.invalidate_contact_ai_cache(p_contact_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  UPDATE public.contact_ai_cache
  SET invalidated_at = now()
  WHERE contact_id = p_contact_id AND invalidated_at IS NULL;
$$;

-- 5. Trigger helper: bezpośrednie NEW.contact_id
CREATE OR REPLACE FUNCTION public.trg_inv_cache_direct()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.contact_id IS NOT NULL THEN
      PERFORM public.invalidate_contact_ai_cache(OLD.contact_id);
    END IF;
    RETURN OLD;
  END IF;
  IF NEW.contact_id IS NOT NULL THEN
    PERFORM public.invalidate_contact_ai_cache(NEW.contact_id);
  END IF;
  RETURN NEW;
END $$;

-- 6. Trigger dla ai_messages (scope w ai_conversations, nie w ai_messages)
CREATE OR REPLACE FUNCTION public.trg_inv_cache_from_ai()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_scope_type text;
  v_scope_id uuid;
BEGIN
  SELECT scope_type, scope_id INTO v_scope_type, v_scope_id
  FROM public.ai_conversations
  WHERE id = NEW.conversation_id;

  IF v_scope_type = 'contact' AND v_scope_id IS NOT NULL THEN
    PERFORM public.invalidate_contact_ai_cache(v_scope_id);
  END IF;
  RETURN NEW;
END $$;

-- 7. Triggery (tylko dla tabel które mają contact_id lub conversation_id)
DROP TRIGGER IF EXISTS trg_inv_cache_on_note ON public.contact_notes;
CREATE TRIGGER trg_inv_cache_on_note
  AFTER INSERT OR UPDATE OR DELETE ON public.contact_notes
  FOR EACH ROW EXECUTE FUNCTION public.trg_inv_cache_direct();

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ai_messages') THEN
    DROP TRIGGER IF EXISTS trg_inv_cache_on_ai ON public.ai_messages;
    CREATE TRIGGER trg_inv_cache_on_ai
      AFTER INSERT ON public.ai_messages
      FOR EACH ROW EXECUTE FUNCTION public.trg_inv_cache_from_ai();
  END IF;
END $$;

-- Triggery dla gmail_messages/gcal_events POMINIĘTE — brak kolumny contact_id.
-- TODO sprint follow-up: invalidacja przez join (gmail_threads.contact_id, gcal_events.attendees).

COMMIT;

-- ROLLBACK:
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_inv_cache_on_ai ON public.ai_messages;
-- DROP TRIGGER IF EXISTS trg_inv_cache_on_note ON public.contact_notes;
-- DROP FUNCTION IF EXISTS public.trg_inv_cache_from_ai();
-- DROP FUNCTION IF EXISTS public.trg_inv_cache_direct();
-- DROP FUNCTION IF EXISTS public.invalidate_contact_ai_cache(uuid);
-- DROP TABLE IF EXISTS public.contact_ai_cache;
-- DROP TABLE IF EXISTS public.contact_notes;
-- DROP INDEX IF EXISTS public.idx_directors_feature_flags;
-- ALTER TABLE public.directors DROP COLUMN IF EXISTS feature_flags;
-- COMMIT;