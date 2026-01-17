import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ConsultationQuestionnaire {
  id: string;
  consultation_id: string;
  tenant_id: string;
  member_email: string | null;
  director_name: string | null;
  member_name: string | null;
  cc_group: string | null;
  next_meeting_date: string | null;
  current_engagement: string | null;
  previous_projects_review: string | null;
  group_engagement_rating: number | null;
  group_engagement_details: string | null;
  valuable_education_topics: string | null;
  business_goals_needing_support: string | null;
  strategic_partners_sought: string | null;
  key_cc_events_plan: string | null;
  strategic_contacts_needed: string | null;
  expertise_contribution: string | null;
  value_for_community: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConsultationMeeting {
  id: string;
  consultation_id: string;
  meeting_type: 'past_outside' | 'planned_outside' | 'on_event' | 'planned_on_event';
  contact_name: string | null;
  company: string | null;
  cc_group: string | null;
  meeting_date: string | null;
  follow_up: string | null;
  comment: string | null;
  sort_order: number;
  created_at: string;
}

export interface ConsultationRecommendation {
  id: string;
  consultation_id: string;
  recommendation_type: 'given_external' | 'given_internal' | 'received';
  contact_name: string | null;
  company: string | null;
  recommendation_kind: 'external' | 'internal' | null;
  topic: string | null;
  sort_order: number;
  created_at: string;
}

export interface ConsultationGuest {
  id: string;
  consultation_id: string;
  guest_type: 'invited' | 'planned_invitation';
  guest_name: string | null;
  meeting_date: string | null;
  comment: string | null;
  sort_order: number;
  created_at: string;
}

export interface ConsultationThanks {
  id: string;
  consultation_id: string;
  contact_name: string | null;
  transaction_amount: string | null;
  business_benefit_type: string | null;
  sort_order: number;
  created_at: string;
}

export interface ConsultationChatMessage {
  id: string;
  consultation_id: string;
  chat_type: 'brief' | 'summary';
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

// Hook for questionnaire data
export function useConsultationQuestionnaire(consultationId: string | undefined) {
  return useQuery({
    queryKey: ['consultation-questionnaire', consultationId],
    queryFn: async () => {
      if (!consultationId) return null;

      const { data, error } = await supabase
        .from('consultation_questionnaire')
        .select('*')
        .eq('consultation_id', consultationId)
        .maybeSingle();

      if (error) throw error;
      return data as ConsultationQuestionnaire | null;
    },
    enabled: !!consultationId,
  });
}

// Hook to create or update questionnaire
export function useUpsertQuestionnaire() {
  const queryClient = useQueryClient();
  const { director } = useAuth();

  return useMutation({
    mutationFn: async ({ consultationId, data }: { consultationId: string; data: Partial<ConsultationQuestionnaire> }) => {
      // Check if exists
      const { data: existing } = await supabase
        .from('consultation_questionnaire')
        .select('id')
        .eq('consultation_id', consultationId)
        .maybeSingle();

      if (existing) {
        // Update
        const { data: updated, error } = await supabase
          .from('consultation_questionnaire')
          .update(data)
          .eq('consultation_id', consultationId)
          .select()
          .single();

        if (error) throw error;
        return updated;
      } else {
        // Insert
        const { data: inserted, error } = await supabase
          .from('consultation_questionnaire')
          .insert({
            consultation_id: consultationId,
            tenant_id: tenantId!,
            ...data,
          })
          .select()
          .single();

        if (error) throw error;
        return inserted;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['consultation-questionnaire', variables.consultationId] });
    },
  });
}

// Hook for meetings
export function useConsultationMeetings(consultationId: string | undefined) {
  return useQuery({
    queryKey: ['consultation-meetings', consultationId],
    queryFn: async () => {
      if (!consultationId) return [];

      const { data, error } = await supabase
        .from('consultation_meetings')
        .select('*')
        .eq('consultation_id', consultationId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as ConsultationMeeting[];
    },
    enabled: !!consultationId,
  });
}

export function useCreateConsultationMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (meeting: Omit<ConsultationMeeting, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('consultation_meetings')
        .insert(meeting)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['consultation-meetings', variables.consultation_id] });
    },
  });
}

export function useUpdateConsultationMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, consultationId, ...updates }: { id: string; consultationId: string } & Partial<ConsultationMeeting>) => {
      const { data, error } = await supabase
        .from('consultation_meetings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, consultationId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['consultation-meetings', data.consultationId] });
    },
  });
}

export function useDeleteConsultationMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, consultationId }: { id: string; consultationId: string }) => {
      const { error } = await supabase
        .from('consultation_meetings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { consultationId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['consultation-meetings', data.consultationId] });
    },
  });
}

// Hook for recommendations
export function useConsultationRecommendations(consultationId: string | undefined) {
  return useQuery({
    queryKey: ['consultation-recommendations', consultationId],
    queryFn: async () => {
      if (!consultationId) return [];

      const { data, error } = await supabase
        .from('consultation_recommendations')
        .select('*')
        .eq('consultation_id', consultationId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as ConsultationRecommendation[];
    },
    enabled: !!consultationId,
  });
}

export function useCreateConsultationRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recommendation: Omit<ConsultationRecommendation, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('consultation_recommendations')
        .insert(recommendation)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['consultation-recommendations', variables.consultation_id] });
    },
  });
}

export function useUpdateConsultationRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, consultationId, ...updates }: { id: string; consultationId: string } & Partial<ConsultationRecommendation>) => {
      const { data, error } = await supabase
        .from('consultation_recommendations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, consultationId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['consultation-recommendations', data.consultationId] });
    },
  });
}

export function useDeleteConsultationRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, consultationId }: { id: string; consultationId: string }) => {
      const { error } = await supabase
        .from('consultation_recommendations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { consultationId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['consultation-recommendations', data.consultationId] });
    },
  });
}

// Hook for guests
export function useConsultationGuests(consultationId: string | undefined) {
  return useQuery({
    queryKey: ['consultation-guests', consultationId],
    queryFn: async () => {
      if (!consultationId) return [];

      const { data, error } = await supabase
        .from('consultation_guests')
        .select('*')
        .eq('consultation_id', consultationId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as ConsultationGuest[];
    },
    enabled: !!consultationId,
  });
}

export function useCreateConsultationGuest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (guest: Omit<ConsultationGuest, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('consultation_guests')
        .insert(guest)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['consultation-guests', variables.consultation_id] });
    },
  });
}

export function useUpdateConsultationGuest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, consultationId, ...updates }: { id: string; consultationId: string } & Partial<ConsultationGuest>) => {
      const { data, error } = await supabase
        .from('consultation_guests')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, consultationId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['consultation-guests', data.consultationId] });
    },
  });
}

export function useDeleteConsultationGuest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, consultationId }: { id: string; consultationId: string }) => {
      const { error } = await supabase
        .from('consultation_guests')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { consultationId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['consultation-guests', data.consultationId] });
    },
  });
}

// Hook for thanks (TYFCB)
export function useConsultationThanks(consultationId: string | undefined) {
  return useQuery({
    queryKey: ['consultation-thanks', consultationId],
    queryFn: async () => {
      if (!consultationId) return [];

      const { data, error } = await supabase
        .from('consultation_thanks')
        .select('*')
        .eq('consultation_id', consultationId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as ConsultationThanks[];
    },
    enabled: !!consultationId,
  });
}

export function useCreateConsultationThanks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (thanks: Omit<ConsultationThanks, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('consultation_thanks')
        .insert(thanks)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['consultation-thanks', variables.consultation_id] });
    },
  });
}

export function useUpdateConsultationThanks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, consultationId, ...updates }: { id: string; consultationId: string } & Partial<ConsultationThanks>) => {
      const { data, error } = await supabase
        .from('consultation_thanks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, consultationId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['consultation-thanks', data.consultationId] });
    },
  });
}

export function useDeleteConsultationThanks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, consultationId }: { id: string; consultationId: string }) => {
      const { error } = await supabase
        .from('consultation_thanks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { consultationId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['consultation-thanks', data.consultationId] });
    },
  });
}

// Hook for chat messages
export function useConsultationChatMessages(consultationId: string | undefined, chatType: 'brief' | 'summary') {
  return useQuery({
    queryKey: ['consultation-chat-messages', consultationId, chatType],
    queryFn: async () => {
      if (!consultationId) return [];

      const { data, error } = await supabase
        .from('consultation_chat_messages')
        .select('*')
        .eq('consultation_id', consultationId)
        .eq('chat_type', chatType)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ConsultationChatMessage[];
    },
    enabled: !!consultationId,
  });
}

export function useCreateChatMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: { consultation_id: string; chat_type: 'brief' | 'summary'; role: 'user' | 'assistant' | 'system'; content: string }) => {
      const { data, error } = await supabase
        .from('consultation_chat_messages')
        .insert(message)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['consultation-chat-messages', data.consultation_id, data.chat_type] });
    },
  });
}

export function useUpdateChatMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, consultationId, chatType, content }: { id: string; consultationId: string; chatType: 'brief' | 'summary'; content: string }) => {
      const { data, error } = await supabase
        .from('consultation_chat_messages')
        .update({ content })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, consultationId, chatType };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['consultation-chat-messages', data.consultationId, data.chatType] });
    },
  });
}

export function useClearChatMessages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ consultationId, chatType }: { consultationId: string; chatType: 'brief' | 'summary' }) => {
      const { error } = await supabase
        .from('consultation_chat_messages')
        .delete()
        .eq('consultation_id', consultationId)
        .eq('chat_type', chatType);

      if (error) throw error;
      return { consultationId, chatType };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['consultation-chat-messages', data.consultationId, data.chatType] });
    },
  });
}
