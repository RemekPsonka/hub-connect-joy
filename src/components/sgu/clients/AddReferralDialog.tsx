import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useAddClientReferral } from '@/hooks/useClientReferrals';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referrerId: string;
  referrerName: string;
}

export function AddReferralDialog({ open, onOpenChange, referrerId, referrerName }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const add = useAddClientReferral();

  function reset() {
    setName('');
    setPhone('');
    setEmail('');
    setNotes('');
  }

  async function handleSubmit() {
    if (name.trim().length < 2) return;
    await add.mutateAsync({
      referrerId,
      referredName: name.trim(),
      referredPhone: phone.trim() || undefined,
      referredEmail: email.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dodaj polecenie</DialogTitle>
          <DialogDescription>
            Polecenie od: <b>{referrerName}</b>. Po 3 zaakceptowanych poleceniach klient awansuje na
            ambasadora.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="ref-name">Imię i nazwisko *</Label>
            <Input id="ref-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="ref-phone">Telefon</Label>
              <Input id="ref-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ref-email">Email</Label>
              <Input id="ref-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ref-notes">Notatki</Label>
            <Textarea id="ref-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button onClick={handleSubmit} disabled={add.isPending || name.trim().length < 2}>
            Dodaj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
