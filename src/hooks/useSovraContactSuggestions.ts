import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useState, useCallback, useMemo } from 'react';

// ─── Types ──────────────────────────────────────────────
export interface ContactSuggestion {
  contact_id: string;
  full_name: string;
  company: string | null;
  position: string | null;
  similarity: number;
  reason: string | null;
}

// ─── Hooks ──────────────────────────────────────────────

export function useSuggestContacts(projectId: string | undefined) {
  return useQuery({
    queryKey: ['sovra-suggestions', projectId],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sovra-suggest-contacts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ project_id: projectId, limit: 5 }),
        }
      );

      if (!res.ok) {
        if (res.status === 429) throw new Error('Rate limit exceeded');
        throw new Error('Failed to fetch suggestions');
      }

      const data = await res.json();
      return (data.suggestions || []) as ContactSuggestion[];
    },
    enabled: !!projectId,
    staleTime: 10 * 60 * 1000, // 10 min cache
    retry: 1,
  });
}

export function useAddSuggestedContact() {
  const queryClient = useQueryClient();
  const { director } = useAuth();

  return useMutation({
    mutationFn: async ({ projectId, contactId }: { projectId: string; contactId: string }) => {
      const { data, error } = await supabase
        .from('project_contacts')
        .insert({
          project_id: projectId,
          contact_id: contactId,
          role_in_project: 'Sugerowany przez Sovra',
          tenant_id: director!.tenant_id,
          added_by: director!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['sovra-suggestions', vars.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-contacts', vars.projectId] });
      toast.success('Dodano kontakt do projektu');
    },
    onError: () => {
      toast.error('Błąd podczas dodawania kontaktu');
    },
  });
}

export function useDismissSuggestion() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const dismiss = useCallback((contactId: string) => {
    setDismissed((prev) => new Set(prev).add(contactId));
  }, []);

  const filterSuggestions = useCallback(
    (suggestions: ContactSuggestion[]) => suggestions.filter((s) => !dismissed.has(s.contact_id)),
    [dismissed]
  );

  return { dismiss, filterSuggestions, dismissedCount: dismissed.size };
}

export function useRegenerateEmbeddings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (type: 'projects' | 'contacts' = 'projects') => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sovra-generate-embeddings`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ type }),
        }
      );

      if (!res.ok) {
        if (res.status === 429) throw new Error('Rate limit exceeded');
        throw new Error('Failed to generate embeddings');
      }

      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sovra-suggestions'] });
      toast.success(`Sovra przygotowała analizę: ${data.processed} rekordów`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Błąd podczas generowania analizy');
    },
  });
}
