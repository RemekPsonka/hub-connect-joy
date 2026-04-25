import { useState } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Loader2, Handshake, CalendarIcon } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useSguStageTransition } from '@/hooks/useSguStageTransition';
import type { PremiumDialogContext } from './EstimatedPremiumDialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ctx: PremiumDialogContext | null;
}

/** Etap `power_of_attorney` → `audit_scheduled`. Pole: data podpisania POA. */
export function PoaSignedDialog({ open, onOpenChange, ctx }: Props) {
  const [signedAt, setSignedAt] = useState<Date | undefined>(new Date());
  const transition = useSguStageTransition();

  if (!ctx) return null;

  const handleSave = async () => {
    if (!signedAt) return;
    await transition.mutateAsync({
      teamId: ctx.teamId,
      teamContactId: ctx.teamContactId,
      contactId: ctx.contactId,
      contactName: ctx.contactName,
      contactCompany: ctx.contactCompany,
      nextStage: 'audit_scheduled',
      sourceTaskId: ctx.sourceTaskId,
      contactPatch: { poa_signed_at: signedAt.toISOString() },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5" /> Pełnomocnictwo podpisane
          </DialogTitle>
          <DialogDescription>
            Potwierdź datę podpisania pełnomocnictwa przez {ctx.contactName}.
            Po zapisie utworzymy zadanie „Umówić audyt".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Label>Data podpisania</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !signedAt && 'text-muted-foreground')}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {signedAt ? format(signedAt, 'PPP', { locale: pl }) : 'Wybierz datę'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={signedAt} onSelect={setSignedAt} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={transition.isPending}>Anuluj</Button>
          <Button onClick={handleSave} disabled={transition.isPending || !signedAt}>
            {transition.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Zapisz i przejdź do audytu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
