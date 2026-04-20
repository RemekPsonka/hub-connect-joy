import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ClientReferralRow {
  id: string;
  referrer_deal_team_contact_id: string;
  referred_deal_team_contact_id: string | null;
  referred_name: string;
  referred_phone: string | null;
  referred_email: string | null;
  notes: string | null;
  status: string;
  created_at: string | null;
  tenant_id: string;
}

export function useClientReferrals(referrerId?: string) {
  return useQuery<ClientReferralRow[]>({
    queryKey: ['client-referrals', referrerId],
    enabled: !!referrerId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_referrals')
        .select('*')
        .eq('referrer_deal_team_contact_id', referrerId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ClientReferralRow[];
    },
  });
}

export function useAllClientReferrals(teamId?: string) {
  return useQuery<ClientReferralRow[]>({
    queryKey: ['client-referrals-team', teamId],
    enabled: !!teamId,
    staleTime: 60_000,
    queryFn: async () => {
      // Get clients first to scope referrals
      const { data: clients, error: cErr } = await supabase
        .from('deal_team_contacts')
        .select('id')
        .eq('team_id', teamId!)
        .eq('category', 'client');
      if (cErr) throw cErr;
      const ids = (clients ?? []).map((c) => c.id);
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from('client_referrals')
        .select('*')
        .in('referrer_deal_team_contact_id', ids)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ClientReferralRow[];
    },
  });
}

interface AddReferralInput {
  referrerId: string;
  referredName: string;
  referredPhone?: string;
  referredEmail?: string;
  notes?: string;
}

export function useAddClientReferral() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddReferralInput) => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error('Brak użytkownika');
      const { data: dirData, error: dErr } = await supabase
        .from('directors')
        .select('tenant_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (dErr) throw dErr;
      const tenantId = dirData?.tenant_id;
      if (!tenantId) throw new Error('Brak tenant_id');
      const { error } = await supabase.from('client_referrals').insert({
        referrer_deal_team_contact_id: input.referrerId,
        referred_name: input.referredName,
        referred_phone: input.referredPhone ?? null,
        referred_email: input.referredEmail ?? null,
        notes: input.notes ?? null,
        status: 'pending',
        tenant_id: tenantId,
        created_by_user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Polecenie dodane');
      qc.invalidateQueries({ queryKey: ['client-referrals'] });
      qc.invalidateQueries({ queryKey: ['client-referrals-team'] });
    },
    onError: (e: Error) => toast.error('Błąd', { description: e.message }),
  });
}

interface ConvertReferralInput {
  referralId: string;
  referrerId: string;
  teamId: string;
  contactId: string; // newly-created CRM contact id
}

export function useConvertReferral() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ConvertReferralInput) => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error('Brak użytkownika');
      const { data: dirData } = await supabase.from('directors').select('tenant_id').eq('user_id', userId).maybeSingle();
      const tenantId = dirData?.tenant_id;
      if (!tenantId) throw new Error('Brak tenant_id');

      const { data: dtc, error: insErr } = await supabase
        .from('deal_team_contacts')
        .insert({
          team_id: input.teamId,
          contact_id: input.contactId,
          category: 'cold',
          status: 'active',
          tenant_id: tenantId,
          prospect_source: 'manual',
          notes: `Z polecenia (referral_id: ${input.referralId})`,
        } as never)
        .select('id')
        .single();
      if (insErr) throw insErr;

      const { error: updErr } = await supabase
        .from('client_referrals')
        .update({
          status: 'added',
          referred_deal_team_contact_id: dtc!.id,
        })
        .eq('id', input.referralId);
      if (updErr) throw updErr;
    },
    onSuccess: () => {
      toast.success('Polecenie skonwertowane do prospektu');
      qc.invalidateQueries({ queryKey: ['client-referrals'] });
      qc.invalidateQueries({ queryKey: ['client-referrals-team'] });
      qc.invalidateQueries({ queryKey: ['deal-team-contacts'] });
      qc.invalidateQueries({ queryKey: ['sgu-clients-portfolio'] });
    },
    onError: (e: Error) => toast.error('Błąd', { description: e.message }),
  });
}
