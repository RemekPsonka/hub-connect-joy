
CREATE OR REPLACE FUNCTION public.get_policies_list(
  p_search text DEFAULT NULL,
  p_insurer text DEFAULT NULL,
  p_client_id uuid DEFAULT NULL,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  policy_id uuid,
  master_policy_number text,
  client_company_id uuid,
  client_name text,
  insurer_name text,
  product_name text,
  entries_count bigint,
  total_premium numeric,
  total_commission numeric,
  earliest_issue_date date,
  latest_issue_date date,
  latest_status text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    ip.id,
    ip.master_policy_number,
    c.id,
    c.name,
    ip.insurer_name,
    ip.policy_name,
    count(pe.id),
    coalesce(sum(pe.premium_assigned), 0),
    coalesce(sum(pe.commission_gross), 0),
    min(pe.issue_date),
    max(pe.issue_date),
    (SELECT pe2.sale_type FROM policy_entries pe2
       WHERE pe2.insurance_policy_id = ip.id
       ORDER BY pe2.issue_date DESC NULLS LAST LIMIT 1)
  FROM insurance_policies ip
  LEFT JOIN companies c ON c.id = ip.company_id
  LEFT JOIN policy_entries pe ON pe.insurance_policy_id = ip.id
  WHERE ip.master_policy_number IS NOT NULL
    AND ip.tenant_id IN (SELECT d.tenant_id FROM directors d WHERE d.id = get_current_director_id())
    AND (p_search IS NULL OR ip.master_policy_number ILIKE '%'||p_search||'%' OR c.name ILIKE '%'||p_search||'%')
    AND (p_insurer IS NULL OR ip.insurer_name = p_insurer)
    AND (p_client_id IS NULL OR c.id = p_client_id)
    AND (p_date_from IS NULL OR pe.issue_date >= p_date_from)
    AND (p_date_to IS NULL OR pe.issue_date <= p_date_to)
  GROUP BY ip.id, c.id
  ORDER BY max(pe.issue_date) DESC NULLS LAST
  LIMIT p_limit OFFSET p_offset;
$$;

CREATE OR REPLACE FUNCTION public.get_company_holding_tree(p_root_company_id uuid)
RETURNS TABLE (
  company_id uuid,
  parent_company_id uuid,
  depth int,
  name text,
  nip text,
  total_policies bigint,
  total_premium_ytd numeric,
  total_commission_ytd numeric
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH RECURSIVE tree AS (
    SELECT c.id, c.parent_company_id, 0 AS depth, c.name, c.nip
    FROM companies c WHERE c.id = p_root_company_id
    UNION ALL
    SELECT c.id, c.parent_company_id, t.depth + 1, c.name, c.nip
    FROM companies c
    JOIN tree t ON c.parent_company_id = t.id
    WHERE t.depth < 10
  )
  SELECT
    t.id,
    t.parent_company_id,
    t.depth,
    t.name,
    t.nip,
    (SELECT count(pe.id) FROM policy_entries pe
       JOIN insurance_policies ip ON ip.id = pe.insurance_policy_id
       WHERE ip.company_id = t.id),
    (SELECT coalesce(sum(pe.premium_assigned), 0) FROM policy_entries pe
       JOIN insurance_policies ip ON ip.id = pe.insurance_policy_id
       WHERE ip.company_id = t.id AND pe.issue_date >= date_trunc('year', current_date)),
    (SELECT coalesce(sum(pe.commission_gross), 0) FROM policy_entries pe
       JOIN insurance_policies ip ON ip.id = pe.insurance_policy_id
       WHERE ip.company_id = t.id AND pe.issue_date >= date_trunc('year', current_date))
  FROM tree t
  ORDER BY t.depth, t.name;
$$;

CREATE OR REPLACE FUNCTION public.get_unmatched_import_clients()
RETURNS TABLE (
  external_code text,
  external_name text,
  rows_count bigint,
  latest_batch_id uuid,
  latest_batch_created_at timestamptz,
  earliest_seen_at timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH grp AS (
    SELECT
      pir.external_client_nip AS external_code,
      count(*) AS rows_count,
      max(pir.created_at) AS latest_created,
      min(pir.created_at) AS earliest_created
    FROM policy_import_rows pir
    WHERE pir.match_status = 'unmatched_client'
      AND pir.tenant_id IN (SELECT d.tenant_id FROM directors d WHERE d.id = get_current_director_id())
    GROUP BY pir.external_client_nip
  )
  SELECT
    g.external_code,
    (SELECT pir2.external_client_name FROM policy_import_rows pir2
       WHERE pir2.external_client_nip = g.external_code
       ORDER BY pir2.created_at DESC LIMIT 1) AS external_name,
    g.rows_count,
    (SELECT pir3.batch_id FROM policy_import_rows pir3
       WHERE pir3.external_client_nip = g.external_code
       ORDER BY pir3.created_at DESC LIMIT 1) AS latest_batch_id,
    g.latest_created,
    g.earliest_created
  FROM grp g
  ORDER BY g.rows_count DESC;
$$;

CREATE OR REPLACE FUNCTION public.match_import_client(
  p_external_code text,
  p_company_id uuid,
  p_external_name_snapshot text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant uuid;
  v_director uuid;
  v_user uuid := auth.uid();
  v_mapped_rows int;
BEGIN
  v_director := get_current_director_id();
  SELECT tenant_id INTO v_tenant FROM directors WHERE id = v_director;
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'no_tenant'; END IF;

  IF NOT EXISTS (SELECT 1 FROM companies WHERE id = p_company_id AND tenant_id = v_tenant) THEN
    RAISE EXCEPTION 'company_not_in_tenant';
  END IF;

  INSERT INTO import_client_mappings (
    tenant_id, external_source, external_code, external_name_snapshot,
    company_id, matched_by, matched_by_user_id
  ) VALUES (
    v_tenant, 'excel', p_external_code, p_external_name_snapshot,
    p_company_id, 'manual', v_user
  )
  ON CONFLICT (tenant_id, external_source, external_code) DO UPDATE
    SET company_id = EXCLUDED.company_id,
        matched_by = 'manual',
        matched_by_user_id = v_user;

  UPDATE policy_import_rows
    SET notes = coalesce(notes,'') || '|mapped_to_company:' || p_company_id::text || ':' || now()::text
  WHERE tenant_id = v_tenant
    AND match_status = 'unmatched_client'
    AND external_client_nip = p_external_code;
  GET DIAGNOSTICS v_mapped_rows = ROW_COUNT;

  RETURN jsonb_build_object(
    'mapped_rows', v_mapped_rows,
    'company_id', p_company_id,
    'requires_reprocess', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_policies_list(text,text,uuid,date,date,int,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_holding_tree(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unmatched_import_clients() TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_import_client(text,uuid,text) TO authenticated;
