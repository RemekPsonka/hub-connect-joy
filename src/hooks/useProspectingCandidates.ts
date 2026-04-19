import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProspectingCandidate {
  id: string;
  source: string;
  source_job_id: string | null;
  krs_number: string | null;
  nip: string | null;
  name: string;
  address_city: string | null;
  address_street: string | null;
  pkd_codes: string[] | null;
  primary_pkd: string | null;
  employees_estimate: number | null;
  founded_year: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  status: 'pending_review' | 'added_as_lead' | 'rejected' | 'duplicate';
  ai_score: number | null;
  ai_reasoning: string | null;
  ai_model: string | null;
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface CandidatesFilters {
  jobId?: string | null;
  status?: ProspectingCandidate['status'];
}

export function useProspectingCandidates(filters: CandidatesFilters = {}) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['sgu-prospecting-candidates', filters],
    queryFn: async (): Promise<ProspectingCandidate[]> => {
      let q = supabase
        .from('sgu_prospecting_candidates')
        .select('*')
        .order('ai_score', { ascending: false, nullsFirst: false })
        .limit(500);

      if (filters.jobId) q = q.eq('source_job_id', filters.jobId);
      if (filters.status) q = q.eq('status', filters.status);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ProspectingCandidate[];
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async (candidateId: string) => {
      const { data, error } = await supabase.rpc('rpc_sgu_accept_prospecting_candidate', {
        p_candidate_id: candidateId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sgu-prospecting-candidates'] });
      qc.invalidateQueries({ queryKey: ['sgu-prospects'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ candidateId, reason }: { candidateId: string; reason?: string }) => {
      const { error } = await supabase.rpc('rpc_sgu_reject_prospecting_candidate', {
        p_candidate_id: candidateId,
        p_reason: reason ?? undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sgu-prospecting-candidates'] });
    },
  });

  const acceptBulk = async (ids: string[]) => {
    let ok = 0;
    let fail = 0;
    for (const id of ids) {
      try {
        await acceptMutation.mutateAsync(id);
        ok++;
      } catch {
        fail++;
      }
    }
    toast.success(`Zaakceptowano: ${ok}${fail > 0 ? ` (błędów: ${fail})` : ''}`);
  };

  const rejectBulk = async (ids: string[], reason?: string) => {
    let ok = 0;
    let fail = 0;
    for (const id of ids) {
      try {
        await rejectMutation.mutateAsync({ candidateId: id, reason });
        ok++;
      } catch {
        fail++;
      }
    }
    toast.success(`Odrzucono: ${ok}${fail > 0 ? ` (błędów: ${fail})` : ''}`);
  };

  return { ...query, acceptMutation, rejectMutation, acceptBulk, rejectBulk };
}
