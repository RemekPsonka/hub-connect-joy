import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────

export interface PipelineStage {
  id: string;
  team_id: string;
  tenant_id: string;
  stage_key: string;
  kanban_type: 'main' | 'sub' | 'workflow';
  parent_stage_key: string | null;
  label: string;
  icon: string;
  color: string;
  position: number;
  is_default: boolean;
  section: string | null;
  created_at: string;
  updated_at: string;
}

export interface PipelineTransition {
  id: string;
  team_id: string;
  tenant_id: string;
  from_stage_id: string;
  to_stage_id: string;
  kanban_type: string;
  label: string | null;
  is_active: boolean;
  created_at: string;
}

// ─── Queries ────────────────────────────────────────────────

export function usePipelineStages(teamId: string | undefined, kanbanType?: string) {
  return useQuery({
    queryKey: ['pipeline-stages', teamId, kanbanType || 'all'],
    queryFn: async () => {
      if (!teamId) return [];
      let query = supabase
        .from('pipeline_stages')
        .select('*')
        .eq('team_id', teamId)
        .order('position', { ascending: true });

      if (kanbanType) {
        query = query.eq('kanban_type', kanbanType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as PipelineStage[];
    },
    enabled: !!teamId,
  });
}

export function usePipelineTransitions(teamId: string | undefined, kanbanType?: string) {
  return useQuery({
    queryKey: ['pipeline-transitions', teamId, kanbanType || 'all'],
    queryFn: async () => {
      if (!teamId) return [];
      let query = supabase
        .from('pipeline_transitions')
        .select('*')
        .eq('team_id', teamId)
        .eq('is_active', true);

      if (kanbanType) {
        query = query.eq('kanban_type', kanbanType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as PipelineTransition[];
    },
    enabled: !!teamId,
  });
}

/**
 * Returns set of allowed target stage_keys from a given stage.
 * If no transitions defined, returns null (= all allowed).
 */
export function useAllowedTransitions(
  teamId: string | undefined,
  currentStageKey: string | undefined,
  kanbanType: string
) {
  const { data: stages = [] } = usePipelineStages(teamId, kanbanType);
  const { data: transitions = [] } = usePipelineTransitions(teamId, kanbanType);

  if (!transitions.length) return null; // No restrictions

  const currentStage = stages.find(s => s.stage_key === currentStageKey);
  if (!currentStage) return null;

  const allowedStageIds = new Set(
    transitions
      .filter(t => t.from_stage_id === currentStage.id)
      .map(t => t.to_stage_id)
  );

  const allowedKeys = new Set(
    stages.filter(s => allowedStageIds.has(s.id)).map(s => s.stage_key)
  );

  return allowedKeys;
}

// ─── Mutations ──────────────────────────────────────────────

export function useUpsertPipelineStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (stage: Partial<PipelineStage> & { team_id: string; tenant_id: string; stage_key: string; kanban_type: string; label: string }) => {
      const { data, error } = await supabase
        .from('pipeline_stages')
        .upsert(stage, { onConflict: 'team_id,kanban_type,stage_key' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['pipeline-stages', vars.team_id] });
      toast.success('Etap zapisany');
    },
    onError: () => toast.error('Nie udało się zapisać etapu'),
  });
}

export function useDeletePipelineStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, teamId }: { id: string; teamId: string }) => {
      const { error } = await supabase.from('pipeline_stages').delete().eq('id', id);
      if (error) throw error;
      return teamId;
    },
    onSuccess: (teamId) => {
      qc.invalidateQueries({ queryKey: ['pipeline-stages', teamId] });
      toast.success('Etap usunięty');
    },
    onError: () => toast.error('Nie udało się usunąć etapu'),
  });
}

export function useUpsertTransition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (transition: {
      team_id: string;
      tenant_id: string;
      from_stage_id: string;
      to_stage_id: string;
      kanban_type: string;
      label?: string;
    }) => {
      const { data, error } = await supabase
        .from('pipeline_transitions')
        .upsert(transition, { onConflict: 'team_id,from_stage_id,to_stage_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['pipeline-transitions', vars.team_id] });
    },
  });
}

export function useDeleteTransition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, teamId }: { id: string; teamId: string }) => {
      const { error } = await supabase.from('pipeline_transitions').delete().eq('id', id);
      if (error) throw error;
      return teamId;
    },
    onSuccess: (teamId) => {
      qc.invalidateQueries({ queryKey: ['pipeline-transitions', teamId] });
    },
  });
}

export function useSeedPipelineStages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ teamId, tenantId }: { teamId: string; tenantId: string }) => {
      const { error } = await supabase.rpc('seed_pipeline_stages_for_team', {
        p_team_id: teamId,
        p_tenant_id: tenantId,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['pipeline-stages', vars.teamId] });
      toast.success('Domyślne etapy wczytane');
    },
    onError: () => toast.error('Nie udało się wczytać domyślnych etapów'),
  });
}
