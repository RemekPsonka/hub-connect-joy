-- Create agent_conversations table for conversation history
CREATE TABLE public.agent_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  session_id UUID NOT NULL DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  extracted_data JSONB DEFAULT '{}',
  actions_taken JSONB[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view agent conversations for their tenant"
ON public.agent_conversations
FOR SELECT
USING (tenant_id = get_current_tenant_id());

CREATE POLICY "Users can insert agent conversations for their tenant"
ON public.agent_conversations
FOR INSERT
WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY "Users can delete agent conversations for their tenant"
ON public.agent_conversations
FOR DELETE
USING (tenant_id = get_current_tenant_id());

-- Index for faster queries
CREATE INDEX idx_agent_conversations_contact_session ON public.agent_conversations(contact_id, session_id);
CREATE INDEX idx_agent_conversations_created ON public.agent_conversations(created_at DESC);