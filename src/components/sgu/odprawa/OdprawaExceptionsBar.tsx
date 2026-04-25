import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLogDecision, type MilestoneVariant } from '@/hooks/useLogDecision';
import type { ContactTimelineState, MilestoneKey } from '@/hooks/odprawa/useContactTimelineState';

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
  teamId: string;
  tenantId: string;
  odprawaSessionId: string;
}

export function OdprawaExceptionsBar({
  state,
  contactId,
  teamId,
  tenantId,
  odprawaSessionId,
}: Props) {
  const logMut = useLogDecision();
  const qc = useQueryClient();
  const variant = variantFor(state.currentMilestone);

  const [parkOpen, setParkOpen] = useState(false);
  const [parkDate, setParkDate] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d;
  });

  const [killOpen, setKillOpen] = useState(false);
  const [killReason, setKillReason] = useState('');

  if (state.isLost || state.isWon) return null;

  const submitPark = async () => {
    if (!parkDate) {
      toast.error('Wybierz datę');
      return;
    }
    try {
      await logMut.mutateAsync({
        contactId,
        teamId,
        tenantId,
        decision: 'park',
        milestoneVariant: variant,
        odprawaSessionId,
        postponedUntil: parkDate.toISOString().slice(0, 10),
      });
      await supabase
        .from('deal_team_contacts')
        .update({ snoozed_until: parkDate.toISOString().slice(0, 10) })
        .eq('id', contactId);
      qc.invalidateQueries({ queryKey: ['deal_team_contact_for_agenda'] });
      qc.invalidateQueries({ queryKey: ['odprawa-agenda'] });
      qc.invalidateQueries({ queryKey: ['odprawa-session-decisions'] });
      setParkOpen(false);
      toast.success('Odłożone');
    } catch {
      /* toast w hooku */
    }
  };

  const submitKill = async () => {
    const reason = killReason.trim();
    if (!reason) {
      toast.error('Powód jest wymagany');
      return;
    }
    try {
      await logMut.mutateAsync({
        contactId,
        teamId,
        tenantId,
        decision: 'kill',
        milestoneVariant: variant,
        odprawaSessionId,
        deadReason: reason,
      });
      await supabase
        .from('deal_team_contacts')
        .update({
          is_lost: true,
          lost_reason: reason,
          lost_at: new Date().toISOString(),
          status: 'lost',
        })
        .eq('id', contactId);
      qc.invalidateQueries({ queryKey: ['deal_team_contact_for_agenda'] });
      qc.invalidateQueries({ queryKey: ['odprawa-agenda'] });
      qc.invalidateQueries({ queryKey: ['odprawa-session-decisions'] });
      setKillOpen(false);
      setKillReason('');
      toast.success('Oznaczono jako Utracony');
    } catch {
      /* */
    }
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold">Wyjątki</div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setParkOpen(true)}
          disabled={logMut.isPending}
        >
          Odłóż
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setKillOpen(true)}
          disabled={logMut.isPending}
        >
          Utracony
        </Button>
      </div>

      <Dialog open={parkOpen} onOpenChange={setParkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Odłóż do kiedy?</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={parkDate}
              onSelect={setParkDate}
              disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
              className="p-3 pointer-events-auto"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setParkOpen(false)}
              disabled={logMut.isPending}
            >
              Anuluj
            </Button>
            <Button onClick={submitPark} disabled={logMut.isPending || !parkDate}>
              Odłóż
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={killOpen} onOpenChange={setKillOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Oznaczyć jako Utracony?</AlertDialogTitle>
            <AlertDialogDescription>
              Kontakt zostanie zamknięty jako utracony. Powód jest wymagany.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Powód (wymagane)"
            value={killReason}
            onChange={(e) => setKillReason(e.target.value)}
            className="min-h-[80px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={logMut.isPending}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                submitKill();
              }}
              disabled={logMut.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Oznacz jako utracony
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}