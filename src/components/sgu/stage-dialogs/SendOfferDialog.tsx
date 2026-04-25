import { useState } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Loader2, FileText, CalendarIcon } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useSguStageTransition } from '@/hooks/useSguStageTransition';
import type { PremiumDialogContext } from './EstimatedPremiumDialog';

interface Props { open: boolean; onOpenChange: (o: boolean) => void; ctx: PremiumDialogContext | null; }

/** Etap `audit_done` → `won`. Pola: data wysłania oferty + kanał. */
export function SendOfferDialog({ open, onOpenChange, ctx }: Props) {
  const [sentAt, setSentAt] = useState<Date | undefined>(new Date());
  const [channel, setChannel] = useState<'email' | 'meeting' | 'phone'>('email');
  const transition = useSguStageTransition();

  if (!ctx) return null;

  const handleSave = async () => {
    if (!sentAt) return;
    await transition.mutateAsync({
      teamId: ctx.teamId,
      teamContactId: ctx.teamContactId,
      contactId: ctx.contactId,
      contactName: ctx.contactName,
      contactCompany: ctx.contactCompany,
      nextStage: 'won',
      sourceTaskId: ctx.sourceTaskId,
      contactPatch: {
        won_at: sentAt.toISOString(),
        next_action: `Oferta wysłana (${channel})`,
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Wyślij ofertę
          </DialogTitle>
          <DialogDescription>
            Potwierdź datę i kanał wysłania oferty do {ctx.contactName}. Etap przejdzie do „Wygrana".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label>Data wysłania</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !sentAt && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {sentAt ? format(sentAt, 'PPP', { locale: pl }) : 'Wybierz datę'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={sentAt} onSelect={setSentAt} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Kanał</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as typeof channel)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="email">E-mail</SelectItem>
                <SelectItem value="meeting">Spotkanie</SelectItem>
                <SelectItem value="phone">Telefon</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={transition.isPending}>Anuluj</Button>
          <Button onClick={handleSave} disabled={transition.isPending || !sentAt}>
            {transition.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Zapisz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
