-- Contact Agent Memory - pamięć dla każdego Contact Agenta
CREATE TABLE public.contact_agent_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  agent_persona TEXT,
  agent_profile JSONB DEFAULT '{}'::jsonb,
  insights JSONB DEFAULT '[]'::jsonb,
  last_refresh_at TIMESTAMP WITH TIME ZONE,
  refresh_sources JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT unique_contact_agent UNIQUE (contact_id)
);

-- Master Agent Memory - jedna pamięć per tenant
CREATE TABLE public.master_agent_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  network_insights JSONB DEFAULT '{}'::jsonb,
  key_relationships JSONB DEFAULT '[]'::jsonb,
  industry_clusters JSONB DEFAULT '{}'::jsonb,
  last_analysis_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT unique_master_agent UNIQUE (tenant_id)
);

-- Master Agent Queries - log pytań do Master Agenta
CREATE TABLE public.master_agent_queries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  query_type TEXT DEFAULT 'general',
  agents_consulted UUID[] DEFAULT '{}',
  reasoning JSONB DEFAULT '{}'::jsonb,
  response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_agent_queries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contact_agent_memory
CREATE POLICY "tenant_access" ON public.contact_agent_memory
FOR ALL USING (tenant_id = get_current_tenant_id());

-- RLS Policies for master_agent_memory
CREATE POLICY "tenant_access" ON public.master_agent_memory
FOR ALL USING (tenant_id = get_current_tenant_id());

-- RLS Policies for master_agent_queries
CREATE POLICY "tenant_access" ON public.master_agent_queries
FOR ALL USING (tenant_id = get_current_tenant_id());

-- Indexes for performance
CREATE INDEX idx_contact_agent_memory_contact ON public.contact_agent_memory(contact_id);
CREATE INDEX idx_contact_agent_memory_tenant ON public.contact_agent_memory(tenant_id);
CREATE INDEX idx_master_agent_queries_tenant ON public.master_agent_queries(tenant_id);
CREATE INDEX idx_master_agent_queries_created ON public.master_agent_queries(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_contact_agent_memory_updated_at
  BEFORE UPDATE ON public.contact_agent_memory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_master_agent_memory_updated_at
  BEFORE UPDATE ON public.master_agent_memory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();