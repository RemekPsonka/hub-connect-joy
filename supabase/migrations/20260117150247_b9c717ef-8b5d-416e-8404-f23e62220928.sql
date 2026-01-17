-- FIX 2: Remove duplicate index on contacts.profile_embedding
-- Keep idx_contacts_profile_embedding (has better parameters: m=16, ef=64)
DROP INDEX IF EXISTS public.idx_contacts_embedding;

-- FIX 5: Add missing foreign key indices for performance
CREATE INDEX IF NOT EXISTS idx_needs_tenant ON public.needs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_offers_tenant ON public.offers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_tenant ON public.tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_matches_tenant ON public.matches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_connections_tenant ON public.connections(tenant_id);