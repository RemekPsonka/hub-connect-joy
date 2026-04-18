import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface AgentInsight {
  text: string;
  source: string;
  importance: 'high' | 'medium' | 'low';
  added_at?: string;
}

export interface AgentProfile {
  pain_points?: string[];
  interests?: string[];
  goals?: string[];
  communication_style?: string;
  decision_making?: string;
  key_topics?: string[];
  relationship_dynamics?: string;
  business_value?: string;
  timeline_summary?: string;
  next_steps?: string[];
  warnings?: string[];
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

export interface ProposedAction {
  type: 'CREATE_TASK' | 'ADD_NOTE' | 'UPDATE_PROFILE' | 'ADD_INSIGHT' | 'CREATE_NEED' | 'CREATE_OFFER' | 'SCHEDULE_FOLLOWUP';
  data: {
    title?: string;
    description?: string;
    priority?: string;
    due_date?: string;
    field?: string;
    value?: string;
    text?: string;
    importance?: string;
    date?: string;
    content?: string;
  };
  reason: string;
}

export interface AgentQueryResponse {
  success: boolean;
  session_id: string;
  contact_name?: string;
  answer: string;
  relevant_history: string[];
  suggested_topics: string[];
  warnings: string[];
  action_items: string[];
  proposed_actions: ProposedAction[];
  memory_update: {
    new_insights: AgentInsight[];
    profile_updates: Record<string, unknown>;
  };
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  proposed_actions?: ProposedAction[];
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

// Sprint 04: tabela `agent_conversations` zarchiwizowana i usunięta.
// Historia konwersacji per kontakt nieobsługiwana w S04 (do odbudowy w S06 z ai_messages).
export function useAgentConversationHistory(_contactId: string | undefined, _sessionId: string | undefined) {
  return useQuery({
    queryKey: ['agent-conversation-disabled'],
    queryFn: async () => [] as ConversationMessage[],
    enabled: false,
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
  
  const queryAgent = useCallback(async (
    contactId: string, 
    question: string,
    sessionId?: string,
    conversationHistory?: Array<{role: string; content: string}>
  ): Promise<AgentQueryResponse | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('query-contact-agent', {
        body: { 
          contact_id: contactId, 
          question,
          session_id: sessionId,
          conversation_history: conversationHistory
        }
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

export function useExecuteAgentAction() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const executeAction = useCallback(async (
    contactId: string,
    action: ProposedAction,
    sessionId?: string
  ): Promise<{ success: boolean; type?: string; data?: any; error?: string }> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('agent-action', {
        body: { 
          contact_id: contactId, 
          action,
          session_id: sessionId
        }
      });
      
      if (invokeError) throw invokeError;
      
      // Invalidate relevant queries based on action type
      if (action.type === 'CREATE_TASK' || action.type === 'SCHEDULE_FOLLOWUP') {
        queryClient.invalidateQueries({ queryKey: ['contact-tasks', contactId] });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      } else if (action.type === 'ADD_NOTE' || action.type === 'UPDATE_PROFILE') {
        queryClient.invalidateQueries({ queryKey: ['contact', contactId] });
      } else if (action.type === 'ADD_INSIGHT') {
        queryClient.invalidateQueries({ queryKey: ['contact-agent-memory', contactId] });
      } else if (action.type === 'CREATE_NEED') {
        queryClient.invalidateQueries({ queryKey: ['contact-needs', contactId] });
      } else if (action.type === 'CREATE_OFFER') {
        queryClient.invalidateQueries({ queryKey: ['contact-offers', contactId] });
      }
      
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [queryClient]);
  
  return { executeAction, isLoading, error };
}

// NEW: Contact with active agent (full response)
export interface ContactWithAgent {
  contact_id: string;
  contact_name: string;
  company?: string | null;
  agent_answer: string;
  has_active_agent: true;
  semantic_score: number;
}

// NEW: Contact without agent (match reason only)
export interface ContactWithoutAgent {
  contact_id: string;
  contact_name: string;
  company?: string | null;
  match_reason: string;
  has_active_agent: false;
  semantic_score: number;
}

// NEW: Suggested action for user
export interface SuggestedAction {
  type: 'CREATE_TASK' | 'ADD_NOTE';
  contact_id: string;
  contact_name: string;
  title?: string;
  description?: string;
  note?: string;
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
  // NEW: Segmented contact responses
  contacts_with_agents?: ContactWithAgent[];
  contacts_without_agents?: ContactWithoutAgent[];
  suggested_actions?: SuggestedAction[];
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
