import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ConnectionContactSelect } from '@/components/network/ConnectionContactSelect';
import { useClaimWantedContact, useMatchWantedContact } from '@/hooks/useWantedContacts';
import { useDirectors } from '@/hooks/useDirectors';
import { Loader2, User, ArrowLeft } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wantedId: string;
}

export function MatchWantedDialog({ open, onOpenChange, wantedId }: Props) {
  const [mode, setMode] = useState<'directors' | 'crm'>('directors');
  const [contactId, setContactId] = useState<string | null>(null);
  const claimMutation = useClaimWantedContact();
  const matchMutation = useMatchWantedContact();
  const { data: directors = [] } = useDirectors();

  const handleClose = (val: boolean) => {
    onOpenChange(val);
    if (!val) {
      setMode('directors');
      setContactId(null);
    }
  };

  const handleDirectorMatch = (director: { id: string }) => {
    claimMutation.mutate(
      { wantedId, directorId: director.id },
      { onSuccess: () => handleClose(false) }
    );
  };

  const handleCrmMatch = () => {
    if (!contactId) return;
    matchMutation.mutate(
      { wantedId, contactId },
      { onSuccess: () => handleClose(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Znam tę osobę!</DialogTitle>
        </DialogHeader>

        {mode === 'directors' ? (
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">Który dyrektor zna tę osobę?</Label>
            <div className="flex flex-col gap-1.5 max-h-[300px] overflow-auto">
              {directors.map(d => (
                <Button
                  key={d.id}
                  variant="outline"
                  className="justify-start gap-2 h-auto py-2"
                  disabled={claimMutation.isPending}
                  onClick={() => handleDirectorMatch(d)}
                >
                  <User className="h-4 w-4" />
                  {d.full_name}
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => setMode('crm')}
            >
              Inny — szukaj w CRM
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Button variant="ghost" size="sm" className="gap-1 -ml-2 text-muted-foreground" onClick={() => setMode('directors')}>
              <ArrowLeft className="h-3.5 w-3.5" /> Wstecz
            </Button>
            <Label>Wybierz kontakt z CRM</Label>
            <ConnectionContactSelect value={contactId} onChange={setContactId} placeholder="Szukaj kontaktu..." />
          </div>
        )}

        {mode === 'crm' && (
          <DialogFooter>
            <Button variant="outline" onClick={() => handleClose(false)}>Anuluj</Button>
            <Button onClick={handleCrmMatch} disabled={!contactId || matchMutation.isPending}>
              {matchMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Dopasuj
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
