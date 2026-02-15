import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { useCreateInstitution } from '@/hooks/useResources';

const CATEGORIES = [
  { value: 'bank', label: 'Bank' },
  { value: 'ubezpieczyciel', label: 'Ubezpieczyciel' },
  { value: 'leasing', label: 'Firma leasingowa' },
  { value: 'kancelaria', label: 'Kancelaria' },
  { value: 'fundusz', label: 'Fundusz' },
  { value: 'inne', label: 'Inne' },
];

export function AddInstitutionDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('bank');
  const [description, setDescription] = useState('');
  const create = useCreateInstitution();

  const handleSubmit = () => {
    if (!name.trim()) return;
    create.mutate({ name: name.trim(), category, description: description.trim() || undefined }, {
      onSuccess: () => { setOpen(false); setName(''); setDescription(''); },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" />Dodaj instytucję</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nowa instytucja</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nazwa</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="np. PKO BP" />
          </div>
          <div>
            <Label>Kategoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Opis (opcjonalnie)</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <Button onClick={handleSubmit} disabled={!name.trim() || create.isPending} className="w-full">
            {create.isPending ? 'Dodawanie...' : 'Dodaj'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
