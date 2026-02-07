import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ContactShare {
  id: string;
  contact_id: string;
  shared_with_director_id: string;
  shared_by_director_id: string;
  permission: 'read' | 'write';
  created_at: string;
  shared_with_director?: { id: string; full_name: string; email: string } | null;
}

export function useContactShares(contactId: string | undefined) {
  const { director } = useAuth();

  return useQuery({
    queryKey: ['contact-shares', contactId],
    queryFn: async () => {
      if (!contactId) return [];
      const { data, error } = await supabase
        .from('contact_shares')
        .select('id, contact_id, shared_with_director_id, shared_by_director_id, permission, created_at')
        .eq('contact_id', contactId);
      if (error) throw error;

      // Fetch director names for each share
      if (!data?.length) return [];
      const directorIds = [...new Set(data.map(s => s.shared_with_director_id))];
      const { data: directors } = await supabase
        .from('directors')
        .select('id, full_name, email')
        .in('id', directorIds);

      const directorMap = new Map(directors?.map(d => [d.id, d]) || []);

      return data.map(share => ({
        ...share,
        shared_with_director: directorMap.get(share.shared_with_director_id) || null,
      })) as ContactShare[];
    },
    enabled: !!contactId && !!director,
  });
}

export function useShareContact() {
  const queryClient = useQueryClient();
  const { director } = useAuth();

  return useMutation({
    mutationFn: async ({
      contactId,
      directorId,
      permission = 'read',
    }: {
      contactId: string;
      directorId: string;
      permission?: 'read' | 'write';
    }) => {
      if (!director) throw new Error('Nie znaleziono dyrektora');
      const { error } = await supabase.from('contact_shares').insert({
        tenant_id: director.tenant_id,
        contact_id: contactId,
        shared_with_director_id: directorId,
        shared_by_director_id: director.id,
        permission,
      });
      if (error) {
        if (error.code === '23505') throw new Error('Kontakt już udostępniony temu dyrektorowi');
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contact-shares', variables.contactId] });
      toast.success('Kontakt udostępniony');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Błąd udostępniania kontaktu');
    },
  });
}

export function useRevokeContactShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ shareId, contactId }: { shareId: string; contactId: string }) => {
      const { error } = await supabase.from('contact_shares').delete().eq('id', shareId);
      if (error) throw error;
      return contactId;
    },
    onSuccess: (contactId) => {
      queryClient.invalidateQueries({ queryKey: ['contact-shares', contactId] });
      toast.success('Udostępnienie cofnięte');
    },
    onError: () => {
      toast.error('Błąd cofania udostępnienia');
    },
  });
}
