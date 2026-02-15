import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Link2 } from 'lucide-react';
import { useCreateConnector } from '@/hooks/useResources';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';

const STRENGTHS = [
  { value: 'direct', label: 'Bezpośredni' },
  { value: 'strong', label: 'Silny' },
  { value: 'moderate', label: 'Umiarkowany' },
  { value: 'weak', label: 'Słaby' },
];

export function AddConnectorDialog({ entryId }: { entryId: string }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [description, setDescription] = useState('');
  const [strength, setStrength] = useState('moderate');
  const { director } = useAuth();
  const create = useCreateConnector();

  const { data: contacts } = useQuery({
    queryKey: ['resource-contact-search', search, director?.tenant_id],
    queryFn: async () => {
      if (!search.trim() || search.length < 2) return [];
      const { data, error } = await supabase
        .from('contacts')
        .select('id, full_name, company, position')
        .eq('tenant_id', director!.tenant_id)
        .ilike('full_name', `%${search}%`)
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!director?.tenant_id && search.length >= 2,
  });

  const handleSubmit = () => {
    if (!selectedContactId) return;
    create.mutate({
      resource_entry_id: entryId,
      contact_id: selectedContactId,
      relationship_description: description.trim() || undefined,
      strength,
    }, {
      onSuccess: () => { setOpen(false); setSearch(''); setSelectedContactId(''); setDescription(''); },
    });
  };

  const selectedContact = contacts?.find(c => c.id === selectedContactId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm"><Link2 className="h-3.5 w-3.5 mr-1" />Połącz kontakt</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Połącz kontakt z CRM</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Szukaj kontaktu</Label>
            <Input value={search} onChange={e => { setSearch(e.target.value); setSelectedContactId(''); }} placeholder="Wpisz imię lub nazwisko..." />
            {contacts && contacts.length > 0 && !selectedContactId && (
              <div className="mt-1 border rounded-md max-h-40 overflow-y-auto">
                {contacts.map(c => (
                  <button key={c.id} onClick={() => { setSelectedContactId(c.id); setSearch(c.full_name); }}
                    className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b last:border-b-0">
                    <span className="font-medium">{c.full_name}</span>
                    {c.company && <span className="text-muted-foreground ml-2">@ {c.company}</span>}
                  </button>
                ))}
              </div>
            )}
            {selectedContact && (
              <p className="text-sm text-muted-foreground mt-1">Wybrany: <strong>{selectedContact.full_name}</strong></p>
            )}
          </div>
          <div>
            <Label>Siła połączenia</Label>
            <Select value={strength} onValueChange={setStrength}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STRENGTHS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Opis relacji</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="np. znajomy ze studiów, zna dyrektora od 5 lat" />
          </div>
          <Button onClick={handleSubmit} disabled={!selectedContactId || create.isPending} className="w-full">
            {create.isPending ? 'Łączenie...' : 'Połącz'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
