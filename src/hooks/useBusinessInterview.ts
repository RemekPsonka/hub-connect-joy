import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';
import type {
  BusinessInterview, 
  BIAIOutput, 
  BIValidationResult,
  SectionABasic,
  SectionCCompanyProfile,
  SectionDScale,
  SectionFStrategy,
  SectionGNeeds,
  SectionHInvestments,
  SectionJValueForCC,
  SectionKEngagement,
  SectionLPersonal,
  SectionMOrganizations,
  SectionNFollowup
} from '@/components/bi/types';

// Fetch BI for a contact
export function useBusinessInterview(contactId: string | undefined) {
  return useQuery({
    queryKey: ['business-interview', contactId],
    queryFn: async () => {
      if (!contactId) return null;
      
      const { data, error } = await supabase
        .from('business_interviews')
        .select('*')
        .eq('contact_id', contactId)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      
      // Parse JSONB fields
      if (data) {
        return {
          ...data,
          section_a_basic: (data.section_a_basic || {}) as SectionABasic,
          section_c_company_profile: (data.section_c_company_profile || {}) as SectionCCompanyProfile,
          section_d_scale: (data.section_d_scale || {}) as SectionDScale,
          section_f_strategy: (data.section_f_strategy || {}) as SectionFStrategy,
          section_g_needs: (data.section_g_needs || {}) as SectionGNeeds,
          section_h_investments: (data.section_h_investments || {}) as SectionHInvestments,
          section_j_value_for_cc: (data.section_j_value_for_cc || {}) as SectionJValueForCC,
          section_k_engagement: (data.section_k_engagement || {}) as SectionKEngagement,
          section_l_personal: (data.section_l_personal || {}) as SectionLPersonal,
          section_m_organizations: (data.section_m_organizations || {}) as SectionMOrganizations,
          section_n_followup: (data.section_n_followup || {}) as SectionNFollowup,
        } as BusinessInterview;
      }
      
      return null;
    },
    enabled: !!contactId
  });
}

// Fetch AI Output for a BI
export function useBIAIOutput(businessInterviewId: string | undefined) {
  return useQuery({
    queryKey: ['bi-ai-output', businessInterviewId],
    queryFn: async () => {
      if (!businessInterviewId) return null;
      
      const { data, error } = await supabase
        .from('bi_ai_outputs')
        .select('*')
        .eq('business_interview_id', businessInterviewId)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as unknown as BIAIOutput | null;
    },
    enabled: !!businessInterviewId
  });
}

// Create or Update BI
export function useSaveBusinessInterview() {
  const queryClient = useQueryClient();
  const { director } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      contactId, 
      data, 
      existingId 
    }: { 
      contactId: string; 
      data: Partial<BusinessInterview>; 
      existingId?: string;
    }) => {
      if (!director?.tenant_id) throw new Error('No tenant');

      // Convert typed sections to JSON for Supabase
      const dbData: Record<string, Json | string | undefined> = {};
      
      // Only include defined sections
      if (data.section_a_basic) dbData.section_a_basic = data.section_a_basic as unknown as Json;
      if (data.section_c_company_profile) dbData.section_c_company_profile = data.section_c_company_profile as unknown as Json;
      if (data.section_d_scale) dbData.section_d_scale = data.section_d_scale as unknown as Json;
      if (data.section_f_strategy) dbData.section_f_strategy = data.section_f_strategy as unknown as Json;
      if (data.section_g_needs) dbData.section_g_needs = data.section_g_needs as unknown as Json;
      if (data.section_h_investments) dbData.section_h_investments = data.section_h_investments as unknown as Json;
      if (data.section_j_value_for_cc) dbData.section_j_value_for_cc = data.section_j_value_for_cc as unknown as Json;
      if (data.section_k_engagement) dbData.section_k_engagement = data.section_k_engagement as unknown as Json;
      if (data.section_l_personal) dbData.section_l_personal = data.section_l_personal as unknown as Json;
      if (data.section_m_organizations) dbData.section_m_organizations = data.section_m_organizations as unknown as Json;
      if (data.section_n_followup) dbData.section_n_followup = data.section_n_followup as unknown as Json;
      if (data.status) dbData.status = data.status;

      if (existingId) {
        // Update existing
        const { data: updated, error } = await supabase
          .from('business_interviews')
          .update({
            ...dbData as any,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingId)
          .select()
          .single();
        
        if (error) throw error;
        return updated;
      } else {
        // Create new
        const { data: created, error } = await supabase
          .from('business_interviews')
          .insert({
            contact_id: contactId,
            tenant_id: director.tenant_id,
            filled_by: director.id,
            meeting_date: new Date().toISOString(),
            ...dbData as any,
          })
          .select()
          .single();
        
        if (error) throw error;
        return created;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['business-interview', variables.contactId] });
    }
  });
}

// Update BI status
export function useUpdateBIStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      biId, 
      status 
    }: { 
      biId: string; 
      status: BusinessInterview['status'];
    }) => {
      const { data, error } = await supabase
        .from('business_interviews')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', biId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['business-interview', data.contact_id] });
    }
  });
}

// Process BI with AI
export function useProcessBIWithAI() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ biId }: { biId: string }) => {
      const { data, error } = await supabase.functions.invoke('process-bi-ai', {
        body: { businessInterviewId: biId }
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'AI processing failed');
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bi-ai-output'] });
      queryClient.invalidateQueries({ queryKey: ['business-interview'] });
    }
  });
}

// Update AI Output item (accept/reject/edit)
export function useUpdateAIOutputItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      aiOutputId, 
      itemType, 
      itemId, 
      updates 
    }: { 
      aiOutputId: string; 
      itemType: 'needs_offers' | 'task_proposals' | 'connection_recommendations';
      itemId: string;
      updates: Record<string, any>;
    }) => {
      // First get current data
      const { data: current, error: fetchError } = await supabase
        .from('bi_ai_outputs')
        .select(itemType)
        .eq('id', aiOutputId)
        .single();
      
      if (fetchError) throw fetchError;

      // Update the specific item
      const items = (current[itemType] as any[]) || [];
      const updatedItems = items.map((item: any) => 
        item.id === itemId ? { ...item, ...updates } : item
      );

      // Save back
      const { error: updateError } = await supabase
        .from('bi_ai_outputs')
        .update({ 
          [itemType]: updatedItems,
          updated_at: new Date().toISOString()
        })
        .eq('id', aiOutputId);
      
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bi-ai-output'] });
    }
  });
}

// Fetch BI versions history
export function useBIVersions(businessInterviewId: string | undefined) {
  return useQuery({
    queryKey: ['bi-versions', businessInterviewId],
    queryFn: async () => {
      if (!businessInterviewId) return [];
      
      const { data, error } = await supabase
        .from('bi_versions')
        .select('*, directors(full_name)')
        .eq('business_interview_id', businessInterviewId)
        .order('version', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!businessInterviewId
  });
}

// Validation helper
export function validateBIForAI(bi: BusinessInterview | null): BIValidationResult {
  const missing: string[] = [];
  
  if (!bi) {
    return { valid: false, missing: ['Brak danych BI'] };
  }

  const sectionA = bi.section_a_basic || {};
  const sectionG = bi.section_g_needs || {};

  // Required: Status relacji
  if (!sectionA.status_relacji) {
    missing.push('Status relacji');
  }

  // Required: Top 3 priorytety LUB największe wyzwanie
  const hasNeeds = (sectionG.top3_priorytety && sectionG.top3_priorytety.length > 0) 
    || !!sectionG.najwieksze_wyzwanie;
  
  if (!hasNeeds) {
    missing.push('Top 3 priorytety lub największe wyzwanie');
  }

  return { valid: missing.length === 0, missing };
}

// Statistics for BI
export function useBIStats(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['bi-stats', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      const { data, error } = await supabase
        .from('business_interviews')
        .select('status')
        .eq('tenant_id', tenantId);
      
      if (error) throw error;
      
      const total = data?.length || 0;
      const draft = data?.filter(d => d.status === 'draft').length || 0;
      const completed = data?.filter(d => d.status === 'completed').length || 0;
      const aiProcessed = data?.filter(d => d.status === 'ai_processed').length || 0;
      const approved = data?.filter(d => d.status === 'approved').length || 0;
      
      return { total, draft, completed, aiProcessed, approved };
    },
    enabled: !!tenantId
  });
}
