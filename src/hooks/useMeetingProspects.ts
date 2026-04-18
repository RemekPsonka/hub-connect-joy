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
  meeting_id?: string | null;
}

export interface ParsedPerson {
  full_name: string;
  company: string | null;
  position: string | null;
  industry: string | null;
}

// Internal row from public.prospects (source_type='meeting')
interface ProspectsRow {
  id: string;
  team_id: string | null;
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
  imported_at: string | null;
  imported_by: string | null;
  is_prospecting: boolean | null;
  notes: string | null;
  status: string;
  converted_to_contact_id: string | null;
  converted_to_team_contact_id: string | null;
  converted_at: string | null;
  priority: string | null;
  ai_brief: { text?: string; generated_at?: string } | null;
  ai_brief_generated_at: string | null;
  created_at: string;
  updated_at: string;
  meeting_id: string | null;
}

function mapRowToProspect(row: ProspectsRow): MeetingProspect {
  return {
    id: row.id,
    team_id: row.team_id || '',
    tenant_id: row.tenant_id,
    full_name: row.full_name,
    company: row.company,
    position: row.position,
    industry: row.industry,
    email: row.email,
    phone: row.phone,
    linkedin_url: row.linkedin_url,
    source_event: row.source_event,
    source_file_name: row.source_file_name,
    imported_at: row.imported_at || row.created_at,
    imported_by: row.imported_by || '',
    is_prospecting: row.is_prospecting ?? true,
    prospecting_notes: row.notes,
    prospecting_status: (row.status || 'new') as ProspectingStatus,
    converted_to_contact_id: row.converted_to_contact_id,
    converted_to_team_contact_id: row.converted_to_team_contact_id,
    converted_at: row.converted_at,
    priority: row.priority,
    ai_brief: row.ai_brief?.text ?? null,
    ai_brief_generated_at: row.ai_brief_generated_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    meeting_id: row.meeting_id,
  };
}

// ===== QUERIES =====

export function useMeetingProspects(teamId: string | undefined, onlyProspecting = true) {
  return useQuery({
    queryKey: ['meeting-prospects', teamId, onlyProspecting],
    queryFn: async () => {
      if (!teamId) return [];

      let query = supabase
        .from('prospects')
        .select('*')
        .eq('source_type', 'meeting')
        .eq('team_id', teamId);

      if (onlyProspecting) {
        query = query.eq('is_prospecting', true);
      }

      query = query
        .not('status', 'eq', 'converted')
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return ((data as unknown as ProspectsRow[]) || []).map(mapRowToProspect);
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

      const { data, error } = await supabase
        .from('prospects')
        .select('*')
        .eq('source_type', 'meeting')
        .eq('team_id', teamId)
        .eq('source_event', sourceEvent)
        .order('full_name');

      if (error) throw error;
      return ((data as unknown as ProspectsRow[]) || []).map(mapRowToProspect);
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
        tenant_id: tenantId,
        source_type: 'meeting' as const,
        source_id: teamId,
        team_id: teamId,
        full_name: p.full_name,
        company: p.company,
        position: p.position,
        industry: p.industry,
        source_event: sourceEvent,
        source_file_name: sourceFileName,
        imported_by: userId,
        is_prospecting: true,
        status: 'new',
      }));

      const { error } = await supabase
        .from('prospects')
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
      prospecting_status,
      prospecting_notes,
      ...rest
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
      const updates: Record<string, unknown> = { ...rest };
      if (prospecting_status !== undefined) updates.status = prospecting_status;
      if (prospecting_notes !== undefined) updates.notes = prospecting_notes;

      const { error } = await supabase
        .from('prospects')
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
      const { error } = await supabase
        .from('prospects')
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
