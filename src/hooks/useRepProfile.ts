import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { SGURepresentativeProfile } from '@/types/sgu-representative';

export function useRepProfile(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['sgu-rep-profile', userId],
    enabled: !!userId,
    queryFn: async (): Promise<SGURepresentativeProfile | null> => {
      const { data, error } = await supabase
        .from('sgu_representative_profiles')
        .select('*')
        .eq('user_id', userId!)
        .maybeSingle();
      if (error) throw error;
      return (data as SGURepresentativeProfile | null);
    },
  });
}

export function useUpdateRepProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      patch,
    }: {
      userId: string;
      patch: Partial<Pick<SGURepresentativeProfile, 'phone' | 'region' | 'notes' | 'first_name' | 'last_name' | 'team_id'>>;
    }) => {
      const { error } = await supabase
        .from('sgu_representative_profiles')
        .update(patch)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Profil zaktualizowany');
      qc.invalidateQueries({ queryKey: ['sgu-rep-profile'] });
      qc.invalidateQueries({ queryKey: ['sgu-representatives'] });
    },
    onError: (e: Error) => toast.error(`Błąd zapisu: ${e.message}`),
  });
}

interface CommissionOverrideRow {
  id: string;
  share_pct: number;
  active_from: string;
  active_to: string | null;
}

export function useRepCommissionOverride(userId: string | null | undefined, tenantId: string | null | undefined) {
  return useQuery({
    queryKey: ['sgu-rep-commission', userId, tenantId],
    enabled: !!userId && !!tenantId,
    queryFn: async (): Promise<CommissionOverrideRow | null> => {
      const { data, error } = await supabase
        .from('commission_base_split')
        .select('id, share_pct, active_from, active_to')
        .eq('tenant_id', tenantId!)
        .eq('role_key', `rep:${userId}`)
        .is('active_to', null)
        .maybeSingle();
      if (error) throw error;
      return data as CommissionOverrideRow | null;
    },
  });
}

export function useSetRepCommissionOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      tenantId,
      sharePct,
    }: {
      userId: string;
      tenantId: string;
      sharePct: number;
    }) => {
      // Close existing active override
      const { error: closeErr } = await supabase
        .from('commission_base_split')
        .update({ active_to: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .eq('role_key', `rep:${userId}`)
        .is('active_to', null);
      if (closeErr) throw closeErr;

      const { data: { user } } = await supabase.auth.getUser();
      const { error: insErr } = await supabase.from('commission_base_split').insert({
        tenant_id: tenantId,
        role_key: `rep:${userId}`,
        recipient_user_id: userId,
        share_pct: sharePct,
        active_from: new Date().toISOString(),
        created_by_user_id: user?.id ?? null,
      });
      if (insErr) throw insErr;
    },
    onSuccess: () => {
      toast.success('Stawka prowizji zaktualizowana');
      qc.invalidateQueries({ queryKey: ['sgu-rep-commission'] });
    },
    onError: (e: Error) => toast.error(`Błąd zapisu prowizji: ${e.message}`),
  });
}
