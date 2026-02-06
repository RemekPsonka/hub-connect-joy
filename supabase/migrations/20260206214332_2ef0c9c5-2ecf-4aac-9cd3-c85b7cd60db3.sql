-- Fix search_path for newly created function
CREATE OR REPLACE FUNCTION match_contacts_by_project(
  query_embedding vector(1536),
  match_tenant_id uuid,
  match_threshold float DEFAULT 0.6,
  match_count int DEFAULT 10,
  exclude_ids uuid[] DEFAULT '{}'
)
RETURNS TABLE (
  id uuid,
  full_name text,
  company text,
  "position" text,
  similarity float
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT
    c.id,
    c.full_name,
    c.company,
    c.position,
    1 - (c.profile_embedding <=> query_embedding) as similarity
  FROM contacts c
  WHERE c.tenant_id = match_tenant_id
    AND c.profile_embedding IS NOT NULL
    AND c.id != ALL(exclude_ids)
    AND 1 - (c.profile_embedding <=> query_embedding) > match_threshold
  ORDER BY c.profile_embedding <=> query_embedding
  LIMIT match_count;
$$;