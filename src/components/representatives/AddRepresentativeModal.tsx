import { useState } from 'react';
import { useRepresentatives, CreateRepresentativeInput } from '@/hooks/useRepresentatives';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface AddRepresentativeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddRepresentativeModal({ isOpen, onClose }: AddRepresentativeModalProps) {
  const { createRepresentative, isCreating } = useRepresentatives();
  const [formData, setFormData] = useState<CreateRepresentativeInput>({
    full_name: '',
    email: '',
    password: '',
    role_type: 'sales_rep',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createRepresentative.mutateAsync(formData);
    
    setFormData({
      full_name: '',
      email: '',
      password: '',
      role_type: 'sales_rep',
    });
    onClose();
  };

  const handleChange = (field: keyof CreateRepresentativeInput, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Dodaj przedstawiciela</DialogTitle>
          <DialogDescription>
            Utwórz konto dla nowego przedstawiciela handlowego lub ambasadora.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Imię i nazwisko *</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => handleChange('full_name', e.target.value)}
              placeholder="Jan Kowalski"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="jan@firma.pl"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Hasło *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              placeholder="Min. 8 znaków"
              minLength={8}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role_type">Typ roli</Label>
            <Select
              value={formData.role_type}
              onValueChange={(value: 'sales_rep' | 'ambassador') => handleChange('role_type', value)}
            >
              <SelectTrigger id="role_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sales_rep">Przedstawiciel handlowy</SelectItem>
                <SelectItem value="ambassador">Ambasador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Anuluj
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Dodaj
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
