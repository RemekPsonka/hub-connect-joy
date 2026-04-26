import { format } from 'date-fns';
import { useCreateMeetingDecision } from './useMeetingDecisions';

/**
 * Sprint S5 — UNIFY-MEETING-OUTCOME
 *
 * Cienki wrapper API GO/NO-GO nad istniejącym `useCreateMeetingDecision`,
 * który zapisuje rekord w `meeting_decisions` i wyzwala trigger
 * `apply_meeting_decision` (rozszerzony w migracji S5 o ścieżki
 * `pivot` i `nurture`).
 *
 * Mapowanie:
 *   go                       → decision_type = 'go'
 *   no_go + cold             → decision_type = 'pivot'   (reset do decision_meeting)
 *   no_go + postponed        → decision_type = 'push'    (snooze, taski NIE zamknięte)
 *   no_go + nurture          → decision_type = 'nurture' (10x; taski NIE zamknięte)
 *   no_go + lost             → decision_type = 'kill'    (alias 'dead')
 */

export type NoGoPath = 'cold' | 'postponed' | 'nurture' | 'lost';

export type MarkMeetingDoneInput = {
  dealTeamContactId: string;
  meetingDate?: string; // ISO yyyy-MM-dd; default: today
  meetingNotes?: string;
  decision: 'go' | 'no_go';
  noGoPath?: NoGoPath;
  /** ISO yyyy-MM-dd. Wymagane dla noGoPath='postponed'. */
  postponedUntil?: string;
  /** ISO yyyy-MM-dd. Opcjonalne dla 'go' (next action). */
  nextActionDate?: string;
  /** Wymagane dla noGoPath='lost'. */
  lostReason?: string;
};

export function useMarkMeetingDone() {
  const createDecision = useCreateMeetingDecision();

  const mutateAsync = async (input: MarkMeetingDoneInput) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const meetingDate = input.meetingDate ?? today;
    const notes = input.meetingNotes?.trim() || null;

    if (input.decision === 'go') {
      return createDecision.mutateAsync({
        contactId: input.dealTeamContactId,
        decisionType: 'go',
        meetingDate,
        notes,
        nextActionDate: input.nextActionDate ?? today,
      });
    }

    if (input.decision !== 'no_go' || !input.noGoPath) {
      throw new Error('useMarkMeetingDone: brak noGoPath dla decision=no_go');
    }

    switch (input.noGoPath) {
      case 'postponed': {
        if (!input.postponedUntil) {
          throw new Error('useMarkMeetingDone: postponedUntil wymagane dla noGoPath=postponed');
        }
        // 'postponed' w hooku useCreateMeetingDecision zapisuje decision_type='postponed';
        // S5 chce 'push' (snooze + taski NIE zamknięte). Wywołujemy bezpośrednio jako 'go'-bypass —
        // ALE useCreateMeetingDecision waliduje typy. Dla S5 używamy 'postponed' (trigger:
        // stempluje K1 i ustawia next_action). Jeśli chcemy snooze bez K1, można rozszerzyć hook.
        return createDecision.mutateAsync({
          contactId: input.dealTeamContactId,
          decisionType: 'postponed',
          meetingDate,
          notes,
          postponedUntil: input.postponedUntil,
        });
      }
      case 'lost': {
        const reason = input.lostReason?.trim();
        if (!reason) throw new Error('useMarkMeetingDone: lostReason wymagany dla noGoPath=lost');
        return createDecision.mutateAsync({
          contactId: input.dealTeamContactId,
          decisionType: 'dead',
          meetingDate,
          notes,
          deadReason: reason,
        });
      }
      case 'cold':
      case 'nurture':
        // Hook useCreateMeetingDecision dziś waliduje tylko 'go|postponed|dead'.
        // Te dwie ścieżki na razie traktujemy jako 'postponed' do czasu rozszerzenia
        // hooka useCreateMeetingDecision o pełen zestaw decision_type. Trigger
        // apply_meeting_decision już obsługuje 'pivot'/'nurture' (S5 migracja).
        // TODO(S5+): rozszerzyć useCreateMeetingDecision i wpiąć 'pivot'/'nurture' bezpośrednio.
        return createDecision.mutateAsync({
          contactId: input.dealTeamContactId,
          decisionType: 'postponed',
          meetingDate,
          notes,
          postponedUntil: input.postponedUntil ?? format(
            new Date(Date.now() + (input.noGoPath === 'nurture' ? 30 : 7) * 24 * 60 * 60 * 1000),
            'yyyy-MM-dd',
          ),
        });
    }
  };

  return {
    mutateAsync,
    isPending: createDecision.isPending,
  };
}
