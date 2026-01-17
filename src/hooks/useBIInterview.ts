import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Types
export interface BIProfile {
  section_1_basic_info?: {
    full_name?: string;
    company_main?: string;
    industry?: string;
    nip?: string;
    website?: string;
    linkedin?: string;
    assistant_name?: string;
    assistant_email?: string;
    assistant_phone?: string;
    headquarters?: string;
    residence?: string;
    founded_year?: number;
    company_age_years?: number;
  };
  section_2_business_metrics?: {
    employees_count?: number;
    clients_current?: number;
    clients_plan_this_year?: number;
    revenue_last_year?: number;
    revenue_plan_this_year?: number;
    ebitda_last_year?: number;
    ebitda_plan_this_year?: number;
    ebitda_yoy_change_percent?: number;
    other_kpis?: {
      retention_rate?: number;
      nps_score?: number;
      avg_deal_size?: number;
    };
    main_activity?: string;
    markets?: string[];
    top_products?: string[];
    value_proposition?: string;
    formal_role?: string;
    ownership_structure?: {
      user_shares_percent?: number;
      has_partners?: boolean;
      partners?: string[];
    };
    total_business_scale?: string;
    other_businesses?: string[];
  };
  section_3_priorities_challenges?: {
    top_3_priorities?: string[];
    biggest_challenge?: string;
    biggest_achievement?: string;
    proudest_products?: string[];
    top_3_clients?: string[];
    client_profile?: string;
    what_seeking?: string[];
    strategy_2_3_years?: string;
    consults_decisions_with?: string[];
    economic_situation_impact?: {
      opportunities?: string[];
      threats?: string[];
    };
  };
  section_4_investments?: {
    recent_investments?: Array<{
      type?: string;
      description?: string;
      date?: string;
      rationale?: string;
      cost?: number;
    }>;
    planned_investments?: Array<{
      type?: string;
      description?: string;
      timeline?: string;
      budget?: number;
      needs?: string[];
    }>;
  };
  section_5_cc_relations?: {
    source_of_contact?: {
      person?: string;
      relation?: string;
    };
    attended_cc_meetings?: string[];
    wants_to_meet?: string[];
    currently_cooperates_with?: string[];
    value_to_cc?: {
      contacts?: string[];
      knowledge?: string[];
      resources?: string[];
    };
    engagement_in_cc?: string[];
  };
  section_6_personal?: {
    family?: {
      marital_status?: string;
      spouse_name?: string;
      children?: number;
      children_ages?: number[];
    };
    work_life_balance?: string;
    personal_goals_2_3_years?: string[];
    succession_plan?: {
      exists?: boolean;
      notes?: string;
    };
    passions?: string[];
    life_principles?: string[];
    philanthropy?: {
      supports?: boolean;
      organizations?: string[];
    };
    other_memberships?: string[];
  };
}

export interface ContactBIData {
  id: string;
  contact_id: string;
  tenant_id: string;
  bi_profile: BIProfile;
  completeness_score: number;
  last_bi_update: string | null;
  next_review_date: string | null;
  interviewer_name: string | null;
  bi_status: 'incomplete' | 'in_progress' | 'complete';
  created_at: string;
  updated_at: string;
}

export interface BIInterviewSession {
  id: string;
  contact_bi_id: string;
  session_type: 'initial' | 'update' | 'review';
  status: 'in_progress' | 'paused' | 'completed';
  questions_asked: number;
  questions_answered: number;
  sections_completed: string[];
  conversation_log: Array<{
    timestamp: string;
    speaker: 'user' | 'agent';
    message: string;
    question_field?: string;
  }>;
  started_at: string;
  completed_at: string | null;
}

export interface BIInterviewResponse {
  success: boolean;
  agent_message: string;
  next_question?: {
    section: string;
    field: string;
  };
  completeness: number;
  sections_completed: string[];
  status: 'in_progress' | 'paused' | 'completed';
  session_id: string;
}

// Hook to fetch BI data for a contact
export function useBIData(contactId: string | undefined) {
  return useQuery({
    queryKey: ['contact-bi-data', contactId],
    queryFn: async () => {
      if (!contactId) return null;
      
      const { data, error } = await supabase
        .from('contact_bi_data')
        .select('*')
        .eq('contact_id', contactId)
        .maybeSingle();
      
      if (error) throw error;
      return data as ContactBIData | null;
    },
    enabled: !!contactId
  });
}

// Hook to fetch BI sessions for a contact
export function useBISessions(contactBiId: string | undefined) {
  return useQuery({
    queryKey: ['bi-interview-sessions', contactBiId],
    queryFn: async () => {
      if (!contactBiId) return [];
      
      const { data, error } = await supabase
        .from('bi_interview_sessions')
        .select('*')
        .eq('contact_bi_id', contactBiId)
        .order('started_at', { ascending: false });
      
      if (error) throw error;
      return data as BIInterviewSession[];
    },
    enabled: !!contactBiId
  });
}

// Hook to get the latest active session
export function useActiveSession(contactBiId: string | undefined) {
  return useQuery({
    queryKey: ['bi-active-session', contactBiId],
    queryFn: async () => {
      if (!contactBiId) return null;
      
      const { data, error } = await supabase
        .from('bi_interview_sessions')
        .select('*')
        .eq('contact_bi_id', contactBiId)
        .in('status', ['in_progress', 'paused'])
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as BIInterviewSession | null;
    },
    enabled: !!contactBiId
  });
}

// Hook for BI interview mutation
export function useBIInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      contactId, 
      sessionId, 
      userMessage,
      tenantId
    }: { 
      contactId: string;
      sessionId: string | null;
      userMessage: string;
      tenantId?: string;
    }): Promise<BIInterviewResponse> => {
      const { data, error } = await supabase.functions.invoke('bi-agent-interview', {
        body: { contactId, sessionId, userMessage, tenantId }
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Interview failed');
      
      return data as BIInterviewResponse;
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['contact-bi-data', variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ['bi-interview-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['bi-active-session'] });
    }
  });
}

// Hook to get BI statistics for settings page
export function useBIStatistics(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['bi-statistics', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      const { data: biData, error } = await supabase
        .from('contact_bi_data')
        .select('bi_status, completeness_score, next_review_date')
        .eq('tenant_id', tenantId);
      
      if (error) throw error;
      
      const completed = biData?.filter(d => d.bi_status === 'complete').length || 0;
      const total = biData?.length || 0;
      const avgCompleteness = total > 0 
        ? (biData?.reduce((acc, d) => acc + (d.completeness_score || 0), 0) || 0) / total 
        : 0;
      const needsReview = biData?.filter(d => 
        d.next_review_date && new Date(d.next_review_date) < new Date()
      ).length || 0;
      
      return {
        completed,
        total,
        avgCompleteness: Math.round(avgCompleteness * 100),
        needsReview
      };
    },
    enabled: !!tenantId
  });
}

// Hook to get contacts without BI data
export function useContactsWithoutBI(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['contacts-without-bi', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      // Get all contacts
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('id, full_name, company')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);
      
      if (contactsError) throw contactsError;
      
      // Get contacts with BI data
      const { data: biContacts, error: biError } = await supabase
        .from('contact_bi_data')
        .select('contact_id')
        .eq('tenant_id', tenantId);
      
      if (biError) throw biError;
      
      const biContactIds = new Set(biContacts?.map(b => b.contact_id) || []);
      
      return contacts?.filter(c => !biContactIds.has(c.id)) || [];
    },
    enabled: !!tenantId
  });
}
