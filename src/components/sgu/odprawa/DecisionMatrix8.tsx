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
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  useLogDecision,
  type DecisionVerdict,
  type MilestoneVariant,
} from '@/hooks/useLogDecision';

interface DecisionMatrix8Props {
  contact: {
    id: string;
    handshake_at: string | null;
    poa_signed_at: string | null;
  };
  teamId: string;
  tenantId: string;
  odprawaSessionId: string;
  onDecisionLogged?: () => void;
}

type Variant = 'default' | 'secondary' | 'outline' | 'destructive';

const VERDICTS: Array<{ key: DecisionVerdict; label: string; variant: Variant }> = [
  { key: 'push', label: 'Push', variant: 'default' },
  { key: 'pivot', label: 'Pivot', variant: 'secondary' },
  { key: 'park', label: 'Park', variant: 'outline' },
  { key: 'kill', label: 'Kill', variant: 'destructive' },
];

function formatPlDate(iso: string): string {
  try {
    return format(new Date(iso), 'dd.MM.yyyy', { locale: pl });
  } catch {
    return iso;
  }
}

export function DecisionMatrix8({
  contact,
  teamId,
  tenantId,
  odprawaSessionId,
  onDecisionLogged,
}: DecisionMatrix8Props) {
  const logMut = useLogDecision();

  const [killOpen, setKillOpen] = useState(false);
  const [killVariant, setKillVariant] = useState<MilestoneVariant>('k2');
  const [killReason, setKillReason] = useState('');

  const [parkOpen, setParkOpen] = useState(false);
  const [parkVariant, setParkVariant] = useState<MilestoneVariant>('k2');
  const [parkDate, setParkDate] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d;
  });

  const k2Done = !!contact.handshake_at;
  const k2plusDone = !!contact.poa_signed_at;

  const handleSimpleClick = async (
    decision: DecisionVerdict,
    variant: MilestoneVariant,
  ) => {
    if (decision === 'kill') {
      setKillVariant(variant);
      setKillReason('');
      setKillOpen(true);
      return;
    }
    if (decision === 'park') {
      setParkVariant(variant);
      setParkOpen(true);
      return;
    }
    try {
      await logMut.mutateAsync({
        contactId: contact.id,
        teamId,
        tenantId,
        decision,
        milestoneVariant: variant,
        odprawaSessionId,
      });
      toast.success(`Zapisano: ${decision.toUpperCase()} ${variant.toUpperCase()}`);
      onDecisionLogged?.();
    } catch {
      // toast handled in hook
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
        contactId: contact.id,
        teamId,
        tenantId,
        decision: 'kill',
        milestoneVariant: killVariant,
        odprawaSessionId,
        deadReason: reason,
      });
      setKillOpen(false);
      toast.success(`Ubito: KILL ${killVariant.toUpperCase()}`);
      onDecisionLogged?.();
    } catch {
      // hook toast
    }
  };

  const submitPark = async () => {
    if (!parkDate) {
      toast.error('Wybierz datę');
      return;
    }
    try {
      await logMut.mutateAsync({
        contactId: contact.id,
        teamId,
        tenantId,
        decision: 'park',
        milestoneVariant: parkVariant,
        odprawaSessionId,
        postponedUntil: parkDate.toISOString().slice(0, 10),
      });
      setParkOpen(false);
      toast.success(`Park ${parkVariant.toUpperCase()} do ${formatPlDate(parkDate.toISOString())}`);
      onDecisionLogged?.();
    } catch {
      // hook toast
    }
  };

  const renderCell = (decision: DecisionVerdict, variant: MilestoneVariant) => {
    const disabled =
      logMut.isPending ||
      (variant === 'k2' && k2Done) ||
      (variant === 'k2+' && k2plusDone);
    const v = VERDICTS.find((x) => x.key === decision)!;
    const button = (
      <Button
        variant={v.variant}
        size="sm"
        className="w-full"
        disabled={disabled}
        onClick={() => handleSimpleClick(decision, variant)}
      >
        {v.label} {variant.toUpperCase()}
      </Button>
    );
    if (variant === 'k2' && k2Done) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block w-full">{button}</span>
            </TooltipTrigger>
            <TooltipContent>
              K2 już zdobyty ({formatPlDate(contact.handshake_at!)})
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    if (variant === 'k2+' && k2plusDone) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block w-full">{button}</span>
            </TooltipTrigger>
            <TooltipContent>
              K2+ już zdobyty ({formatPlDate(contact.poa_signed_at!)})
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return button;
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 text-xs font-medium text-muted-foreground">
        <div className="text-center">K2 (handshake)</div>
        <div className="text-center">K2+ (pełnomocnictwo)</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {VERDICTS.flatMap((v) => [
          <div key={`${v.key}-k2`}>{renderCell(v.key, 'k2')}</div>,
          <div key={`${v.key}-k2plus`}>{renderCell(v.key, 'k2+')}</div>,
        ])}
      </div>

      <AlertDialog open={killOpen} onOpenChange={setKillOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ubić tego kontakta?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta akcja zamknie kontakta jako {killVariant.toUpperCase()} dead.
              Można to odwrócić tylko ręcznie przez zmianę stage.
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
              Ubij
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={parkOpen} onOpenChange={setParkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Park {parkVariant.toUpperCase()} do kiedy?</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={parkDate}
              onSelect={setParkDate}
              disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
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
              Parkuj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
