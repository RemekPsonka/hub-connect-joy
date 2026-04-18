-- Sprint 05: Sovra 2.0 tool calling
-- Snapshot + sovra_pending_actions + 5 RPC SECURITY INVOKER

CREATE SCHEMA IF NOT EXISTS archive;

-- 1. Schema snapshot (audit)
CREATE TABLE IF NOT EXISTS archive.schema_snapshot_20260418 AS
  SELECT table_name, column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public';

-- 2. sovra_pending_actions
CREATE TABLE public.sovra_pending_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES public.directors(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.ai_messages(id) ON DELETE SET NULL,
  tool text NOT NULL,
  args jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','cancelled','expired','failed')),
  human_summary text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  confirmed_at timestamptz
);

CREATE INDEX idx_spa_conv ON public.sovra_pending_actions (conversation_id, created_at DESC);
CREATE INDEX idx_spa_status_exp ON public.sovra_pending_actions (status, expires_at)
  WHERE status = 'pending';
CREATE INDEX idx_spa_tenant_actor ON public.sovra_pending_actions (tenant_id, actor_id);

ALTER TABLE public.sovra_pending_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY spa_select ON public.sovra_pending_actions
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_current_tenant_id() AND actor_id = public.get_current_director_id());

CREATE POLICY spa_insert ON public.sovra_pending_actions
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_current_tenant_id() AND actor_id = public.get_current_director_id());

CREATE POLICY spa_update ON public.sovra_pending_actions
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_current_tenant_id() AND actor_id = public.get_current_director_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id() AND actor_id = public.get_current_director_id());

-- 3. RPC search (SECURITY INVOKER → respektuje RLS)

CREATE OR REPLACE FUNCTION public.rpc_sovra_search_contacts(p_query text, p_filters jsonb DEFAULT '{}'::jsonb)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', c.id,
    'full_name', c.full_name,
    'email', c.email,
    'phone', c.phone,
    'company_id', c.company_id,
    'company', c.company,
    'position', c.position
  )
  FROM public.contacts c
  WHERE (
      p_query IS NULL OR p_query = ''
      OR c.fts @@ plainto_tsquery('simple', p_query)
      OR c.full_name ILIKE '%' || p_query || '%'
    )
    AND (p_filters->>'company_id' IS NULL OR c.company_id::text = p_filters->>'company_id')
  ORDER BY c.updated_at DESC NULLS LAST
  LIMIT 25;
$$;

CREATE OR REPLACE FUNCTION public.rpc_sovra_search_companies(p_query text, p_filters jsonb DEFAULT '{}'::jsonb)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'nip', c.nip,
    'industry', c.industry,
    'city', c.city
  )
  FROM public.companies c
  WHERE (
      p_query IS NULL OR p_query = ''
      OR c.name ILIKE '%' || p_query || '%'
      OR c.nip = p_query
    )
  ORDER BY c.updated_at DESC NULLS LAST
  LIMIT 25;
$$;

CREATE OR REPLACE FUNCTION public.rpc_sovra_search_deals(p_filters jsonb DEFAULT '{}'::jsonb)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', d.id,
    'team_id', d.team_id,
    'contact_id', d.contact_id,
    'category', d.category,
    'status', d.status,
    'priority', d.priority,
    'estimated_value', d.estimated_value,
    'next_action', d.next_action,
    'next_action_date', d.next_action_date
  )
  FROM public.deal_team_contacts d
  WHERE (p_filters->>'team_id' IS NULL OR d.team_id::text = p_filters->>'team_id')
    AND (p_filters->>'status' IS NULL OR d.status = p_filters->>'status')
    AND (p_filters->>'category' IS NULL OR d.category = p_filters->>'category')
    AND (p_filters->>'contact_id' IS NULL OR d.contact_id::text = p_filters->>'contact_id')
  ORDER BY d.next_action_date NULLS LAST
  LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION public.rpc_sovra_get_contact_details(p_contact_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'contact', to_jsonb(c.*),
    'company', to_jsonb(co.*),
    'deals', (
      SELECT COALESCE(jsonb_agg(to_jsonb(d.*)), '[]'::jsonb)
      FROM public.deal_team_contacts d
      WHERE d.contact_id = c.id
    )
  )
  FROM public.contacts c
  LEFT JOIN public.companies co ON co.id = c.company_id
  WHERE c.id = p_contact_id;
$$;

CREATE OR REPLACE FUNCTION public.rpc_sovra_analyze_pipeline(p_team_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total', COALESCE(SUM(cnt), 0),
    'by_category', COALESCE(jsonb_object_agg(category, cnt) FILTER (WHERE category IS NOT NULL), '{}'::jsonb),
    'by_status', COALESCE(jsonb_object_agg(status_key, status_cnt) FILTER (WHERE status_key IS NOT NULL), '{}'::jsonb)
  )
  FROM (
    SELECT
      category,
      NULL::text AS status_key,
      COUNT(*)::int AS cnt,
      NULL::int AS status_cnt
    FROM public.deal_team_contacts
    WHERE (p_team_id IS NULL OR team_id = p_team_id)
    GROUP BY category
    UNION ALL
    SELECT
      NULL::text AS category,
      status AS status_key,
      NULL::int AS cnt,
      COUNT(*)::int AS status_cnt
    FROM public.deal_team_contacts
    WHERE (p_team_id IS NULL OR team_id = p_team_id)
    GROUP BY status
  ) sub;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_sovra_search_contacts(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_sovra_search_companies(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_sovra_search_deals(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_sovra_get_contact_details(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_sovra_analyze_pipeline(uuid) TO authenticated;

-- ROLLBACK:
-- DROP FUNCTION IF EXISTS public.rpc_sovra_search_contacts(text, jsonb);
-- DROP FUNCTION IF EXISTS public.rpc_sovra_search_companies(text, jsonb);
-- DROP FUNCTION IF EXISTS public.rpc_sovra_search_deals(jsonb);
-- DROP FUNCTION IF EXISTS public.rpc_sovra_get_contact_details(uuid);
-- DROP FUNCTION IF EXISTS public.rpc_sovra_analyze_pipeline(uuid);
-- DROP TABLE IF EXISTS public.sovra_pending_actions;