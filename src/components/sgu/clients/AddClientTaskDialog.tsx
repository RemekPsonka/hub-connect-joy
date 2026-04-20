import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | null;
  clientName?: string;
  teamId: string;
}

function defaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

export function AddClientTaskDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  teamId,
}: Props) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(defaultDueDate());
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setTitle(clientName ? `Kontakt z klientem – ${clientName}` : '');
      setDueDate(defaultDueDate());
      setNotes('');
    }
  }, [open, clientName]);

  const createTask = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error('Brak klienta');
      if (!title.trim()) throw new Error('Tytuł jest wymagany');

      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error('Brak użytkownika');

      const { data: dirData } = await supabase
        .from('directors')
        .select('tenant_id')
        .eq('user_id', userId)
        .maybeSingle();
      const tenantId = dirData?.tenant_id;
      if (!tenantId) throw new Error('Brak tenant_id');

      const { error } = await supabase.from('tasks').insert({
        title: title.trim(),
        due_date: dueDate,
        notes: notes.trim() || null,
        deal_team_id: teamId,
        deal_team_contact_id: clientId,
        owner_id: userId,
        assigned_to_user_id: userId,
        tenant_id: tenantId,
        task_type: 'crm',
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Zadanie utworzone');
      qc.invalidateQueries({ queryKey: ['tasks'] });
      onOpenChange(false);
    },
    onError: (e) => toast.error('Błąd', { description: (e as Error).message }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dodaj zadanie</DialogTitle>
          {clientName && <DialogDescription>dla {clientName}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Tytuł</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Np. Telefon w sprawie odnowienia"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-due">Termin</Label>
            <Input
              id="task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-notes">Notatki</Label>
            <Textarea
              id="task-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Opcjonalne"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button
            onClick={() => createTask.mutate()}
            disabled={createTask.isPending || !title.trim() || !clientId}
          >
            {createTask.isPending ? 'Zapisuję…' : 'Dodaj zadanie'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
