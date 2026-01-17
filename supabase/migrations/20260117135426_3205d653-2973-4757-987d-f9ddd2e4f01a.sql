-- Create table to track recommendation actions (completed/dismissed)
CREATE TABLE public.ai_recommendation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  recommendation_hash TEXT NOT NULL,
  recommendation_type TEXT NOT NULL,
  recommendation_title TEXT NOT NULL,
  action_taken TEXT NOT NULL CHECK (action_taken IN ('completed', 'dismissed')),
  related_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  contact_ids TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create unique index on hash and tenant for fast lookup
CREATE UNIQUE INDEX idx_ai_rec_actions_hash ON public.ai_recommendation_actions(tenant_id, recommendation_hash);

-- Enable RLS
ALTER TABLE public.ai_recommendation_actions ENABLE ROW LEVEL SECURITY;

-- RLS policy for tenant access
CREATE POLICY "tenant_access" ON public.ai_recommendation_actions
  FOR ALL USING (tenant_id = get_current_tenant_id());