import { forwardRef, useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Users } from 'lucide-react';

interface SaveMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  openTasksCount: number;
  onConfirm: (notes: string) => Promise<void> | void;
  isPending?: boolean;
}

export const SaveMeetingDialog = forwardRef<HTMLDivElement, SaveMeetingDialogProps>(
  function SaveMeetingDialog(
    { open, onOpenChange, openTasksCount, onConfirm, isPending },
    ref,
  ) {
    const [notes, setNotes] = useState('');

    useEffect(() => {
      if (!open) setNotes('');
    }, [open]);

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent ref={ref} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Zapisz odprawę
            </DialogTitle>
            <DialogDescription>
              Zamrożę snapshot {openTasksCount} otwartych zadań jako cel do następnej odprawy.
              Nowe zadania dodane po dziś trafią do następnego okresu.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notatki z odprawy (opcjonalnie)"
            className="min-h-[80px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Anuluj
            </Button>
            <Button onClick={() => onConfirm(notes)} disabled={isPending}>
              {isPending ? 'Zapisuję…' : 'Zapisz odprawę'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  },
);
