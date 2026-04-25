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
import {
  useLogDecision,
  type DecisionVerdict,
  type MilestoneVariant,
} from '@/hooks/useLogDecision';
import type {
  ContactTimelineState,
  DecisionKey,
  MilestoneKey,
} from '@/hooks/odprawa/useContactTimelineState';

const MILESTONE_LABEL: Record<MilestoneKey, string> = {
  prospect: 'Prospekt',
  k1: 'K1 spotkanie',
  k2: 'K2 handshake',
  'k2+': 'K2+ POA',
  k3: 'K3 audyt',
  k4: 'K4 klient',
};

function decisionVariantFor(current: MilestoneKey): MilestoneVariant {
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
      return 'k4' as MilestoneVariant;
    case 'k4':
      return 'k4' as MilestoneVariant;
  }
}

interface DecisionButtonsProps {
  state: ContactTimelineState;
  contactId: string;
  teamId: string;
  tenantId: string;
  odprawaSessionId: string;
  onDecisionLogged: (decision: DecisionKey) => void;
}

export function DecisionButtons({
  state,
  contactId,
  teamId,
  tenantId,
  odprawaSessionId,
  onDecisionLogged,
}: DecisionButtonsProps) {
  const logMut = useLogDecision();
  const qc = useQueryClient();
  const [killOpen, setKillOpen] = useState(false);
  const [killReason, setKillReason] = useState('');
  const [parkOpen, setParkOpen] = useState(false);
  const [parkDate, setParkDate] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d;
  });
  const [klientOpen, setKlientOpen] = useState(false);
  const [klientNote, setKlientNote] = useState('');

  const variant = decisionVariantFor(state.currentMilestone);
  const nextLabel = state.nextMilestone ? MILESTONE_LABEL[state.nextMilestone] : '—';
  const currentLabel = MILESTONE_LABEL[state.currentMilestone];

  if (state.availableDecisions.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic">
        Kontakt zamknięty — brak decyzji do podjęcia w odprawie.
      </div>
    );
  }

  const handlePush = async () => {
    try {
      await logMut.mutateAsync({
        contactId,
        teamId,
        tenantId,
        decision: 'push',
        milestoneVariant: variant,
        odprawaSessionId,
      });
      toast.success('Decyzja: Idziemy dalej');
      onDecisionLogged('push');
    } catch {
      // toast w hooku
    }
  };

  const handlePivot = async () => {
    try {
      await logMut.mutateAsync({
        contactId,
        teamId,
        tenantId,
        decision: 'pivot',
        milestoneVariant: variant,
        odprawaSessionId,
      });
      toast.success('Decyzja: Zmień plan');
      onDecisionLogged('pivot');
    } catch {
      /* */
    }
  };

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
      // Snooze również na samej karcie kontaktu (postponed_until)
      await supabase
        .from('deal_team_contacts')
        .update({ snoozed_until: parkDate.toISOString().slice(0, 10) })
        .eq('id', contactId);
      qc.invalidateQueries({ queryKey: ['deal_team_contact_for_agenda'] });
      qc.invalidateQueries({ queryKey: ['odprawa-agenda'] });
      setParkOpen(false);
      toast.success('Odłożone');
      onDecisionLogged('park');
    } catch {
      /* */
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
      // Oznacz kontakt jako utracony
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
      setKillOpen(false);
      toast.success('Oznaczono jako Utracony');
      onDecisionLogged('kill');
    } catch {
      /* */
    }
  };

  const submitKlient = async () => {
    try {
      // Zapis decyzji jako "push k4" + opcjonalna notka
      await logMut.mutateAsync({
        contactId,
        teamId,
        tenantId,
        decision: 'push',
        milestoneVariant: 'k4' as MilestoneVariant,
        odprawaSessionId,
        notes: klientNote.trim() || null,
      });
      // Domknięcie K4 na karcie — trigger trg_set_milestone_timestamps zapisze won_at
      await supabase
        .from('deal_team_contacts')
        .update({
          offering_stage: 'won',
          status: 'won',
          category: 'client',
        })
        .eq('id', contactId);
      qc.invalidateQueries({ queryKey: ['deal_team_contact_for_agenda'] });
      qc.invalidateQueries({ queryKey: ['odprawa-agenda'] });
      setKlientOpen(false);
      toast.success('Domknięto K4 — Klient');
      onDecisionLogged('klient');
    } catch {
      /* */
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-semibold">Decyzja w tej odprawie</div>
        <div className="text-xs text-muted-foreground">
          Kontekst: jesteśmy na <strong>{currentLabel}</strong>. Decyzja dotyczy{' '}
          <strong>{nextLabel}</strong>.
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {state.availableDecisions.includes('push') && (
          <Button onClick={handlePush} disabled={logMut.isPending} variant="default">
            Idziemy dalej
          </Button>
        )}
        {state.availableDecisions.includes('pivot') && (
          <Button onClick={handlePivot} disabled={logMut.isPending} variant="secondary">
            Zmień plan
          </Button>
        )}
        {state.availableDecisions.includes('park') && (
          <Button onClick={() => setParkOpen(true)} disabled={logMut.isPending} variant="outline">
            Odłóż
          </Button>
        )}
        {state.availableDecisions.includes('kill') && (
          <Button onClick={() => setKillOpen(true)} disabled={logMut.isPending} variant="destructive">
            Utracony
          </Button>
        )}
        {state.availableDecisions.includes('klient') && (
          <Button
            onClick={() => setKlientOpen(true)}
            disabled={logMut.isPending}
            className="bg-emerald-600 text-white hover:bg-emerald-700 col-span-2 sm:col-span-1"
          >
            Klient
          </Button>
        )}
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
            <Button variant="outline" onClick={() => setParkOpen(false)} disabled={logMut.isPending}>
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

      <AlertDialog open={klientOpen} onOpenChange={setKlientOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Domknąć K4 — Klient?</AlertDialogTitle>
            <AlertDialogDescription>
              Kontakt zostanie oznaczony jako klient (won). Możesz dodać notatkę.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Notatka (opcjonalnie)"
            value={klientNote}
            onChange={(e) => setKlientNote(e.target.value)}
            className="min-h-[80px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={logMut.isPending}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                submitKlient();
              }}
              disabled={logMut.isPending}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Domknij Klient
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
