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
import type { DealCategory } from '@/types/dealTeam';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
  teamId: string;
  fromStage: string;
  toCategory: DealCategory;
  onSuccess?: () => void;
}

export function StageRollbackDialog({
  open,
  onOpenChange,
  contactId,
  contactName,
  teamId,
  fromStage,
  toCategory,
  onSuccess,
}: Props) {
  const [reason, setReason] = useState('');
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const trimmed = reason.trim();
      if (trimmed.length < 3) throw new Error('Podaj powód cofnięcia (min. 3 znaki).');
      const note = `Cofnięcie etapu (${fromStage} → ${toCategory}): ${trimmed}`;
      const { error } = await supabase
        .from('deal_team_contacts')
        .update({
          category: toCategory,
          notes: note,
          last_status_update: new Date().toISOString(),
        })
        .eq('id', contactId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Etap cofnięty');
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
          <DialogTitle>Cofnij etap — {contactName}</DialogTitle>
          <DialogDescription>
            Cofasz kontakt z etapu <b>{fromStage}</b> do <b>{toCategory}</b>. Podaj powód — będzie
            zapisany w notatkach.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Powód cofnięcia (np. klient się rozmyślił, wraca do negocjacji…)"
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
            Cofnij
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
