-- AI NETWORK ASSISTANT - CORE TABLES

-- Extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS ltree;

-- TENANTS
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DIRECTORS
CREATE TABLE public.directors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'director',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, user_id)
);

-- CONTACT GROUPS
CREATE TABLE public.contact_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#6366f1',
    is_system BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    UNIQUE(tenant_id, name)
);

-- CONTACTS
CREATE TABLE public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    position TEXT,
    linkedin_url TEXT,
    city TEXT,
    primary_group_id UUID REFERENCES public.contact_groups(id),
    relationship_strength INTEGER DEFAULT 5,
    last_contact_date DATE,
    profile_summary TEXT,
    profile_embedding vector(1536),
    source TEXT,
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- NEEDS
CREATE TABLE public.needs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category_path ltree,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'active',
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- OFFERS
CREATE TABLE public.offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category_path ltree,
    status TEXT DEFAULT 'active',
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MATCHES
CREATE TABLE public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    need_id UUID REFERENCES public.needs(id) ON DELETE CASCADE,
    offer_id UUID REFERENCES public.offers(id) ON DELETE CASCADE,
    similarity_score FLOAT,
    ai_explanation TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CONSULTATIONS
CREATE TABLE public.consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    director_id UUID NOT NULL REFERENCES public.directors(id),
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    notes TEXT,
    ai_summary TEXT,
    preparation_brief TEXT,
    status TEXT DEFAULT 'scheduled',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TASKS
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    task_type TEXT DEFAULT 'standard',
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    due_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TASK CONTACTS
CREATE TABLE public.task_contacts (
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'primary',
    PRIMARY KEY (task_id, contact_id)
);

-- CROSS TASKS
CREATE TABLE public.cross_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    contact_a_id UUID REFERENCES public.contacts(id),
    contact_b_id UUID REFERENCES public.contacts(id),
    connection_reason TEXT,
    intro_made BOOLEAN DEFAULT false
);

-- RELATIONSHIP HEALTH
CREATE TABLE public.relationship_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID UNIQUE REFERENCES public.contacts(id) ON DELETE CASCADE,
    health_score INTEGER DEFAULT 50,
    days_since_contact INTEGER,
    decay_alert_sent BOOLEAN DEFAULT false,
    calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CONNECTIONS (GRAPH)
CREATE TABLE public.connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    contact_a_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    contact_b_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    connection_type TEXT DEFAULT 'knows',
    strength INTEGER DEFAULT 5,
    CONSTRAINT different_contacts CHECK (contact_a_id != contact_b_id)
);

-- VECTOR INDEXES
CREATE INDEX idx_contacts_embedding ON public.contacts USING hnsw (profile_embedding vector_cosine_ops);
CREATE INDEX idx_needs_embedding ON public.needs USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_offers_embedding ON public.offers USING hnsw (embedding vector_cosine_ops);

-- BASIC INDEXES
CREATE INDEX idx_contacts_tenant ON public.contacts(tenant_id);
CREATE INDEX idx_contacts_name ON public.contacts(full_name);
CREATE INDEX idx_needs_contact ON public.needs(contact_id);
CREATE INDEX idx_offers_contact ON public.offers(contact_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);

-- RLS ENABLE
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.needs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cross_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationship_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- HELPER FUNCTION for tenant isolation
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.directors WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- RLS POLICIES for tenant isolation
CREATE POLICY "tenant_access" ON public.tenants FOR ALL USING (
  id IN (SELECT tenant_id FROM public.directors WHERE user_id = auth.uid())
);

CREATE POLICY "tenant_access" ON public.directors FOR ALL USING (
  user_id = auth.uid() OR tenant_id = public.get_current_tenant_id()
);

CREATE POLICY "tenant_access" ON public.contacts FOR ALL USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY "tenant_access" ON public.contact_groups FOR ALL USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY "tenant_access" ON public.needs FOR ALL USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY "tenant_access" ON public.offers FOR ALL USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY "tenant_access" ON public.tasks FOR ALL USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY "tenant_access" ON public.consultations FOR ALL USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY "tenant_access" ON public.matches FOR ALL USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY "tenant_access" ON public.connections FOR ALL USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "tenant_access" ON public.task_contacts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.tenant_id = public.get_current_tenant_id())
);

CREATE POLICY "tenant_access" ON public.cross_tasks FOR ALL USING (
  EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.tenant_id = public.get_current_tenant_id())
);

CREATE POLICY "tenant_access" ON public.relationship_health FOR ALL USING (
  EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.tenant_id = public.get_current_tenant_id())
);