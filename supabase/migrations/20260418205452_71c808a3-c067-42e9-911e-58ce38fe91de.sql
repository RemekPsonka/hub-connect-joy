-- Sprint 10 — Observability: ai_usage_log
-- ROLLBACK: DROP FUNCTION IF EXISTS public.rpc_ai_cost_summary(int); DROP TABLE IF EXISTS public.ai_usage_log CASCADE;

CREATE SCHEMA IF NOT EXISTS archive;

-- Partitioned table by created_at
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  function_name text NOT NULL,
  persona text,
  provider text NOT NULL DEFAULT 'lovable',
  model text,
  tokens_in integer DEFAULT 0,
  tokens_out integer DEFAULT 0,
  cost_cents numeric(12,4) DEFAULT 0,
  latency_ms integer,
  request_id text,
  actor_id uuid,
  tenant_id uuid,
  error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Partitions
CREATE TABLE IF NOT EXISTS public.ai_usage_log_2026_04 PARTITION OF public.ai_usage_log FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE IF NOT EXISTS public.ai_usage_log_2026_05 PARTITION OF public.ai_usage_log FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE IF NOT EXISTS public.ai_usage_log_2026_06 PARTITION OF public.ai_usage_log FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE IF NOT EXISTS public.ai_usage_log_2026_07 PARTITION OF public.ai_usage_log FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE IF NOT EXISTS public.ai_usage_log_2026_08 PARTITION OF public.ai_usage_log FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE IF NOT EXISTS public.ai_usage_log_2026_09 PARTITION OF public.ai_usage_log FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE IF NOT EXISTS public.ai_usage_log_2026_10 PARTITION OF public.ai_usage_log FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE IF NOT EXISTS public.ai_usage_log_2026_11 PARTITION OF public.ai_usage_log FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE IF NOT EXISTS public.ai_usage_log_2026_12 PARTITION OF public.ai_usage_log FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');
CREATE TABLE IF NOT EXISTS public.ai_usage_log_2027_01 PARTITION OF public.ai_usage_log FOR VALUES FROM ('2027-01-01') TO ('2027-02-01');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_function_created ON public.ai_usage_log (function_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_created ON public.ai_usage_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_actor_created ON public.ai_usage_log (actor_id, created_at DESC);

-- RLS
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_usage_log_select_superadmin_or_own" ON public.ai_usage_log;
CREATE POLICY "ai_usage_log_select_superadmin_or_own"
ON public.ai_usage_log
FOR SELECT
TO authenticated
USING (
  public.is_superadmin()
  OR actor_id = auth.uid()
);

DROP POLICY IF EXISTS "ai_usage_log_insert_any" ON public.ai_usage_log;
CREATE POLICY "ai_usage_log_insert_any"
ON public.ai_usage_log
FOR INSERT
TO authenticated, anon, service_role
WITH CHECK (true);

-- RPC: cost summary
CREATE OR REPLACE FUNCTION public.rpc_ai_cost_summary(p_days_back integer DEFAULT 30)
RETURNS TABLE (
  day date,
  function_name text,
  provider text,
  total_cost_cents numeric,
  total_tokens_in bigint,
  total_tokens_out bigint,
  call_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    (created_at AT TIME ZONE 'UTC')::date AS day,
    function_name,
    provider,
    COALESCE(SUM(cost_cents), 0)::numeric AS total_cost_cents,
    COALESCE(SUM(tokens_in), 0)::bigint AS total_tokens_in,
    COALESCE(SUM(tokens_out), 0)::bigint AS total_tokens_out,
    COUNT(*)::bigint AS call_count
  FROM public.ai_usage_log
  WHERE created_at >= now() - (p_days_back || ' days')::interval
  GROUP BY 1, 2, 3
  ORDER BY 1 DESC, total_cost_cents DESC;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_ai_cost_summary(integer) TO authenticated;