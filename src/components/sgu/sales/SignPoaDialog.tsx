import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { CalendarIcon, Handshake, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRequireDirector } from '@/hooks/useRequireDirector';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealTeamContactId: string;
  teamId: string;
  contactName: string;
  /** Whether handshake_at is already set — drives COALESCE behavior in UI hint. */
  alreadyHandshaken?: boolean;
  onSigned?: (signedAt: Date) => void;
}

/**
 * Sprint S7 — wywoływany ze zmiany sub-chip offering_stage:
 * handshake → power_of_attorney. POA implikuje handshake (COALESCE).
 * Cancel = chip wraca, zero DB write.
 */
export function SignPoaDialog({
  open,
  onOpenChange,
  dealTeamContactId,
  teamId,
  contactName,
  alreadyHandshaken,
  onSigned,
}: Props) {
  const qc = useQueryClient();
  const { hasDirector } = useRequireDirector(dealTeamContactId);
  const [date, setDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    if (open) setDate(new Date());
  }, [open]);

  const save = useMutation({
    mutationFn: async (signedAt: Date) => {
      const iso = signedAt.toISOString();
      const patch: Record<string, unknown> = {
        offering_stage: 'power_of_attorney',
        poa_signed_at: iso,
      };
      if (!alreadyHandshaken) {
        patch.handshake_at = iso;
      }
      const { error } = await supabase
        .from('deal_team_contacts')
        .update(patch)
        .eq('id', dealTeamContactId);
      if (error) throw error;
    },
    onSuccess: (_d, signedAt) => {
      qc.invalidateQueries({ queryKey: ['team-contacts', teamId] });
      qc.invalidateQueries({ queryKey: ['deal-team-contacts'] });
      toast.success(`Pełnomocnictwo podpisane: ${format(signedAt, 'PPP', { locale: pl })}`);
      onSigned?.(signedAt);
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(`Błąd: ${e.message}`),
  });

  const handleSave = () => {
    if (!date) {
      toast.error('Wybierz datę');
      return;
    }
    if (!hasDirector) {
      toast.error('Brak przypisanego dyrektora — uzupełnij na karcie kontaktu.');
      return;
    }
    save.mutate(date);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !save.isPending && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5" /> Pełnomocnictwo podpisane
          </DialogTitle>
          <DialogDescription>
            Potwierdź datę podpisania POA przez {contactName}.
            {!alreadyHandshaken && ' Handshake zostanie ustawiony automatycznie na tę samą datę.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label>Data podpisania</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !date && 'text-muted-foreground',
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, 'PPP', { locale: pl }) : 'Wybierz datę'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
                className="p-3 pointer-events-auto"
                locale={pl}
              />
            </PopoverContent>
          </Popover>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={save.isPending}
          >
            Anuluj
          </Button>
          <Button onClick={handleSave} disabled={save.isPending || !date}>
            {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Zapisz POA
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
