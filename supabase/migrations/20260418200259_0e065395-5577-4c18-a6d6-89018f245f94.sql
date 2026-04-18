-- Sprint 04 — Sovra 2.0 fundament
-- Archiwizacja 7 martwych tabel person + nowe ai_conversations/ai_messages/ai_memory

CREATE SCHEMA IF NOT EXISTS archive;

-- ============================================================
-- 1. ARCHIWIZACJA 7 tabel (snapshot przed DROP)
-- ============================================================
CREATE TABLE IF NOT EXISTS archive.agent_conversations_backup_20260418 AS SELECT * FROM public.agent_conversations;
CREATE TABLE IF NOT EXISTS archive.remek_conversations_backup_20260418 AS SELECT * FROM public.remek_conversations;
CREATE TABLE IF NOT EXISTS archive.remek_knowledge_base_backup_20260418 AS SELECT * FROM public.remek_knowledge_base;
CREATE TABLE IF NOT EXISTS archive.master_agent_queries_backup_20260418 AS SELECT * FROM public.master_agent_queries;
CREATE TABLE IF NOT EXISTS archive.turbo_agent_sessions_backup_20260418 AS SELECT * FROM public.turbo_agent_sessions;
CREATE TABLE IF NOT EXISTS archive.turbo_agent_sub_queries_backup_20260418 AS SELECT * FROM public.turbo_agent_sub_queries;
CREATE TABLE IF NOT EXISTS archive.sovra_report_config_backup_20260418 AS SELECT * FROM public.sovra_report_config;

DO $$
DECLARE
  r record;
  n bigint;
BEGIN
  FOR r IN SELECT unnest(ARRAY[
    'agent_conversations_backup_20260418',
    'remek_conversations_backup_20260418',
    'remek_knowledge_base_backup_20260418',
    'master_agent_queries_backup_20260418',
    'turbo_agent_sessions_backup_20260418',
    'turbo_agent_sub_queries_backup_20260418',
    'sovra_report_config_backup_20260418'
  ]) AS tname
  LOOP
    EXECUTE format('SELECT count(*) FROM archive.%I', r.tname) INTO n;
    RAISE NOTICE 'archive.% rows: %', r.tname, n;
  END LOOP;
END $$;

-- ============================================================
-- 2. DROP 7 tabel CASCADE
-- ============================================================
DROP TABLE IF EXISTS public.turbo_agent_sub_queries CASCADE;
DROP TABLE IF EXISTS public.turbo_agent_sessions CASCADE;
DROP TABLE IF EXISTS public.master_agent_queries CASCADE;
DROP TABLE IF EXISTS public.agent_conversations CASCADE;
DROP TABLE IF EXISTS public.remek_conversations CASCADE;
DROP TABLE IF EXISTS public.remek_knowledge_base CASCADE;
DROP TABLE IF EXISTS public.sovra_report_config CASCADE;

-- ============================================================
-- 3. NOWE TABELE: ai_conversations / ai_messages / ai_memory
-- ============================================================

CREATE TABLE public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES public.directors(id) ON DELETE CASCADE,
  persona text NOT NULL DEFAULT 'sovra',
  scope_type text,                -- 'global' | 'contact' | 'project' | 'deal' | 'meeting'
  scope_id uuid,                  -- id obiektu w danym scope
  title text,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_ai_conversations_tenant ON public.ai_conversations(tenant_id);
CREATE INDEX idx_ai_conversations_actor ON public.ai_conversations(actor_id);
CREATE INDEX idx_ai_conversations_last_message ON public.ai_conversations(actor_id, last_message_at DESC);
CREATE INDEX idx_ai_conversations_scope ON public.ai_conversations(scope_type, scope_id) WHERE scope_id IS NOT NULL;

CREATE TABLE public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','tool','system')),
  content text NOT NULL DEFAULT '',
  tool_calls jsonb,
  tool_results jsonb,
  model text,
  provider text,
  tokens_in integer,
  tokens_out integer,
  cost_cents numeric(10,4),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_messages_conversation ON public.ai_messages(conversation_id, created_at);

CREATE TABLE public.ai_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  scope_type text NOT NULL,        -- 'global' | 'contact' | 'project' | 'deal'
  scope_id uuid,
  memory_type text NOT NULL,       -- 'fact' | 'preference' | 'summary' | 'note'
  content text NOT NULL,
  embedding vector(1536),
  created_by uuid REFERENCES public.directors(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_memory_tenant ON public.ai_memory(tenant_id);
CREATE INDEX idx_ai_memory_scope ON public.ai_memory(scope_type, scope_id) WHERE scope_id IS NOT NULL;
CREATE INDEX idx_ai_memory_embedding ON public.ai_memory USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- 4. RLS
-- ============================================================
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_memory ENABLE ROW LEVEL SECURITY;

-- ai_conversations: actor widzi tylko swoje, w obrębie swojego tenanta
CREATE POLICY "ai_conversations_select_own"
  ON public.ai_conversations FOR SELECT
  USING (
    tenant_id = public.get_current_tenant_id()
    AND actor_id = public.get_current_director_id()
  );

CREATE POLICY "ai_conversations_insert_own"
  ON public.ai_conversations FOR INSERT
  WITH CHECK (
    tenant_id = public.get_current_tenant_id()
    AND actor_id = public.get_current_director_id()
  );

CREATE POLICY "ai_conversations_update_own"
  ON public.ai_conversations FOR UPDATE
  USING (
    tenant_id = public.get_current_tenant_id()
    AND actor_id = public.get_current_director_id()
  );

CREATE POLICY "ai_conversations_delete_own"
  ON public.ai_conversations FOR DELETE
  USING (
    tenant_id = public.get_current_tenant_id()
    AND actor_id = public.get_current_director_id()
  );

-- ai_messages: dostęp przez konwersację
CREATE POLICY "ai_messages_select_via_conversation"
  ON public.ai_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_conversations c
      WHERE c.id = ai_messages.conversation_id
        AND c.tenant_id = public.get_current_tenant_id()
        AND c.actor_id = public.get_current_director_id()
    )
  );

CREATE POLICY "ai_messages_insert_via_conversation"
  ON public.ai_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_conversations c
      WHERE c.id = ai_messages.conversation_id
        AND c.tenant_id = public.get_current_tenant_id()
        AND c.actor_id = public.get_current_director_id()
    )
  );

-- ai_memory: read w obrębie tenanta, write przez właściciela (created_by)
CREATE POLICY "ai_memory_select_tenant"
  ON public.ai_memory FOR SELECT
  USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "ai_memory_insert_own"
  ON public.ai_memory FOR INSERT
  WITH CHECK (
    tenant_id = public.get_current_tenant_id()
    AND (created_by IS NULL OR created_by = public.get_current_director_id())
  );

CREATE POLICY "ai_memory_update_own"
  ON public.ai_memory FOR UPDATE
  USING (
    tenant_id = public.get_current_tenant_id()
    AND (created_by IS NULL OR created_by = public.get_current_director_id())
  );

CREATE POLICY "ai_memory_delete_own"
  ON public.ai_memory FOR DELETE
  USING (
    tenant_id = public.get_current_tenant_id()
    AND (created_by IS NULL OR created_by = public.get_current_director_id())
  );

-- Trigger updated_at dla ai_memory
CREATE TRIGGER trg_ai_memory_updated_at
  BEFORE UPDATE ON public.ai_memory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- ROLLBACK (do ręcznego wykonania w razie potrzeby):
-- DROP TABLE public.ai_memory CASCADE;
-- DROP TABLE public.ai_messages CASCADE;
-- DROP TABLE public.ai_conversations CASCADE;
-- CREATE TABLE public.agent_conversations AS SELECT * FROM archive.agent_conversations_backup_20260418;
-- (...) analogicznie dla pozostałych 6
-- ============================================================