import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
  teamId: string;
  /** When true, also flips offering_stage='lost'. */
  setOfferingLost?: boolean;
  onSuccess?: () => void;
}

export function LostReasonDialog({
  open,
  onOpenChange,
  contactId,
  contactName,
  teamId,
  setOfferingLost,
  onSuccess,
}: Props) {
  const [reason, setReason] = useState('');
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const trimmed = reason.trim();
      if (trimmed.length < 3) throw new Error('Podaj powód utraty (min. 3 znaki).');
      const updates: Record<string, unknown> = {
        is_lost: true,
        lost_reason: trimmed,
        lost_at: new Date().toISOString(),
        status: 'lost',
        last_status_update: new Date().toISOString(),
      };
      if (setOfferingLost) updates.offering_stage = 'lost';
      const { error } = await supabase.from('deal_team_contacts').update(updates).eq('id', contactId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Oznaczono jako przegraną');
      qc.invalidateQueries({ queryKey: ['deal-team-contacts', teamId] });
      qc.invalidateQueries({ queryKey: ['unified-kanban-data'] });
      onSuccess?.();
      setReason('');
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error('Błąd', { description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Oznacz jako przegraną — {contactName}</DialogTitle>
          <DialogDescription>
            Podaj powód utraty. Zapisuje się w polu <code>lost_reason</code> i archiwizuje datę.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Powód (np. wybrał konkurencję, brak budżetu…)"
          rows={4}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || reason.trim().length < 3}
          >
            Oznacz przegraną
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
