import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useCreateProspect } from '@/hooks/useDealsTeamProspects';
import { useTeamMembers } from '@/hooks/useDealsTeamMembers';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DealPriority } from '@/types/dealTeam';

interface AddProspectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
}

export function AddProspectDialog({ open, onOpenChange, teamId }: AddProspectDialogProps) {
  const createProspect = useCreateProspect();
  const { data: members = [] } = useTeamMembers(teamId);

  const [prospectName, setProspectName] = useState('');
  const [prospectCompany, setProspectCompany] = useState('');
  const [prospectPosition, setProspectPosition] = useState('');
  const [prospectLinkedin, setProspectLinkedin] = useState('');
  const [prospectEmail, setProspectEmail] = useState('');
  const [prospectPhone, setProspectPhone] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<DealPriority>('medium');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setProspectName('');
    setProspectCompany('');
    setProspectPosition('');
    setProspectLinkedin('');
    setProspectEmail('');
    setProspectPhone('');
    setAssignedTo('');
    setPriority('medium');
    setNotes('');
  };

  const handleSubmit = async () => {
    if (!prospectName.trim()) return;

    await createProspect.mutateAsync({
      teamId,
      prospectName: prospectName.trim(),
      prospectCompany: prospectCompany.trim() || undefined,
      prospectPosition: prospectPosition.trim() || undefined,
      prospectLinkedin: prospectLinkedin.trim() || undefined,
      prospectEmail: prospectEmail.trim() || undefined,
      prospectPhone: prospectPhone.trim() || undefined,
      assignedTo: assignedTo || undefined,
      priority,
      notes: notes.trim() || undefined,
    });

    resetForm();
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Dodaj poszukiwanego</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          {/* Prospect name */}
          <div className="space-y-2">
            <Label>Imię i nazwisko *</Label>
            <Input
              placeholder="Jan Kowalski"
              value={prospectName}
              onChange={(e) => setProspectName(e.target.value)}
            />
          </div>

          {/* Prospect company */}
          <div className="space-y-2">
            <Label>Firma</Label>
            <Input
              placeholder="Nazwa firmy"
              value={prospectCompany}
              onChange={(e) => setProspectCompany(e.target.value)}
            />
          </div>

          {/* Prospect position */}
          <div className="space-y-2">
            <Label>Stanowisko</Label>
            <Input
              placeholder="CEO, Dyrektor, Manager..."
              value={prospectPosition}
              onChange={(e) => setProspectPosition(e.target.value)}
            />
          </div>

          {/* Contact info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>LinkedIn</Label>
              <Input
                placeholder="linkedin.com/in/..."
                value={prospectLinkedin}
                onChange={(e) => setProspectLinkedin(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="jan@firma.pl"
                value={prospectEmail}
                onChange={(e) => setProspectEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Telefon</Label>
            <Input
              placeholder="+48 123 456 789"
              value={prospectPhone}
              onChange={(e) => setProspectPhone(e.target.value)}
            />
          </div>

          {/* Assignment */}
          <div className="space-y-2">
            <Label>Kto szuka</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz osobę..." />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.director_id}>
                    {member.director?.full_name || 'Nieznany'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Priorytet</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as DealPriority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urgent">Pilny</SelectItem>
                <SelectItem value="high">Wysoki</SelectItem>
                <SelectItem value="medium">Średni</SelectItem>
                <SelectItem value="low">Niski</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notatki</Label>
            <Textarea
              placeholder="Dlaczego szukamy tej osoby? Jak możemy do niej dotrzeć?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Anuluj
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!prospectName.trim() || createProspect.isPending}
          >
            {createProspect.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Dodaj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
