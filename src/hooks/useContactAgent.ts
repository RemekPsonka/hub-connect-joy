import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface AgentInsight {
  text: string;
  source: string;
  importance: 'high' | 'medium' | 'low';
}

export interface AgentProfile {
  pain_points?: string[];
  interests?: string[];
  goals?: string[];
  communication_style?: string;
  decision_making?: string;
  key_topics?: string[];
}

export interface ContactAgentMemory {
  id: string;
  tenant_id: string;
  contact_id: string;
  agent_persona: string | null;
  agent_profile: AgentProfile;
  insights: AgentInsight[];
  last_refresh_at: string | null;
  refresh_sources: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AgentQueryResponse {
  success: boolean;
  contact_name?: string;
  answer: string;
  relevant_history: string[];
  suggested_topics: string[];
  warnings: string[];
  action_items: string[];
}

export function useContactAgentMemory(contactId: string | undefined) {
  return useQuery({
    queryKey: ['contact-agent-memory', contactId],
    queryFn: async () => {
      if (!contactId) return null;
      
      const { data, error } = await supabase
        .from('contact_agent_memory')
        .select('*')
        .eq('contact_id', contactId)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;
      
      return {
        ...data,
        agent_profile: (data.agent_profile || {}) as unknown as AgentProfile,
        insights: (Array.isArray(data.insights) ? data.insights : []) as unknown as AgentInsight[]
      } as ContactAgentMemory;
    },
    enabled: !!contactId
  });
}

export function useInitializeContactAgent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (contactId: string) => {
      const { data, error } = await supabase.functions.invoke('initialize-contact-agent', {
        body: { contact_id: contactId }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, contactId) => {
      queryClient.invalidateQueries({ queryKey: ['contact-agent-memory', contactId] });
    }
  });
}

export function useQueryContactAgent() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const queryAgent = useCallback(async (contactId: string, question: string): Promise<AgentQueryResponse | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('query-contact-agent', {
        body: { contact_id: contactId, question }
      });
      
      if (invokeError) throw invokeError;
      return data as AgentQueryResponse;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  return { queryAgent, isLoading, error };
}

export interface MasterAgentResponse {
  success: boolean;
  total_agents: number;
  answer: string;
  agents_consulted: string[];
  reasoning: Record<string, string>;
  recommendations: Array<{
    action: string;
    reason: string;
    contacts_involved?: string[];
    confidence: number;
  }>;
  related_contacts: Array<{
    contact_id: string;
    name: string;
    company?: string;
    relevance: string;
  }>;
  potential_matches: Array<{
    contact_a: { id: string; name: string };
    contact_b: { id: string; name: string };
    match_reason: string;
    confidence: number;
  }>;
}

export function useMasterAgent() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const queryMasterAgent = useCallback(async (
    tenantId: string, 
    query: string, 
    queryType: 'general' | 'match' | 'briefing' = 'general'
  ): Promise<MasterAgentResponse | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('master-agent-query', {
        body: { tenant_id: tenantId, query, query_type: queryType }
      });
      
      if (invokeError) throw invokeError;
      return data as MasterAgentResponse;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  return { queryMasterAgent, isLoading, error };
}
