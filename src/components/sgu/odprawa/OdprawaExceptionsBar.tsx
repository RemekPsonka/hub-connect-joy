import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useLogDecision, type MilestoneVariant } from '@/hooks/useLogDecision';
import type { ContactTimelineState, MilestoneKey } from '@/hooks/odprawa/useContactTimelineState';
import { LostReasonDialog } from '@/components/sgu/sales/LostReasonDialog';

function variantFor(current: MilestoneKey): MilestoneVariant {
  switch (current) {
    case 'prospect':
      return 'k1' as MilestoneVariant;
    case 'k1':
      return 'k2' as MilestoneVariant;
    case 'k2':
      return 'k2+' as MilestoneVariant;
    case 'k2+':
      return 'k3' as MilestoneVariant;
    case 'k3':
    case 'k4':
      return 'k4' as MilestoneVariant;
  }
}

interface Props {
  state: ContactTimelineState;
  contactId: string;
  contactName: string;
  teamId: string;
  tenantId: string;
  odprawaSessionId: string;
}

export function OdprawaExceptionsBar({
  state,
  contactId,
  contactName,
  teamId,
  tenantId,
  odprawaSessionId,
}: Props) {
  const logMut = useLogDecision();
  const qc = useQueryClient();
  const variant = variantFor(state.currentMilestone);

  const [pushOpen, setPushOpen] = useState(false);
  const [pushDate, setPushDate] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d;
  });

  const [lostOpen, setLostOpen] = useState(false);

  if (state.isLost || state.isWon) return null;

  const submitPush = async () => {
    if (!pushDate) {
      toast.error('Wybierz datę');
      return;
    }
    try {
      await logMut.mutateAsync({
        contactId,
        teamId,
        tenantId,
        decision: 'push',
        milestoneVariant: variant,
        odprawaSessionId,
        postponedUntil: pushDate.toISOString().slice(0, 10),
      });
      qc.invalidateQueries({ queryKey: ['deal_team_contact_for_agenda'] });
      qc.invalidateQueries({ queryKey: ['odprawa-agenda'] });
      qc.invalidateQueries({ queryKey: ['odprawa-session-decisions'] });
      setPushOpen(false);
      toast.success('Przesunięto');
    } catch {
      /* toast w hooku */
    }
  };

  const handleLostSuccess = () => {
    // Audit trail w meeting_decisions (LostReasonDialog sam aktualizuje deal_team_contacts).
    logMut.mutate({
      contactId,
      teamId,
      tenantId,
      decision: 'kill',
      milestoneVariant: variant,
      odprawaSessionId,
      deadReason: 'Oznaczono jako utracony w odprawie',
    });
    qc.invalidateQueries({ queryKey: ['deal_team_contact_for_agenda'] });
    qc.invalidateQueries({ queryKey: ['odprawa-agenda'] });
    qc.invalidateQueries({ queryKey: ['odprawa-session-decisions'] });
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold">Wyjątki</div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPushOpen(true)}
          disabled={logMut.isPending}
        >
          Przesuń
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setLostOpen(true)}
          disabled={logMut.isPending}
        >
          Utracony
        </Button>
      </div>

      <Dialog open={pushOpen} onOpenChange={setPushOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Przesuń decyzję na</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={pushDate}
              onSelect={setPushDate}
              disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
              className="p-3 pointer-events-auto"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPushOpen(false)}
              disabled={logMut.isPending}
            >
              Anuluj
            </Button>
            <Button onClick={submitPush} disabled={logMut.isPending || !pushDate}>
              Przesuń
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LostReasonDialog
        open={lostOpen}
        onOpenChange={setLostOpen}
        contactId={contactId}
        contactName={contactName}
        teamId={teamId}
        onSuccess={handleLostSuccess}
      />
    </div>
  );
}