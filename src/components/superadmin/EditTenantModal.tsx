import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
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

interface Tenant {
  id: string;
  name: string;
  owner?: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface EditTenantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant | null;
  onSubmit: (data: {
    tenantId: string;
    tenantName: string;
    ownerId?: string;
    ownerFullName?: string;
    ownerEmail?: string;
    ownerPassword?: string;
  }) => void;
  isLoading: boolean;
}

export function EditTenantModal({
  open,
  onOpenChange,
  tenant,
  onSubmit,
  isLoading,
}: EditTenantModalProps) {
  const [tenantName, setTenantName] = useState('');
  const [ownerFullName, setOwnerFullName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tenant) {
      setTenantName(tenant.name);
      setOwnerFullName(tenant.owner?.full_name || '');
      setOwnerEmail(tenant.owner?.email || '');
      setOwnerPassword('');
      setConfirmPassword('');
      setError('');
    }
  }, [tenant]);

  const resetForm = () => {
    setTenantName('');
    setOwnerFullName('');
    setOwnerEmail('');
    setOwnerPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!tenantName.trim()) {
      setError('Nazwa organizacji jest wymagana');
      return;
    }

    if (ownerPassword && ownerPassword.length < 6) {
      setError('Hasło musi mieć co najmniej 6 znaków');
      return;
    }

    if (ownerPassword && ownerPassword !== confirmPassword) {
      setError('Hasła nie są zgodne');
      return;
    }

    if (!tenant) return;

    onSubmit({
      tenantId: tenant.id,
      tenantName: tenantName.trim(),
      ownerId: tenant.owner?.id,
      ownerFullName: ownerFullName.trim() || undefined,
      ownerEmail: ownerEmail.trim() || undefined,
      ownerPassword: ownerPassword || undefined,
    });
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
          <DialogTitle>Edytuj organizację</DialogTitle>
          <DialogDescription>
            Zmień dane organizacji i jej właściciela
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tenantName">Nazwa organizacji</Label>
            <Input
              id="tenantName"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="Nazwa organizacji"
              required
            />
          </div>

          {tenant?.owner && (
            <>
              <div className="space-y-2">
                <Label htmlFor="ownerFullName">Imię i nazwisko właściciela</Label>
                <Input
                  id="ownerFullName"
                  value={ownerFullName}
                  onChange={(e) => setOwnerFullName(e.target.value)}
                  placeholder="Jan Kowalski"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ownerEmail">Email właściciela</Label>
                <Input
                  id="ownerEmail"
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="jan@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ownerPassword">Nowe hasło (opcjonalnie)</Label>
                <div className="relative">
                  <Input
                    id="ownerPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    placeholder="Zostaw puste, aby nie zmieniać"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              {ownerPassword && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Potwierdź hasło</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Potwierdź nowe hasło"
                  />
                </div>
              )}
            </>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Zapisywanie...' : 'Zapisz zmiany'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
