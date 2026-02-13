import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PaymentScheduleEntry {
  id: string;
  team_contact_id: string;
  client_product_id: string | null;
  team_id: string;
  tenant_id: string;
  scheduled_date: string;
  amount: number;
  currency: string;
  description: string | null;
  payment_type: 'recurring' | 'one_time' | 'lump_sum';
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export function usePaymentSchedule(teamContactId: string | undefined) {
  return useQuery({
    queryKey: ['payment-schedule', teamContactId],
    queryFn: async () => {
      if (!teamContactId) return [];
      const { data, error } = await (supabase as any)
        .from('deal_team_payment_schedule')
        .select('*')
        .eq('team_contact_id', teamContactId)
        .order('scheduled_date');
      if (error) throw error;
      return (data || []) as PaymentScheduleEntry[];
    },
    enabled: !!teamContactId,
  });
}

export function useTeamPaymentSchedule(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team-payment-schedule', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const { data, error } = await (supabase as any)
        .from('deal_team_payment_schedule')
        .select('*')
        .eq('team_id', teamId)
        .order('scheduled_date');
      if (error) throw error;
      return (data || []) as PaymentScheduleEntry[];
    },
    enabled: !!teamId,
  });
}

export function useAddPayment() {
  const qc = useQueryClient();
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;

  return useMutation({
    mutationFn: async (input: {
      teamContactId: string;
      teamId: string;
      clientProductId?: string;
      scheduledDate: string;
      amount: number;
      currency?: string;
      description?: string;
      paymentType?: 'recurring' | 'one_time' | 'lump_sum';
    }) => {
      if (!tenantId) throw new Error('Brak tenant_id');
      const { error } = await (supabase as any)
        .from('deal_team_payment_schedule')
        .insert({
          team_contact_id: input.teamContactId,
          team_id: input.teamId,
          client_product_id: input.clientProductId || null,
          tenant_id: tenantId,
          scheduled_date: input.scheduledDate,
          amount: input.amount,
          currency: input.currency || 'PLN',
          description: input.description || null,
          payment_type: input.paymentType || 'recurring',
        });
      if (error) throw error;
      return { teamContactId: input.teamContactId, teamId: input.teamId };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['payment-schedule', r.teamContactId] });
      qc.invalidateQueries({ queryKey: ['team-payment-schedule', r.teamId] });
      toast.success('Płatność dodana do harmonogramu');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeletePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; teamContactId: string; teamId: string }) => {
      const { error } = await (supabase as any)
        .from('deal_team_payment_schedule')
        .delete()
        .eq('id', input.id);
      if (error) throw error;
      return input;
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['payment-schedule', r.teamContactId] });
      qc.invalidateQueries({ queryKey: ['team-payment-schedule', r.teamId] });
      toast.success('Płatność usunięta');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useMarkPaymentPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; teamContactId: string; teamId: string; isPaid: boolean }) => {
      const { error } = await (supabase as any)
        .from('deal_team_payment_schedule')
        .update({
          is_paid: input.isPaid,
          paid_at: input.isPaid ? new Date().toISOString() : null,
        })
        .eq('id', input.id);
      if (error) throw error;
      return input;
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['payment-schedule', r.teamContactId] });
      qc.invalidateQueries({ queryKey: ['team-payment-schedule', r.teamId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
