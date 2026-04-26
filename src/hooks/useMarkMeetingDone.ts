import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Sprint S5 — UNIFY-MEETING-OUTCOME
 *
 * API GO/NO-GO mapowane na pełen zestaw `decision_type` w `meeting_decisions`,
 * który wyzwala trigger `apply_meeting_decision` (rozszerzony w S5 o `pivot`/`nurture`).
 *
 *   go                       → decision_type = 'go'
 *   no_go + cold             → decision_type = 'pivot'
 *   no_go + postponed        → decision_type = 'push'
 *   no_go + nurture          → decision_type = 'nurture'
 *   no_go + lost             → decision_type = 'kill'
 */

export type NoGoPath = 'cold' | 'postponed' | 'nurture' | 'lost';

export type MarkMeetingDoneInput = {
  dealTeamContactId: string;
  meetingDate?: string; // ISO yyyy-MM-dd; default today
  meetingNotes?: string;
  decision: 'go' | 'no_go';
  noGoPath?: NoGoPath;
  /** ISO yyyy-MM-dd. Wymagane dla noGoPath='postponed'. */
  postponedUntil?: string;
  /** ISO yyyy-MM-dd. Opcjonalne dla 'go'. */
  nextActionDate?: string;
  /** Wymagane dla noGoPath='lost'. */
  lostReason?: string;
  /** Opcjonalny task do zamknięcia po decyzji (jeśli decision_type IN go/dead/kill/pivot). */
  followUpTaskId?: string | null;
};

type DecisionType = 'go' | 'push' | 'pivot' | 'nurture' | 'kill';

function mapToDecisionType(input: MarkMeetingDoneInput): DecisionType {
  if (input.decision === 'go') return 'go';
  if (!input.noGoPath) throw new Error('useMarkMeetingDone: brak noGoPath dla decision=no_go');
  switch (input.noGoPath) {
    case 'cold': return 'pivot';
    case 'postponed': return 'push';
    case 'nurture': return 'nurture';
    case 'lost': return 'kill';
  }
}

export function useMarkMeetingDone() {
  const qc = useQueryClient();
  const { user, director, assistant } = useAuth();
  const authUserId = user?.id;
  const tenantHint = director?.tenant_id || assistant?.tenant_id;

  return useMutation({
    mutationFn: async (input: MarkMeetingDoneInput) => {
      if (!authUserId) throw new Error('Brak zalogowanego użytkownika');

      const decisionType = mapToDecisionType(input);
      const today = format(new Date(), 'yyyy-MM-dd');
      const meetingDate = input.meetingDate ?? today;
      const notes = input.meetingNotes?.trim() || null;

      // Walidacje per ścieżka (mirror trigger semantyki)
      if (input.decision === 'no_go' && input.noGoPath === 'postponed' && !input.postponedUntil) {
        throw new Error('Termin odroczenia wymagany');
      }
      if (input.decision === 'no_go' && input.noGoPath === 'lost' && !input.lostReason?.trim()) {
        throw new Error('Powód utraty wymagany');
      }

      // Pobierz tenant/team/prev state z dtc (zgodnie z patternem useCreateMeetingDecision).
      const { data: dtc, error: fetchErr } = await supabase
        .from('deal_team_contacts')
        .select('tenant_id, team_id, category, offering_stage, temperature')
        .eq('id', input.dealTeamContactId)
        .maybeSingle();
      if (fetchErr) throw fetchErr;
      if (!dtc) throw new Error('Kontakt nie znaleziony');

      const insertPayload = {
        tenant_id: dtc.tenant_id ?? tenantHint!,
        team_id: dtc.team_id,
        deal_team_contact_id: input.dealTeamContactId,
        decision_type: decisionType,
        meeting_date: meetingDate,
        notes,
        next_action_date:
          decisionType === 'go' ? (input.nextActionDate ?? today) : null,
        postponed_until:
          decisionType === 'push' ? (input.postponedUntil ?? null) : null,
        dead_reason: decisionType === 'kill' ? (input.lostReason!.trim()) : null,
        prev_category: dtc.category,
        prev_offering_stage: dtc.offering_stage ?? null,
        prev_temperature: dtc.temperature ?? null,
        follow_up_task_id: input.followUpTaskId ?? null,
        created_by: authUserId,
      };

      const { error: insErr } = await supabase
        .from('meeting_decisions')
        .insert(insertPayload);
      if (insErr) throw insErr;

      return { dealTeamContactId: input.dealTeamContactId, decisionType };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['deal-team-contacts'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['odprawa-agenda'] });
      qc.invalidateQueries({ queryKey: ['meeting-decisions', res.dealTeamContactId] });
      qc.invalidateQueries({ queryKey: ['unified-kanban-data'] });
      toast.success('Decyzja zapisana');
    },
    onError: (err: Error) => {
      toast.error(`Błąd: ${err.message}`);
    },
  });
}
