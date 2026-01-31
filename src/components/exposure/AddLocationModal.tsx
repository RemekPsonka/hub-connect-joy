import { useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { 
  type ActivityType, 
  ACTIVITY_TYPE_LABELS, 
  ACTIVITY_TYPE_COLORS 
} from './types';

interface AddLocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { 
    name: string; 
    address?: string; 
    city?: string; 
    activity_type: ActivityType;
  }) => void;
  isLoading?: boolean;
}

export function AddLocationModal({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: AddLocationModalProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [activityType, setActivityType] = useState<ActivityType>('office');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    onSubmit({
      name: name.trim(),
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      activity_type: activityType,
    });
    
    // Reset form
    setName('');
    setAddress('');
    setCity('');
    setActivityType('office');
  };

  const activityTypes: ActivityType[] = ['production', 'warehouse', 'office', 'retail'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dodaj lokalizację</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nazwa lokalizacji *</Label>
            <Input
              id="name"
              placeholder="np. Wrocław HQ, Fabryka Poznań"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address">Adres</Label>
            <Input
              id="address"
              placeholder="np. ul. Fabryczna 12"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="city">Miasto</Label>
            <Input
              id="city"
              placeholder="np. Wrocław"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Typ działalności</Label>
            <div className="flex flex-wrap gap-2">
              {activityTypes.map((activity) => (
                <Badge
                  key={activity}
                  variant={activityType === activity ? 'default' : 'outline'}
                  className={`cursor-pointer transition-colors ${
                    activityType === activity 
                      ? ACTIVITY_TYPE_COLORS[activity] + ' text-white border-transparent' 
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => setActivityType(activity)}
                >
                  {ACTIVITY_TYPE_LABELS[activity]}
                </Badge>
              ))}
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={!name.trim() || isLoading}>
              {isLoading ? 'Dodawanie...' : 'Dodaj lokalizację'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
