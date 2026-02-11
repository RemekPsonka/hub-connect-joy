import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Types
export type MeetingStatus = 'upcoming' | 'in_progress' | 'completed' | 'cancelled';
export type AttendanceStatus = 'invited' | 'confirmed' | 'attended' | 'absent';
export type RecommendationStatus = 'pending' | 'accepted' | 'rejected' | 'completed';
export type OneOnOneOutcome = 'positive' | 'neutral' | 'negative';

export interface GroupMeeting {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
  city: string | null;
  expected_participant_count: number | null;
  actual_participant_count: number | null;
  status: MeetingStatus;
  recommendations_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface MeetingParticipant {
  id: string;
  meeting_id: string;
  contact_id: string;
  is_member: boolean;
  is_new: boolean;
  attendance_status: AttendanceStatus;
  notes: string | null;
  created_at: string;
  contact?: {
    id: string;
    full_name: string;
    company: string | null;
    email: string | null;
    primary_group_id: string | null;
  };
  prospect?: {
    id: string;
    full_name: string;
    company: string | null;
    position: string | null;
    industry: string | null;
  } | null;
}

export interface MeetingRecommendation {
  id: string;
  meeting_id: string;
  for_contact_id: string;
  recommended_contact_id: string;
  rank: number;
  reasoning: string | null;
  talking_points: string | null;
  match_type: string | null;
  status: RecommendationStatus;
  created_at: string;
  for_contact?: {
    id: string;
    full_name: string;
    company: string | null;
  };
  recommended_contact?: {
    id: string;
    full_name: string;
    company: string | null;
  };
}

export interface OneOnOneMeeting {
  id: string;
  group_meeting_id: string;
  contact_a_id: string;
  contact_b_id: string;
  was_recommended: boolean;
  recommendation_id: string | null;
  outcome: OneOnOneOutcome;
  notes: string | null;
  follow_up_needed: boolean;
  created_at: string;
  contact_a?: {
    id: string;
    full_name: string;
    company: string | null;
  };
  contact_b?: {
    id: string;
    full_name: string;
    company: string | null;
  };
}

export type MeetingsFilter = 'all' | 'upcoming' | 'past';

export interface MeetingInsert {
  name: string;
  description?: string;
  scheduled_at: string;
  duration_minutes?: number;
  location?: string;
  city?: string;
  expected_participant_count?: number;
  status?: MeetingStatus;
}

export interface MeetingUpdate extends Partial<MeetingInsert> {
  actual_participant_count?: number;
  recommendations_generated?: boolean;
}

// Meetings hooks
export function useMeetings(filter: MeetingsFilter = 'all') {
  return useQuery({
    queryKey: ['meetings', filter],
    queryFn: async () => {
      let query = supabase
        .from('group_meetings')
        .select('*')
        .order('scheduled_at', { ascending: filter === 'upcoming' });

      const now = new Date().toISOString();
      
      if (filter === 'upcoming') {
        query = query.gte('scheduled_at', now);
      } else if (filter === 'past') {
        query = query.lt('scheduled_at', now);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as GroupMeeting[];
    },
  });
}

export function useMeeting(id: string | undefined) {
  return useQuery({
    queryKey: ['meeting', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('group_meetings')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as GroupMeeting;
    },
    enabled: !!id,
  });
}

export function useUpcomingMeetingsCount() {
  return useQuery({
    queryKey: ['meetings', 'upcoming', 'count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('group_meetings')
        .select('*', { count: 'exact', head: true })
        .gte('scheduled_at', new Date().toISOString());
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (meeting: MeetingInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: director } = await supabase
        .from('directors')
        .select('tenant_id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (!director) throw new Error('No tenant found');

      const { data, error } = await supabase
        .from('group_meetings')
        .insert({ ...meeting, tenant_id: director.tenant_id })
        .select()
        .single();
      if (error) throw error;
      return data as GroupMeeting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });
}

export function useUpdateMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: MeetingUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('group_meetings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as GroupMeeting;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['meeting', data.id] });
    },
  });
}

export function useDeleteMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('group_meetings')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });
}

// Participants hooks
export function useMeetingParticipants(meetingId: string | undefined) {
  return useQuery({
    queryKey: ['meeting-participants', meetingId],
    queryFn: async () => {
      if (!meetingId) return [];
      const { data, error } = await supabase
        .from('meeting_participants')
        .select(`
          *,
          contact:contacts!meeting_participants_contact_id_fkey(id, full_name, company, email, primary_group_id),
          prospect:meeting_prospects!meeting_participants_prospect_id_fkey(id, full_name, company, position, industry)
        `)
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as (MeetingParticipant & { prospect_id?: string | null })[];
    },
    enabled: !!meetingId,
  });
}

export function useAddParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      meetingId,
      contactId,
      isMember = false,
      isNew = false,
    }: {
      meetingId: string;
      contactId: string;
      isMember?: boolean;
      isNew?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('meeting_participants')
        .insert({
          meeting_id: meetingId,
          contact_id: contactId,
          is_member: isMember,
          is_new: isNew,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-participants', variables.meetingId] });
    },
  });
}

export function useUpdateParticipantAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      participantId,
      attendanceStatus,
      meetingId,
    }: {
      participantId: string;
      attendanceStatus: AttendanceStatus;
      meetingId: string;
    }) => {
      const { data, error } = await supabase
        .from('meeting_participants')
        .update({ attendance_status: attendanceStatus })
        .eq('id', participantId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-participants', variables.meetingId] });
    },
  });
}

export function useRemoveParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ participantId, meetingId }: { participantId: string; meetingId: string }) => {
      const { error } = await supabase
        .from('meeting_participants')
        .delete()
        .eq('id', participantId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-participants', variables.meetingId] });
    },
  });
}

export function useBulkAddParticipants() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      meetingId,
      participants,
    }: {
      meetingId: string;
      participants: Array<{ contactId: string; isMember?: boolean; isNew?: boolean }>;
    }) => {
      const { data, error } = await supabase
        .from('meeting_participants')
        .insert(
          participants.map((p) => ({
            meeting_id: meetingId,
            contact_id: p.contactId,
            is_member: p.isMember ?? false,
            is_new: p.isNew ?? false,
          }))
        )
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-participants', variables.meetingId] });
    },
  });
}

// Recommendations hooks
export function useMeetingRecommendations(meetingId: string | undefined) {
  return useQuery({
    queryKey: ['meeting-recommendations', meetingId],
    queryFn: async () => {
      if (!meetingId) return [];
      const { data, error } = await supabase
        .from('meeting_recommendations')
        .select(`
          *,
          for_contact:contacts!meeting_recommendations_for_contact_id_fkey(id, full_name, company),
          recommended_contact:contacts!meeting_recommendations_recommended_contact_id_fkey(id, full_name, company)
        `)
        .eq('meeting_id', meetingId)
        .order('for_contact_id')
        .order('rank');
      if (error) throw error;
      return data as MeetingRecommendation[];
    },
    enabled: !!meetingId,
  });
}

export function useGenerateRecommendations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      meetingId,
      forContactIds,
    }: {
      meetingId: string;
      forContactIds: string[];
    }) => {
      // Call the AI-powered edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-meeting-recommendations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            meetingId,
            forContactIds,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Błąd podczas generowania rekomendacji AI');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Nie udało się wygenerować rekomendacji');
      }

      return result.recommendations || [];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-recommendations', variables.meetingId] });
      queryClient.invalidateQueries({ queryKey: ['meeting', variables.meetingId] });
    },
  });
}

export function useUpdateRecommendationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recommendationId,
      status,
      meetingId,
    }: {
      recommendationId: string;
      status: RecommendationStatus;
      meetingId: string;
    }) => {
      const { data, error } = await supabase
        .from('meeting_recommendations')
        .update({ status })
        .eq('id', recommendationId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-recommendations', variables.meetingId] });
    },
  });
}

// One-on-One meetings hooks
export function useMeetingOneOnOnes(meetingId: string | undefined) {
  return useQuery({
    queryKey: ['meeting-one-on-ones', meetingId],
    queryFn: async () => {
      if (!meetingId) return [];
      const { data, error } = await supabase
        .from('one_on_one_meetings')
        .select(`
          *,
          contact_a:contacts!one_on_one_meetings_contact_a_id_fkey(id, full_name, company),
          contact_b:contacts!one_on_one_meetings_contact_b_id_fkey(id, full_name, company)
        `)
        .eq('group_meeting_id', meetingId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as OneOnOneMeeting[];
    },
    enabled: !!meetingId,
  });
}

export function useLogOneOnOne() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupMeetingId,
      contactAId,
      contactBId,
      outcome = 'neutral',
      notes,
      followUpNeeded = false,
      wasRecommended = false,
      recommendationId,
    }: {
      groupMeetingId: string;
      contactAId: string;
      contactBId: string;
      outcome?: OneOnOneOutcome;
      notes?: string;
      followUpNeeded?: boolean;
      wasRecommended?: boolean;
      recommendationId?: string;
    }) => {
      const { data, error } = await supabase
        .from('one_on_one_meetings')
        .insert({
          group_meeting_id: groupMeetingId,
          contact_a_id: contactAId,
          contact_b_id: contactBId,
          outcome,
          notes,
          follow_up_needed: followUpNeeded,
          was_recommended: wasRecommended,
          recommendation_id: recommendationId,
        })
        .select()
        .single();
      if (error) throw error;

      // If recommendation exists, mark it as completed
      if (recommendationId) {
        await supabase
          .from('meeting_recommendations')
          .update({ status: 'completed' })
          .eq('id', recommendationId);
      }

      // Create connection if follow-up needed
        if (followUpNeeded) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const { data: director } = currentUser ? await supabase
          .from('directors')
          .select('tenant_id')
          .eq('user_id', currentUser.id)
          .maybeSingle() : { data: null };

        if (director) {
          await supabase.from('connections').insert({
            tenant_id: director.tenant_id,
            contact_a_id: contactAId,
            contact_b_id: contactBId,
            strength: outcome === 'positive' ? 7 : outcome === 'neutral' ? 5 : 3,
            connection_type: 'met_at_event',
          });
        }
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-one-on-ones', variables.groupMeetingId] });
      queryClient.invalidateQueries({ queryKey: ['meeting-recommendations', variables.groupMeetingId] });
    },
  });
}

// Meeting stats
export function useMeetingStats(meetingId: string | undefined) {
  const { data: participants } = useMeetingParticipants(meetingId);
  const { data: recommendations } = useMeetingRecommendations(meetingId);
  const { data: oneOnOnes } = useMeetingOneOnOnes(meetingId);

  const stats = {
    totalParticipants: participants?.length ?? 0,
    attendedParticipants: participants?.filter((p) => p.attendance_status === 'attended').length ?? 0,
    memberParticipants: participants?.filter((p) => p.is_member).length ?? 0,
    newContacts: participants?.filter((p) => p.is_new).length ?? 0,
    totalRecommendations: recommendations?.length ?? 0,
    acceptedRecommendations: recommendations?.filter((r) => r.status === 'accepted' || r.status === 'completed').length ?? 0,
    totalOneOnOnes: oneOnOnes?.length ?? 0,
    followUpsNeeded: oneOnOnes?.filter((o) => o.follow_up_needed).length ?? 0,
  };

  return stats;
}
