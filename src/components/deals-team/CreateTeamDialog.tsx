import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useCreateDealTeam } from '@/hooks/useDealTeams';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTeamCreated?: (teamId: string) => void;
}

const colorPresets = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
];

export function CreateTeamDialog({
  open,
  onOpenChange,
  onTeamCreated,
}: CreateTeamDialogProps) {
  const { director } = useAuth();
  const createTeam = useCreateDealTeam();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(colorPresets[5]); // blue default

  const resetForm = () => {
    setName('');
    setDescription('');
    setColor(colorPresets[5]);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !director?.id) return;

    const result = await createTeam.mutateAsync({
      name: name.trim(),
      description: description.trim() || null,
      color,
      member_ids: [director.id], // Automatically add creator as member
    });

    resetForm();
    onOpenChange(false);
    if (result?.id && onTeamCreated) {
      onTeamCreated(result.id);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Utwórz nowy zespół</DialogTitle>
          <DialogDescription>
            Stwórz zespół do zarządzania kontaktami dealowymi
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label>Nazwa zespołu *</Label>
            <Input
              placeholder="np. Zespół Sprzedaży B2B"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Opis</Label>
            <Textarea
              placeholder="Krótki opis celu zespołu..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>Kolor</Label>
            <div className="flex gap-2 flex-wrap">
              {colorPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setColor(preset)}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    color === preset ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                  }`}
                  style={{ backgroundColor: preset }}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Anuluj
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || createTeam.isPending}
          >
            {createTeam.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Utwórz zespół
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
