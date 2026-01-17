import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

export type Match = Tables<'matches'>;

export interface EnrichedMatch {
  id: string;
  needId: string;
  needTitle: string;
  needDescription: string | null;
  needContactId: string;
  needContactName: string;
  needContactCompany: string | null;
  offerId: string;
  offerTitle: string;
  offerDescription: string | null;
  offerContactId: string;
  offerContactName: string;
  offerContactCompany: string | null;
  similarityScore: number;
  aiExplanation: string | null;
  status: string;
  createdAt: string;
}

export function useMatches(options: { status?: string; limit?: number } = {}) {
  const { director } = useAuth();
  const { status, limit = 50 } = options;

  return useQuery({
    queryKey: ['matches', director?.tenant_id, status, limit],
    queryFn: async (): Promise<EnrichedMatch[]> => {
      if (!director?.tenant_id) return [];

      let query = supabase
        .from('matches')
        .select(`
          *,
          needs!matches_need_id_fkey(
            id,
            title,
            description,
            contact_id,
            contacts!needs_contact_id_fkey(full_name, company)
          ),
          offers!matches_offer_id_fkey(
            id,
            title,
            description,
            contact_id,
            contacts!offers_contact_id_fkey(full_name, company)
          )
        `)
        .eq('tenant_id', director.tenant_id)
        .order('similarity_score', { ascending: false })
        .limit(limit);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((match: any) => ({
        id: match.id,
        needId: match.need_id,
        needTitle: match.needs?.title || 'Brak tytułu',
        needDescription: match.needs?.description,
        needContactId: match.needs?.contact_id,
        needContactName: match.needs?.contacts?.full_name || 'Nieznany',
        needContactCompany: match.needs?.contacts?.company,
        offerId: match.offer_id,
        offerTitle: match.offers?.title || 'Brak tytułu',
        offerDescription: match.offers?.description,
        offerContactId: match.offers?.contact_id,
        offerContactName: match.offers?.contacts?.full_name || 'Nieznany',
        offerContactCompany: match.offers?.contacts?.company,
        similarityScore: match.similarity_score || 0,
        aiExplanation: match.ai_explanation,
        status: match.status || 'pending',
        createdAt: match.created_at,
      }));
    },
    enabled: !!director?.tenant_id,
  });
}

export function useFindNewMatches() {
  const { director } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options: { threshold?: number; limit?: number } = {}) => {
      const { data, error } = await supabase.functions.invoke('find-matches', {
        body: {
          threshold: options.threshold ?? 0.65,
          limit: options.limit ?? 50,
        },
      });

      if (error) throw error;

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      toast.success(`Znaleziono ${data.count || 0} nowych dopasowań`);
    },
    onError: (error) => {
      console.error('Error finding matches:', error);
      toast.error('Nie udało się znaleźć dopasowań');
    },
  });
}

export function useUpdateMatchStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'accepted' | 'rejected' | 'pending' }) => {
      const { data, error } = await supabase
        .from('matches')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      const statusLabel = variables.status === 'accepted' ? 'zaakceptowane' : 
                         variables.status === 'rejected' ? 'odrzucone' : 'oczekujące';
      toast.success(`Dopasowanie oznaczone jako ${statusLabel}`);
    },
    onError: (error) => {
      console.error('Error updating match:', error);
      toast.error('Nie udało się zaktualizować statusu');
    },
  });
}

export function useSaveMatch() {
  const { director } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (match: {
      need_id: string;
      offer_id: string;
      similarity_score: number;
      ai_explanation?: string;
    }) => {
      if (!director?.tenant_id) throw new Error('Brak tenant_id');

      const { data, error } = await supabase
        .from('matches')
        .insert({
          ...match,
          tenant_id: director.tenant_id,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
    onError: (error) => {
      console.error('Error saving match:', error);
    },
  });
}
