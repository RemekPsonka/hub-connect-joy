-- ============================================
-- AI NETWORK ASSISTANT - PHASE 2
-- Semantic Search Functions & Vector Indexes
-- ============================================

-- ============================================
-- VECTOR INDEXES
-- ============================================

-- Index for contacts profile embedding
CREATE INDEX IF NOT EXISTS idx_contacts_profile_embedding ON contacts 
    USING hnsw (profile_embedding vector_cosine_ops) 
    WITH (m = 16, ef_construction = 64);

-- Index for needs embedding
CREATE INDEX IF NOT EXISTS idx_needs_embedding ON needs 
    USING hnsw (embedding vector_cosine_ops) 
    WITH (m = 16, ef_construction = 64);

-- Index for offers embedding
CREATE INDEX IF NOT EXISTS idx_offers_embedding ON offers 
    USING hnsw (embedding vector_cosine_ops) 
    WITH (m = 16, ef_construction = 64);

-- ============================================
-- SEMANTIC SEARCH FUNCTIONS
-- ============================================

-- Search contacts by embedding
CREATE OR REPLACE FUNCTION search_contacts_semantic(
    p_tenant_id UUID,
    p_query_embedding vector(1536),
    p_limit INTEGER DEFAULT 10,
    p_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    contact_id UUID,
    full_name TEXT,
    company TEXT,
    job_position TEXT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.full_name,
        c.company,
        c.position AS job_position,
        1 - (c.profile_embedding <=> p_query_embedding) AS similarity
    FROM contacts c
    WHERE c.tenant_id = p_tenant_id
      AND c.is_active = true
      AND c.profile_embedding IS NOT NULL
      AND 1 - (c.profile_embedding <=> p_query_embedding) >= p_threshold
    ORDER BY c.profile_embedding <=> p_query_embedding
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Search needs by embedding
CREATE OR REPLACE FUNCTION search_needs_semantic(
    p_tenant_id UUID,
    p_query_embedding vector(1536),
    p_limit INTEGER DEFAULT 10,
    p_threshold FLOAT DEFAULT 0.6
)
RETURNS TABLE (
    need_id UUID,
    need_contact_id UUID,
    contact_name TEXT,
    need_title TEXT,
    need_description TEXT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.contact_id,
        c.full_name,
        n.title,
        n.description,
        1 - (n.embedding <=> p_query_embedding) AS similarity
    FROM needs n
    JOIN contacts c ON c.id = n.contact_id
    WHERE n.tenant_id = p_tenant_id
      AND n.status = 'active'
      AND n.embedding IS NOT NULL
      AND 1 - (n.embedding <=> p_query_embedding) >= p_threshold
    ORDER BY n.embedding <=> p_query_embedding
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Search offers by embedding
CREATE OR REPLACE FUNCTION search_offers_semantic(
    p_tenant_id UUID,
    p_query_embedding vector(1536),
    p_limit INTEGER DEFAULT 10,
    p_threshold FLOAT DEFAULT 0.6
)
RETURNS TABLE (
    offer_id UUID,
    offer_contact_id UUID,
    contact_name TEXT,
    offer_title TEXT,
    offer_description TEXT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.contact_id,
        c.full_name,
        o.title,
        o.description,
        1 - (o.embedding <=> p_query_embedding) AS similarity
    FROM offers o
    JOIN contacts c ON c.id = o.contact_id
    WHERE o.tenant_id = p_tenant_id
      AND o.status = 'active'
      AND o.embedding IS NOT NULL
      AND 1 - (o.embedding <=> p_query_embedding) >= p_threshold
    ORDER BY o.embedding <=> p_query_embedding
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- GRAPH TRAVERSAL FUNCTIONS
-- ============================================

-- Find connection path between two contacts
CREATE OR REPLACE FUNCTION find_connection_path(
    p_tenant_id UUID,
    p_start_contact UUID,
    p_end_contact UUID,
    p_max_depth INTEGER DEFAULT 3
)
RETURNS TABLE (
    path UUID[],
    depth INTEGER,
    path_types TEXT[]
) AS $$
WITH RECURSIVE connection_path AS (
    SELECT 
        ARRAY[p_start_contact] AS path,
        p_start_contact AS current_contact,
        ARRAY[]::TEXT[] AS path_types,
        1 AS depth
    
    UNION ALL
    
    SELECT 
        cp.path || CASE 
            WHEN conn.contact_a_id = cp.current_contact THEN conn.contact_b_id 
            ELSE conn.contact_a_id 
        END,
        CASE 
            WHEN conn.contact_a_id = cp.current_contact THEN conn.contact_b_id 
            ELSE conn.contact_a_id 
        END,
        cp.path_types || conn.connection_type,
        cp.depth + 1
    FROM connection_path cp
    JOIN connections conn ON (
        conn.tenant_id = p_tenant_id
        AND (conn.contact_a_id = cp.current_contact OR conn.contact_b_id = cp.current_contact)
        AND NOT (
            CASE 
                WHEN conn.contact_a_id = cp.current_contact THEN conn.contact_b_id 
                ELSE conn.contact_a_id 
            END = ANY(cp.path)
        )
    )
    WHERE cp.depth < p_max_depth
)
SELECT path, depth, path_types
FROM connection_path
WHERE current_contact = p_end_contact
ORDER BY depth
LIMIT 5;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Find mutual connections
CREATE OR REPLACE FUNCTION find_mutual_connections(
    p_tenant_id UUID,
    p_contact_a UUID,
    p_contact_b UUID
)
RETURNS TABLE (
    mutual_contact_id UUID,
    mutual_contact_name TEXT,
    connection_to_a_type TEXT,
    connection_to_b_type TEXT
) AS $$
SELECT 
    c.id,
    c.full_name,
    conn_a.connection_type,
    conn_b.connection_type
FROM contacts c
JOIN connections conn_a ON (
    conn_a.tenant_id = p_tenant_id
    AND (
        (conn_a.contact_a_id = p_contact_a AND conn_a.contact_b_id = c.id)
        OR (conn_a.contact_b_id = p_contact_a AND conn_a.contact_a_id = c.id)
    )
)
JOIN connections conn_b ON (
    conn_b.tenant_id = p_tenant_id
    AND (
        (conn_b.contact_a_id = p_contact_b AND conn_b.contact_b_id = c.id)
        OR (conn_b.contact_b_id = p_contact_b AND conn_b.contact_a_id = c.id)
    )
)
WHERE c.tenant_id = p_tenant_id
  AND c.id != p_contact_a
  AND c.id != p_contact_b;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- ============================================
-- NEED-OFFER MATCHING FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION find_need_offer_matches(
    p_tenant_id UUID,
    p_threshold FLOAT DEFAULT 0.65,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    match_need_id UUID,
    match_need_contact_id UUID,
    match_need_title TEXT,
    match_offer_id UUID,
    match_offer_contact_id UUID,
    match_offer_title TEXT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id AS match_need_id,
        n.contact_id AS match_need_contact_id,
        n.title AS match_need_title,
        o.id AS match_offer_id,
        o.contact_id AS match_offer_contact_id,
        o.title AS match_offer_title,
        1 - (n.embedding <=> o.embedding) AS similarity
    FROM needs n
    CROSS JOIN LATERAL (
        SELECT 
            o2.id,
            o2.contact_id,
            o2.title,
            o2.embedding
        FROM offers o2
        WHERE o2.tenant_id = p_tenant_id
          AND o2.status = 'active'
          AND o2.contact_id != n.contact_id
          AND o2.embedding IS NOT NULL
          AND 1 - (n.embedding <=> o2.embedding) >= p_threshold
        ORDER BY n.embedding <=> o2.embedding
        LIMIT 5
    ) o
    WHERE n.tenant_id = p_tenant_id
      AND n.status = 'active'
      AND n.embedding IS NOT NULL
    ORDER BY similarity DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- RELATIONSHIP HEALTH CALCULATION
-- ============================================

CREATE OR REPLACE FUNCTION calculate_relationship_health(
    p_contact_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_score INTEGER := 50;
    v_days_since_contact INTEGER;
    v_consultation_count INTEGER;
    v_task_completion_rate FLOAT;
    v_strength INTEGER;
BEGIN
    -- Get contact data
    SELECT 
        COALESCE(EXTRACT(DAY FROM NOW() - last_contact_date), 365)::INTEGER,
        relationship_strength
    INTO v_days_since_contact, v_strength
    FROM contacts
    WHERE id = p_contact_id;
    
    -- Count recent consultations
    SELECT COUNT(*)
    INTO v_consultation_count
    FROM consultations
    WHERE contact_id = p_contact_id
      AND scheduled_at > NOW() - INTERVAL '90 days'
      AND status = 'completed';
    
    -- Calculate task completion rate
    SELECT 
        CASE 
            WHEN COUNT(*) = 0 THEN 1.0
            ELSE COUNT(*) FILTER (WHERE status = 'completed')::FLOAT / COUNT(*)
        END
    INTO v_task_completion_rate
    FROM tasks t
    JOIN task_contacts tc ON tc.task_id = t.id
    WHERE tc.contact_id = p_contact_id
      AND t.created_at > NOW() - INTERVAL '180 days';
    
    -- Calculate score
    v_score := COALESCE(v_strength, 5) * 5;
    
    -- Adjust for recency
    IF v_days_since_contact < 7 THEN
        v_score := v_score + 20;
    ELSIF v_days_since_contact < 30 THEN
        v_score := v_score + 10;
    ELSIF v_days_since_contact > 90 THEN
        v_score := v_score - 20;
    ELSIF v_days_since_contact > 180 THEN
        v_score := v_score - 30;
    END IF;
    
    -- Adjust for consultations
    v_score := v_score + LEAST(v_consultation_count * 5, 20);
    
    -- Adjust for task completion
    v_score := v_score + (v_task_completion_rate * 10)::INTEGER;
    
    -- Clamp to 0-100
    RETURN GREATEST(0, LEAST(100, v_score));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- RELATIONSHIP HEALTH TRIGGER
-- ============================================

-- Add unique constraint for upsert if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'relationship_health_contact_id_key'
    ) THEN
        ALTER TABLE relationship_health ADD CONSTRAINT relationship_health_contact_id_key UNIQUE (contact_id);
    END IF;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

-- Auto-update relationship health on contact changes
CREATE OR REPLACE FUNCTION trigger_update_relationship_health()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO relationship_health (
        contact_id,
        health_score,
        days_since_contact,
        calculated_at
    )
    VALUES (
        NEW.id,
        calculate_relationship_health(NEW.id),
        COALESCE(EXTRACT(DAY FROM NOW() - NEW.last_contact_date), 365)::INTEGER,
        NOW()
    )
    ON CONFLICT (contact_id) DO UPDATE SET
        health_score = calculate_relationship_health(NEW.id),
        days_since_contact = COALESCE(EXTRACT(DAY FROM NOW() - NEW.last_contact_date), 365)::INTEGER,
        calculated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS update_contact_health ON contacts;

-- Create trigger
CREATE TRIGGER update_contact_health
    AFTER INSERT OR UPDATE OF last_contact_date, relationship_strength ON contacts
    FOR EACH ROW EXECUTE FUNCTION trigger_update_relationship_health();