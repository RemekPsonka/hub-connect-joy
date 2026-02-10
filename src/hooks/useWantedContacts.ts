import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface WantedContact {
  id: string;
  tenant_id: string;
  requested_by_contact_id: string;
  person_name: string | null;
  person_position: string | null;
  person_email: string | null;
  person_phone: string | null;
  person_linkedin: string | null;
  person_context: string | null;
  company_name: string | null;
  company_nip: string | null;
  company_regon: string | null;
  company_industry: string | null;
  company_id: string | null;
  company_context: string | null;
  search_context: string | null;
  description: string | null;
  notes: string | null;
  urgency: string;
  status: string;
  matched_contact_id: string | null;
  matched_by: string | null;
  matched_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  fulfilled_at: string | null;
  expires_at: string | null;
  // Joined
  requested_by_contact?: { id: string; full_name: string; company: string | null };
  matched_contact?: { id: string; full_name: string; company: string | null } | null;
  created_by_director?: { id: string; full_name: string } | null;
}

export interface WantedContactFilters {
  status?: string;
  urgency?: string;
  search?: string;
}

export function useWantedContacts(filters?: WantedContactFilters) {
  return useQuery({
    queryKey: ['wanted-contacts', filters],
    queryFn: async () => {
      let query = supabase
        .from('wanted_contacts')
        .select(`
          *,
          requested_by_contact:contacts!wanted_contacts_requested_by_contact_id_fkey(id, full_name, company),
          matched_contact:contacts!wanted_contacts_matched_contact_id_fkey(id, full_name, company),
          created_by_director:directors!wanted_contacts_created_by_fkey(id, full_name)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        if (filters.status === 'expired') {
          query = query.eq('status', 'expired');
        } else {
          query = query.eq('status', filters.status);
        }
      } else if (!filters?.status || filters.status === 'all') {
        // Default: hide expired from "all"
        query = query.neq('status', 'expired');
      }
      if (filters?.urgency && filters.urgency !== 'all') {
        query = query.eq('urgency', filters.urgency);
      }
      if (filters?.search) {
        query = query.or(`person_name.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%,person_context.ilike.%${filters.search}%,company_context.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as WantedContact[];
    },
  });
}

export function useContactWantedContacts(contactId: string | undefined) {
  return useQuery({
    queryKey: ['wanted-contacts', 'contact', contactId],
    enabled: !!contactId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wanted_contacts')
        .select(`
          *,
          requested_by_contact:contacts!wanted_contacts_requested_by_contact_id_fkey(id, full_name, company),
          matched_contact:contacts!wanted_contacts_matched_contact_id_fkey(id, full_name, company),
          created_by_director:directors!wanted_contacts_created_by_fkey(id, full_name)
        `)
        .eq('requested_by_contact_id', contactId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as WantedContact[];
    },
  });
}

export function useCreateWantedContact() {
  const qc = useQueryClient();
  const { director } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      requested_by_contact_id: string;
      person_name?: string | null;
      person_position?: string | null;
      person_email?: string | null;
      person_phone?: string | null;
      person_linkedin?: string | null;
      person_context?: string | null;
      company_name?: string | null;
      company_nip?: string | null;
      company_regon?: string | null;
      company_industry?: string | null;
      company_id?: string | null;
      company_context?: string | null;
      search_context?: string | null;
      description?: string | null;
      notes?: string | null;
      urgency?: string;
      expires_at?: string | null;
    }) => {
      if (!director) throw new Error('Brak dyrektora');
      const { data, error } = await supabase
        .from('wanted_contacts')
        .insert({
          ...input,
          tenant_id: director.tenant_id,
          created_by: director.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wanted-contacts'] });
      toast.success('Dodano poszukiwany kontakt');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateWantedContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<WantedContact>) => {
      const { error } = await supabase
        .from('wanted_contacts')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wanted-contacts'] });
      toast.success('Zaktualizowano');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteWantedContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('wanted_contacts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wanted-contacts'] });
      toast.success('Usunięto');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useMatchWantedContact() {
  const qc = useQueryClient();
  const { director } = useAuth();

  return useMutation({
    mutationFn: async ({ wantedId, contactId }: { wantedId: string; contactId: string }) => {
      if (!director) throw new Error('Brak dyrektora');
      const { error } = await supabase
        .from('wanted_contacts')
        .update({
          matched_contact_id: contactId,
          matched_by: director.id,
          matched_at: new Date().toISOString(),
          status: 'fulfilled',
        })
        .eq('id', wantedId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wanted-contacts'] });
      toast.success('Dopasowano kontakt!');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCompanyByNip(nip: string | null) {
  return useQuery({
    queryKey: ['company-by-nip', nip],
    enabled: !!nip && nip.length >= 10,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, industry, nip')
        .eq('nip', nip!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useWantedAISuggestions(industry: string | null) {
  return useQuery({
    queryKey: ['wanted-ai-suggestions', industry],
    enabled: !!industry,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, full_name, company, position')
        .or(`company.ilike.%${industry}%`)
        .limit(5);
      if (error) throw error;
      return data;
    },
  });
}

// Sharing hooks
export function useWantedContactShares(wantedId: string | undefined) {
  return useQuery({
    queryKey: ['wanted-contact-shares', wantedId],
    enabled: !!wantedId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wanted_contact_shares')
        .select(`
          *,
          shared_with_director:directors!wanted_contact_shares_shared_with_director_id_fkey(id, full_name),
          shared_with_team:deal_teams!wanted_contact_shares_shared_with_team_id_fkey(id, name)
        `)
        .eq('wanted_contact_id', wantedId!);
      if (error) throw error;
      return data;
    },
  });
}

export function useShareWantedContact() {
  const qc = useQueryClient();
  const { director } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      wanted_contact_id: string;
      shared_with_director_id?: string | null;
      shared_with_team_id?: string | null;
      permission?: string;
    }) => {
      if (!director) throw new Error('Brak dyrektora');
      const { error } = await supabase.from('wanted_contact_shares').insert({
        ...input,
        tenant_id: director.tenant_id,
        shared_by_director_id: director.id,
        permission: input.permission || 'read',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wanted-contact-shares'] });
      toast.success('Udostępniono');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRevokeWantedContactShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (shareId: string) => {
      const { error } = await supabase.from('wanted_contact_shares').delete().eq('id', shareId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wanted-contact-shares'] });
      toast.success('Cofnięto udostępnienie');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
