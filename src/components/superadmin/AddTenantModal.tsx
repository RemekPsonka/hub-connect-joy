import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface AddTenantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    tenantName: string;
    ownerEmail: string;
    ownerPassword: string;
    ownerFullName: string;
  }) => void;
  isLoading: boolean;
}

export function AddTenantModal({ open, onOpenChange, onSubmit, isLoading }: AddTenantModalProps) {
  const [tenantName, setTenantName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerFullName, setOwnerFullName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      tenantName,
      ownerEmail,
      ownerPassword,
      ownerFullName,
    });
  };

  const resetForm = () => {
    setTenantName('');
    setOwnerEmail('');
    setOwnerPassword('');
    setOwnerFullName('');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nowa organizacja</DialogTitle>
          <DialogDescription>
            Utwórz nową organizację wraz z jej właścicielem (owner).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="tenantName">Nazwa organizacji</Label>
              <Input
                id="tenantName"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                placeholder="np. Firma ABC"
                required
              />
            </div>
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Właściciel organizacji</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ownerFullName">Imię i nazwisko</Label>
              <Input
                id="ownerFullName"
                value={ownerFullName}
                onChange={(e) => setOwnerFullName(e.target.value)}
                placeholder="np. Jan Kowalski"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ownerEmail">Email</Label>
              <Input
                id="ownerEmail"
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="np. jan@firma.pl"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ownerPassword">Hasło</Label>
              <Input
                id="ownerPassword"
                type="password"
                value={ownerPassword}
                onChange={(e) => setOwnerPassword(e.target.value)}
                placeholder="Min. 6 znaków"
                minLength={6}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Utwórz organizację
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
