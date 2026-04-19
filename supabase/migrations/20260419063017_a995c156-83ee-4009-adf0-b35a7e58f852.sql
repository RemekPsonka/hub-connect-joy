CREATE SCHEMA IF NOT EXISTS archive;

CREATE TABLE IF NOT EXISTS archive.connections_backup_20260419 AS
SELECT * FROM public.connections;

ALTER TABLE public.connections
  ADD COLUMN IF NOT EXISTS relationship_type text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_connections_a_strength ON public.connections (contact_a_id, strength DESC);
CREATE INDEX IF NOT EXISTS idx_connections_b_strength ON public.connections (contact_b_id, strength DESC);

CREATE OR REPLACE FUNCTION public.rpc_contact_neighbors(
  p_contact_id uuid,
  p_min_strength int DEFAULT 0
)
RETURNS TABLE (
  contact_id uuid,
  full_name text,
  email text,
  company text,
  "position" text,
  connection_id uuid,
  strength int,
  connection_type text,
  relationship_type text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH t AS (SELECT public.get_current_tenant_id() AS tid)
  SELECT c.id, c.full_name, c.email, c.company, c."position",
         cn.id, COALESCE(cn.strength,0), cn.connection_type, cn.relationship_type
  FROM public.connections cn
  JOIN public.contacts c ON c.id = cn.contact_b_id
  CROSS JOIN t
  WHERE cn.contact_a_id = p_contact_id
    AND cn.tenant_id = t.tid
    AND COALESCE(cn.strength,0) >= p_min_strength
  UNION ALL
  SELECT c.id, c.full_name, c.email, c.company, c."position",
         cn.id, COALESCE(cn.strength,0), cn.connection_type, cn.relationship_type
  FROM public.connections cn
  JOIN public.contacts c ON c.id = cn.contact_a_id
  CROSS JOIN t
  WHERE cn.contact_b_id = p_contact_id
    AND cn.tenant_id = t.tid
    AND COALESCE(cn.strength,0) >= p_min_strength;
$$;

CREATE OR REPLACE FUNCTION public.rpc_network_paths(
  p_from uuid,
  p_to uuid,
  p_max_hops int DEFAULT 3
)
RETURNS TABLE (
  path_ids uuid[],
  path_names text[],
  hops int,
  total_strength int
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_tid uuid := public.get_current_tenant_id();
BEGIN
  RETURN QUERY
  WITH RECURSIVE walk AS (
    SELECT ARRAY[p_from]::uuid[] AS path_ids, p_from AS last_id, 0 AS hops, 0 AS total_strength
    UNION ALL
    SELECT
      w.path_ids || (CASE WHEN cn.contact_a_id = w.last_id THEN cn.contact_b_id ELSE cn.contact_a_id END),
      (CASE WHEN cn.contact_a_id = w.last_id THEN cn.contact_b_id ELSE cn.contact_a_id END),
      w.hops + 1,
      w.total_strength + COALESCE(cn.strength,0)
    FROM walk w
    JOIN public.connections cn
      ON (cn.contact_a_id = w.last_id OR cn.contact_b_id = w.last_id)
     AND cn.tenant_id = v_tid
    WHERE w.hops < p_max_hops
      AND w.last_id <> p_to
      AND NOT (
        (CASE WHEN cn.contact_a_id = w.last_id THEN cn.contact_b_id ELSE cn.contact_a_id END)
        = ANY (w.path_ids)
      )
  )
  SELECT
    w.path_ids,
    ARRAY(
      SELECT c.full_name
      FROM unnest(w.path_ids) WITH ORDINALITY AS u(id, ord)
      LEFT JOIN public.contacts c ON c.id = u.id
      ORDER BY u.ord
    ),
    w.hops,
    w.total_strength
  FROM walk w
  WHERE w.last_id = p_to AND w.hops > 0
  ORDER BY w.total_strength DESC, w.hops ASC
  LIMIT 10;
END;
$$;

-- ROLLBACK:
-- DROP FUNCTION IF EXISTS public.rpc_network_paths(uuid,uuid,int);
-- DROP FUNCTION IF EXISTS public.rpc_contact_neighbors(uuid,int);
-- DROP INDEX IF EXISTS public.idx_connections_a_strength;
-- DROP INDEX IF EXISTS public.idx_connections_b_strength;
-- ALTER TABLE public.connections DROP COLUMN IF EXISTS relationship_type, DROP COLUMN IF EXISTS metadata, DROP COLUMN IF EXISTS created_at;