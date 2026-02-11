import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ===== TYPES =====

export type ProspectingStatus = 'new' | 'contacted' | 'interested' | 'not_interested' | 'converted';

export interface MeetingProspect {
  id: string;
  team_id: string;
  tenant_id: string;
  full_name: string;
  company: string | null;
  position: string | null;
  industry: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  source_event: string | null;
  source_file_name: string | null;
  imported_at: string;
  imported_by: string;
  is_prospecting: boolean;
  prospecting_notes: string | null;
  prospecting_status: ProspectingStatus;
  converted_to_contact_id: string | null;
  converted_to_team_contact_id: string | null;
  converted_at: string | null;
  priority: string | null;
  ai_brief: string | null;
  ai_brief_generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParsedPerson {
  full_name: string;
  company: string | null;
  position: string | null;
  industry: string | null;
}

// ===== QUERIES =====

export function useMeetingProspects(teamId: string | undefined, onlyProspecting = true) {
  return useQuery({
    queryKey: ['meeting-prospects', teamId, onlyProspecting],
    queryFn: async () => {
      if (!teamId) return [];

      let query = (supabase as any)
        .from('meeting_prospects')
        .select('*')
        .eq('team_id', teamId);

      if (onlyProspecting) {
        query = query.eq('is_prospecting', true);
      }

      query = query
        .not('prospecting_status', 'eq', 'converted')
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as MeetingProspect[];
    },
    enabled: !!teamId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useMeetingProspectsByEvent(teamId: string | undefined, sourceEvent: string | null) {
  return useQuery({
    queryKey: ['meeting-prospects-event', teamId, sourceEvent],
    queryFn: async () => {
      if (!teamId || !sourceEvent) return [];

      const { data, error } = await (supabase as any)
        .from('meeting_prospects')
        .select('*')
        .eq('team_id', teamId)
        .eq('source_event', sourceEvent)
        .order('full_name');

      if (error) throw error;
      return (data || []) as MeetingProspect[];
    },
    enabled: !!teamId && !!sourceEvent,
  });
}

// ===== MUTATIONS =====

export function useImportMeetingProspects() {
  const queryClient = useQueryClient();
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;
  const userId = director?.id;

  return useMutation({
    mutationFn: async ({
      teamId,
      people,
      sourceEvent,
      sourceFileName,
      selectedIndices,
    }: {
      teamId: string;
      people: ParsedPerson[];
      sourceEvent: string;
      sourceFileName: string;
      selectedIndices: number[];
    }) => {
      if (!tenantId || !userId) throw new Error('Brak autoryzacji');

      const selectedPeople = selectedIndices.map((i) => people[i]);

      const rows = selectedPeople.map((p) => ({
        team_id: teamId,
        tenant_id: tenantId,
        full_name: p.full_name,
        company: p.company,
        position: p.position,
        industry: p.industry,
        source_event: sourceEvent,
        source_file_name: sourceFileName,
        imported_by: userId,
        is_prospecting: true,
        prospecting_status: 'new',
      }));

      const { error } = await (supabase as any)
        .from('meeting_prospects')
        .insert(rows);

      if (error) throw error;
      return { teamId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-prospects', result.teamId] });
      toast.success('Zaimportowano osoby na listę prospecting');
    },
    onError: (error: Error) => {
      toast.error(`Błąd importu: ${error.message}`);
    },
  });
}

export function useUpdateMeetingProspect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      teamId,
      ...updates
    }: {
      id: string;
      teamId: string;
      prospecting_status?: ProspectingStatus;
      prospecting_notes?: string | null;
      is_prospecting?: boolean;
      email?: string | null;
      phone?: string | null;
      linkedin_url?: string | null;
      priority?: string | null;
    }) => {
      const { error } = await (supabase as any)
        .from('meeting_prospects')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      return { teamId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-prospects', result.teamId] });
    },
    onError: (error: Error) => {
      toast.error(`Błąd aktualizacji: ${error.message}`);
    },
  });
}

export function useGenerateProspectBrief() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ prospectId, teamId }: { prospectId: string; teamId: string }) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prospect-ai-brief`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ prospectId }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Nieznany błąd' }));
        throw new Error(err.error || `Błąd ${response.status}`);
      }

      const data = await response.json();
      return { brief: data.brief, teamId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-prospects', result.teamId] });
      toast.success('Brief AI wygenerowany');
    },
    onError: (error: Error) => {
      toast.error(`Błąd generowania briefu: ${error.message}`);
    },
  });
}

export function useDeleteMeetingProspect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, teamId }: { id: string; teamId: string }) => {
      const { error } = await (supabase as any)
        .from('meeting_prospects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { teamId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-prospects', result.teamId] });
      toast.success('Usunięto z listy prospecting');
    },
    onError: (error: Error) => {
      toast.error(`Błąd: ${error.message}`);
    },
  });
}
