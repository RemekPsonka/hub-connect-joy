import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { OdprawaAgendaRow } from './useOdprawaAgenda';

export type OdprawaSession = {
  id: string;
  team_id: string;
  started_by: string;
  started_at: string;
  ended_at: string | null;
  status: 'active' | 'completed' | 'abandoned';
  mode: string;
  agenda_snapshot: OdprawaAgendaRow[];
  notes: string | null;
};

export function useActiveOdprawaSession(teamId: string | null | undefined) {
  return useQuery({
    queryKey: ['odprawa-active-session', teamId],
    enabled: !!teamId,
    queryFn: async (): Promise<OdprawaSession | null> => {
      const { data, error } = await supabase
        .from('odprawa_sessions')
        .select('*')
        .eq('team_id', teamId as string)
        .eq('status', 'active')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        agenda_snapshot: (data.agenda_snapshot ?? []) as unknown as OdprawaAgendaRow[],
      } as OdprawaSession;
    },
    staleTime: 10_000,
  });
}

export function useStartOdprawa() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (params: { teamId: string; agenda: OdprawaAgendaRow[]; mode?: string }) => {
      if (!user?.id) throw new Error('Brak zalogowanego użytkownika');
      const { data, error } = await supabase
        .from('odprawa_sessions')
        .insert({
          team_id: params.teamId,
          started_by: user.id,
          mode: params.mode ?? 'standard',
          agenda_snapshot: params.agenda as unknown as never,
          status: 'active',
        })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['odprawa-active-session', vars.teamId] });
    },
  });
}

export function useFinishOdprawa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { sessionId: string; teamId: string; notes?: string }) => {
      const { error } = await supabase
        .from('odprawa_sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          notes: params.notes ?? null,
        })
        .eq('id', params.sessionId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['odprawa-active-session', vars.teamId] });
    },
  });
}
