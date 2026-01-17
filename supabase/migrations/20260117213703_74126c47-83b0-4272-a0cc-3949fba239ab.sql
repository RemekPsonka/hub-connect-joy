-- Sesje orchestracji Agent Turbo
CREATE TABLE turbo_agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  original_query TEXT NOT NULL,
  query_intent TEXT,
  
  -- Stats
  total_agents_available INTEGER,
  agents_selected INTEGER,
  agents_responded INTEGER DEFAULT 0,
  
  -- Status: analyzing | selecting | querying | aggregating | completed | failed
  status TEXT DEFAULT 'analyzing',
  
  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  selection_completed_at TIMESTAMPTZ,
  queries_completed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_duration_ms INTEGER,
  
  -- Results
  master_response TEXT,
  top_results JSONB,
  categories JSONB,
  insights TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sub-queries do wybranych agentów
CREATE TABLE turbo_agent_sub_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES turbo_agent_sessions(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id),
  contact_name TEXT,
  
  -- Query
  sub_query TEXT NOT NULL,
  selection_reason TEXT,
  
  -- Response
  agent_response TEXT,
  confidence_score DECIMAL(3,2),
  relevance_score DECIMAL(3,2),
  reasoning JSONB,
  evidence TEXT[],
  
  -- Timing
  query_sent_at TIMESTAMPTZ DEFAULT NOW(),
  response_received_at TIMESTAMPTZ,
  processing_time_ms INTEGER,
  
  status TEXT DEFAULT 'pending' -- pending | processing | completed | failed
);

-- RLS policies
ALTER TABLE turbo_agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE turbo_agent_sub_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_access" ON turbo_agent_sessions
  FOR ALL USING (tenant_id = get_current_tenant_id());

CREATE POLICY "tenant_access" ON turbo_agent_sub_queries
  FOR ALL USING (EXISTS (
    SELECT 1 FROM turbo_agent_sessions s 
    WHERE s.id = turbo_agent_sub_queries.session_id 
    AND s.tenant_id = get_current_tenant_id()
  ));

-- Indexes for performance
CREATE INDEX idx_turbo_sessions_tenant ON turbo_agent_sessions(tenant_id);
CREATE INDEX idx_turbo_sessions_status ON turbo_agent_sessions(status);
CREATE INDEX idx_turbo_sub_queries_session ON turbo_agent_sub_queries(session_id);
CREATE INDEX idx_turbo_sub_queries_contact ON turbo_agent_sub_queries(contact_id);