import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ConnectionContactSelect } from './ConnectionContactSelect';
import { useAddConnection } from '@/hooks/useConnections';
import { Link2 } from 'lucide-react';
import { toast } from 'sonner';

interface AddConnectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedContactId?: string;
}

const CONNECTION_TYPES = [
  { value: 'knows', label: 'Znajomi' },
  { value: 'professional', label: 'Współpracownicy' },
  { value: 'met_at_event', label: 'Poznali się na evencie' },
  { value: 'project', label: 'Wspólny projekt' },
  { value: 'family', label: 'Rodzina' },
  { value: 'other', label: 'Inny' },
];

export function AddConnectionModal({ open, onOpenChange, preselectedContactId }: AddConnectionModalProps) {
  const [contactAId, setContactAId] = useState<string | null>(preselectedContactId || null);
  const [contactBId, setContactBId] = useState<string | null>(null);
  const [connectionType, setConnectionType] = useState('knows');
  const [strength, setStrength] = useState([5]);

  const addConnection = useAddConnection();

  const handleSubmit = async () => {
    if (!contactAId || !contactBId) {
      toast.error('Wybierz oba kontakty');
      return;
    }

    if (contactAId === contactBId) {
      toast.error('Kontakty muszą być różne');
      return;
    }

    try {
      await addConnection.mutateAsync({
        contactAId,
        contactBId,
        connectionType,
        strength: strength[0],
      });
      toast.success('Połączenie zostało dodane');
      handleClose();
    } catch (error: any) {
      if (error.message === 'Connection already exists') {
        toast.error('To połączenie już istnieje');
      } else {
        toast.error('Błąd podczas dodawania połączenia');
      }
    }
  };

  const handleClose = () => {
    setContactAId(preselectedContactId || null);
    setContactBId(null);
    setConnectionType('knows');
    setStrength([5]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Dodaj połączenie
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Kontakt A</Label>
            <ConnectionContactSelect
              value={contactAId}
              onChange={setContactAId}
              placeholder="Wybierz pierwszy kontakt..."
            />
          </div>

          <div className="space-y-2">
            <Label>Kontakt B</Label>
            <ConnectionContactSelect
              value={contactBId}
              onChange={setContactBId}
              placeholder="Wybierz drugi kontakt..."
              excludeIds={contactAId ? [contactAId] : undefined}
            />
          </div>

          <div className="space-y-2">
            <Label>Typ połączenia</Label>
            <Select value={connectionType} onValueChange={setConnectionType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONNECTION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Siła połączenia</Label>
              <span className="text-sm text-muted-foreground">{strength[0]}/10</span>
            </div>
            <Slider
              value={strength}
              onValueChange={setStrength}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Anuluj
          </Button>
          <Button onClick={handleSubmit} disabled={addConnection.isPending}>
            {addConnection.isPending ? 'Dodawanie...' : 'Dodaj połączenie'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
