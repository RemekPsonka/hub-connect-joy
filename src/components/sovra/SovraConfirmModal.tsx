import { useState } from 'react';
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
import { Loader2, AlertTriangle } from 'lucide-react';

interface Props {
  open: boolean;
  summary: string;
  integrationReady: boolean;
  onClose: () => void;
  onDecision: (decision: 'confirm' | 'cancel') => Promise<boolean>;
}

export function SovraConfirmModal({ open, summary, integrationReady, onClose, onDecision }: Props) {
  const [busy, setBusy] = useState<'confirm' | 'cancel' | null>(null);

  const handle = async (decision: 'confirm' | 'cancel') => {
    setBusy(decision);
    const ok = await onDecision(decision);
    setBusy(null);
    if (ok) onClose();
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && !busy && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Potwierdź akcję Sovry</AlertDialogTitle>
          <AlertDialogDescription className="pt-2">{summary}</AlertDialogDescription>
        </AlertDialogHeader>

        {!integrationReady && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Integracja jeszcze nieaktywna — akcja zostanie zarejestrowana, ale nie wywoła zewnętrznego systemu.</span>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={!!busy} onClick={() => handle('cancel')}>
            {busy === 'cancel' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Anuluj'}
          </AlertDialogCancel>
          <AlertDialogAction disabled={!!busy} onClick={() => handle('confirm')}>
            {busy === 'confirm' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Potwierdź'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
