import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ConnectionContactSelect } from '@/components/network/ConnectionContactSelect';
import { useMatchWantedContact } from '@/hooks/useWantedContacts';
import { Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wantedId: string;
}

export function MatchWantedDialog({ open, onOpenChange, wantedId }: Props) {
  const [contactId, setContactId] = useState<string | null>(null);
  const matchMutation = useMatchWantedContact();

  const handleMatch = () => {
    if (!contactId) return;
    matchMutation.mutate(
      { wantedId, contactId },
      { onSuccess: () => { onOpenChange(false); setContactId(null); } }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Znam tę osobę!</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Label>Wybierz kontakt z CRM</Label>
          <ConnectionContactSelect value={contactId} onChange={setContactId} placeholder="Szukaj kontaktu..." />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Anuluj</Button>
          <Button onClick={handleMatch} disabled={!contactId || matchMutation.isPending}>
            {matchMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            Dopasuj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
