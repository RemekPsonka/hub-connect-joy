import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type DecisionVerdict = 'push' | 'pivot' | 'park' | 'kill';
export type MilestoneVariant = 'k1' | 'k2' | 'k2+' | 'k3' | 'k4';

export interface LogDecisionInput {
  contactId: string;
  teamId: string;
  tenantId: string;
  decision: DecisionVerdict;
  milestoneVariant: MilestoneVariant;
  odprawaSessionId: string | null;
  notes?: string | null;
  postponedUntil?: string | null;
  deadReason?: string | null;
}

export function useLogDecision() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: LogDecisionInput) => {
      if (!user?.id) throw new Error('Brak zalogowanego użytkownika');

      // Pre-read aktualnego stanu kontaktu (audit trail prev_*)
      const { data: contact, error: readErr } = await supabase
        .from('deal_team_contacts')
        .select('category, offering_stage, temperature')
        .eq('id', input.contactId)
        .maybeSingle();
      if (readErr) throw readErr;

      const { error } = await supabase.from('meeting_decisions').insert({
        tenant_id: input.tenantId,
        team_id: input.teamId,
        deal_team_contact_id: input.contactId,
        decision_type: input.decision,
        milestone_variant: input.milestoneVariant,
        odprawa_session_id: input.odprawaSessionId,
        meeting_date: new Date().toISOString().slice(0, 10),
        notes: input.notes ?? null,
        postponed_until:
          input.decision === 'park' ? input.postponedUntil ?? null : null,
        dead_reason:
          input.decision === 'kill' ? input.deadReason ?? null : null,
        prev_category: contact?.category ?? null,
        prev_offering_stage: contact?.offering_stage ?? null,
        prev_temperature: contact?.temperature ?? null,
        created_by: user.id,
      });
      if (error) throw error;

      return { contactId: input.contactId, teamId: input.teamId };
    },
    onSuccess: ({ contactId, teamId }) => {
      qc.invalidateQueries({ queryKey: ['odprawa-agenda'] });
      qc.invalidateQueries({ queryKey: ['decision-history', contactId] });
      qc.invalidateQueries({ queryKey: ['team-contacts', teamId] });
      qc.invalidateQueries({ queryKey: ['meeting-decisions', contactId] });
    },
    onError: (e: Error) => {
      toast.error(`Nie udało się zapisać decyzji: ${e.message}`);
    },
  });
}
