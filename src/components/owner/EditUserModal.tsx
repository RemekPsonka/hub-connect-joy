import { useState, useEffect } from 'react';
import { Pencil, Loader2, Eye, EyeOff } from 'lucide-react';
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
import type { TenantUser } from '@/hooks/useOwnerPanel';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: TenantUser | null;
  onSave: (data: { userId: string; email?: string; fullName?: string; password?: string }) => Promise<void>;
  isLoading: boolean;
}

export default function EditUserModal({ isOpen, onClose, user, onSave, isLoading }: EditUserModalProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setEmail(user.email || '');
      setPassword('');
      setConfirmPassword('');
      setError('');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user) return;

    // Validate passwords match if password is being changed
    if (password && password !== confirmPassword) {
      setError('Hasła nie są zgodne');
      return;
    }

    if (password && password.length < 6) {
      setError('Hasło musi mieć co najmniej 6 znaków');
      return;
    }

    const updateData: { userId: string; email?: string; fullName?: string; password?: string } = {
      userId: user.user_id
    };

    // Only include changed fields
    if (email !== user.email) updateData.email = email;
    if (fullName !== user.full_name) updateData.fullName = fullName;
    if (password) updateData.password = password;

    // Check if anything changed
    if (!updateData.email && !updateData.fullName && !updateData.password) {
      onClose();
      return;
    }

    try {
      await onSave(updateData);
      onClose();
    } catch (err) {
      // Error is handled by the hook
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setPassword('');
      setConfirmPassword('');
      setError('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Edytuj użytkownika
          </DialogTitle>
          <DialogDescription>
            Zmień dane użytkownika. Pozostaw pole hasła puste, aby nie zmieniać.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-fullName">Imię i nazwisko</Label>
            <Input
              id="edit-fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jan Kowalski"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-email">Email (login)</Label>
            <Input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jan@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-password">Nowe hasło (opcjonalnie)</Label>
            <div className="relative">
              <Input
                id="edit-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Pozostaw puste, aby nie zmieniać"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
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

          {password && (
            <div className="space-y-2">
              <Label htmlFor="edit-confirmPassword">Potwierdź hasło</Label>
              <Input
                id="edit-confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Powtórz nowe hasło"
                required={!!password}
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Anuluj
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Zapisz zmiany
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
