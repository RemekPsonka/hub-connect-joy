-- Fix function search_path for immutable_unaccent
CREATE OR REPLACE FUNCTION public.immutable_unaccent(text) 
RETURNS text AS $$
  SELECT unaccent('unaccent', $1)
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path = public;

-- Fix function search_path for search_all_fts
CREATE OR REPLACE FUNCTION public.search_all_fts(
  p_query text,
  p_tenant_id uuid,
  p_types text[] DEFAULT ARRAY['contact', 'need', 'offer'],
  p_limit int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  type text,
  title text,
  subtitle text,
  description text,
  similarity double precision
) AS $$
DECLARE
  search_term text;
  tsquery_term tsquery;
BEGIN
  -- Normalize search term (lowercase, unaccent, trim)
  search_term := public.immutable_unaccent(lower(trim(p_query)));
  tsquery_term := plainto_tsquery('simple', search_term);
  
  RETURN QUERY
  -- Contacts
  SELECT 
    c.id,
    'contact'::text as type,
    c.full_name as title,
    c.company as subtitle,
    c.position as description,
    GREATEST(
      COALESCE(ts_rank(c.fts, tsquery_term), 0)::double precision,
      COALESCE(similarity(public.immutable_unaccent(lower(c.search_text)), search_term), 0)::double precision
    ) as similarity
  FROM public.contacts c
  WHERE c.tenant_id = p_tenant_id
    AND 'contact' = ANY(p_types)
    AND (
      c.fts @@ tsquery_term 
      OR public.immutable_unaccent(lower(c.search_text)) % search_term
      OR public.immutable_unaccent(lower(c.search_text)) ILIKE '%' || search_term || '%'
    )
  
  UNION ALL
  
  -- Needs
  SELECT 
    n.id,
    'need'::text,
    n.title,
    (SELECT full_name FROM public.contacts WHERE id = n.contact_id),
    n.description,
    GREATEST(
      COALESCE(ts_rank(n.fts, tsquery_term), 0)::double precision,
      COALESCE(similarity(public.immutable_unaccent(lower(n.search_text)), search_term), 0)::double precision
    )
  FROM public.needs n
  WHERE n.tenant_id = p_tenant_id
    AND 'need' = ANY(p_types)
    AND (
      n.fts @@ tsquery_term 
      OR public.immutable_unaccent(lower(n.search_text)) % search_term
      OR public.immutable_unaccent(lower(n.search_text)) ILIKE '%' || search_term || '%'
    )
  
  UNION ALL
  
  -- Offers
  SELECT 
    o.id,
    'offer'::text,
    o.title,
    (SELECT full_name FROM public.contacts WHERE id = o.contact_id),
    o.description,
    GREATEST(
      COALESCE(ts_rank(o.fts, tsquery_term), 0)::double precision,
      COALESCE(similarity(public.immutable_unaccent(lower(o.search_text)), search_term), 0)::double precision
    )
  FROM public.offers o
  WHERE o.tenant_id = p_tenant_id
    AND 'offer' = ANY(p_types)
    AND (
      o.fts @@ tsquery_term 
      OR public.immutable_unaccent(lower(o.search_text)) % search_term
      OR public.immutable_unaccent(lower(o.search_text)) ILIKE '%' || search_term || '%'
    )
  
  ORDER BY similarity DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;