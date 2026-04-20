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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
  teamId: string;
  onSuccess?: () => void;
}

export function ConvertWonToClientDialog({
  open,
  onOpenChange,
  contactId,
  contactName,
  teamId,
  onSuccess,
}: Props) {
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      setSubmitting(true);
      const { error } = await supabase
        .from('deal_team_contacts')
        .update({
          category: 'client',
          client_status: 'standard',
          status: 'won',
          last_status_update: new Date().toISOString(),
        })
        .eq('id', contactId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Klient utworzony', {
        description: `${contactName} jest teraz oznaczony jako klient.`,
      });
      qc.invalidateQueries({ queryKey: ['deal-team-contacts', teamId] });
      qc.invalidateQueries({ queryKey: ['sgu-clients-portfolio'] });
      qc.invalidateQueries({ queryKey: ['unified-kanban-data'] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error('Błąd', { description: e.message }),
    onSettled: () => setSubmitting(false),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Oznaczyć {contactName} jako klient?</DialogTitle>
          <DialogDescription>
            Kontakt zostanie przeniesiony do etapu KLIENT ze statusem „Standard". Zmiana jest
            odwracalna w panelu Klienci.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Anuluj
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={submitting}>
            Oznacz jako klient
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
