import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useCreateResourceEntry } from '@/hooks/useResources';

const IMPORTANCE = [
  { value: 'low', label: 'Niska' },
  { value: 'medium', label: 'Średnia' },
  { value: 'high', label: 'Wysoka' },
  { value: 'critical', label: 'Krytyczna' },
];

export function AddResourceEntryDialog({ institutionId }: { institutionId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [personName, setPersonName] = useState('');
  const [personPosition, setPersonPosition] = useState('');
  const [notes, setNotes] = useState('');
  const [importance, setImportance] = useState('medium');
  const create = useCreateResourceEntry();

  const handleSubmit = () => {
    if (!title.trim()) return;
    create.mutate({
      institution_id: institutionId,
      title: title.trim(),
      person_name: personName.trim() || undefined,
      person_position: personPosition.trim() || undefined,
      notes: notes.trim() || undefined,
      importance,
    }, {
      onSuccess: () => { setOpen(false); setTitle(''); setPersonName(''); setPersonPosition(''); setNotes(''); },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm"><Plus className="h-3.5 w-3.5 mr-1" />Dodaj zasób</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nowy zasób</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Tytuł / Dział</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="np. Zarząd - Kredyty Korporacyjne" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Osoba (opcjonalnie)</Label><Input value={personName} onChange={e => setPersonName(e.target.value)} placeholder="Imię i nazwisko" /></div>
            <div><Label>Stanowisko</Label><Input value={personPosition} onChange={e => setPersonPosition(e.target.value)} placeholder="Dyrektor" /></div>
          </div>
          <div>
            <Label>Ważność</Label>
            <Select value={importance} onValueChange={setImportance}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{IMPORTANCE.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Notatki</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} /></div>
          <Button onClick={handleSubmit} disabled={!title.trim() || create.isPending} className="w-full">
            {create.isPending ? 'Dodawanie...' : 'Dodaj'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
