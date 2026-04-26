import { MeetingDecisionDialog, type DecisionType } from './MeetingDecisionDialog';
import type { DealCategory } from '@/types/dealTeam';

/**
 * Sprint S5 — UNIFY-MEETING-OUTCOME
 *
 * Wcześniej osobny dialog z 6-OutcomeOption (offer/next_meeting/10x/snooze/client/lost).
 * Teraz cienki wrapper na kanoniczny `MeetingDecisionDialog` (go/postponed/dead),
 * używany przez 3 inne entry-pointy. Wsteczna kompatybilność props zachowana
 * (`MyTeamTasksView` nie wymaga zmian).
 *
 * Mapowanie callbacków zwrotnych:
 *   onSuccess('go')                 → onConfirm?.()      (idziemy dalej; opcjonalnie operator
 *                                                          otwiera WonPremiumBreakdownDialog
 *                                                          przez `onConvertToClient` w osobnym kroku)
 *   onSuccess('postponed')          → onSnooze?.() lub onConfirm?.()
 *   onSuccess('dead' | 'kill')      → onConfirm?.()
 */

interface MeetingOutcomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactName: string;
  contactId: string;
  teamContactId: string;
  teamId: string;
  currentCategory: DealCategory;
  onConfirm?: () => void;
  /** Wywoływany po zapisaniu decyzji 'postponed' (snooze). */
  onSnooze?: () => void;
  /**
   * Zachowane dla kompatybilności — rodzic decyduje czy po sukcesie 'go'
   * otwierać `WonPremiumBreakdownDialog` (canonical conversion z Etap 2).
   * Wrapper nie wywołuje go automatycznie.
   */
  onConvertToClient?: () => void;
}

export function MeetingOutcomeDialog({
  open,
  onOpenChange,
  contactName,
  teamContactId,
  onConfirm,
  onSnooze,
}: MeetingOutcomeDialogProps) {
  const handleSuccess = (decisionType: DecisionType) => {
    if (decisionType === 'postponed') {
      onSnooze?.();
      return;
    }
    // 'go' i 'dead' → standardowe zamknięcie z notyfikacją rodzica.
    onConfirm?.();
  };

  return (
    <MeetingDecisionDialog
      open={open}
      onOpenChange={onOpenChange}
      contactId={teamContactId}
      contactDisplayName={contactName}
      onSuccess={handleSuccess}
    />
  );
}
