import { useState } from 'react';
import { format } from 'date-fns';
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
import { POLICY_TYPE_LABELS, type PolicyType } from './types';

interface AddPolicyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onSubmit: (data: {
    company_id: string;
    policy_type: PolicyType;
    policy_name: string;
    policy_number?: string;
    insurer_name?: string;
    broker_name?: string;
    start_date: string;
    end_date: string;
    sum_insured?: number;
    premium?: number;
    notes?: string;
  }) => void;
  isLoading?: boolean;
}

export function AddPolicyModal({
  open,
  onOpenChange,
  companyId,
  onSubmit,
  isLoading,
}: AddPolicyModalProps) {
  const [formData, setFormData] = useState({
    policy_type: 'property' as PolicyType,
    policy_name: '',
    policy_number: '',
    insurer_name: '',
    broker_name: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    sum_insured: '',
    premium: '',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSubmit({
      company_id: companyId,
      policy_type: formData.policy_type,
      policy_name: formData.policy_name,
      policy_number: formData.policy_number || undefined,
      insurer_name: formData.insurer_name || undefined,
      broker_name: formData.broker_name || undefined,
      start_date: formData.start_date,
      end_date: formData.end_date,
      sum_insured: formData.sum_insured ? parseFloat(formData.sum_insured) : undefined,
      premium: formData.premium ? parseFloat(formData.premium) : undefined,
      notes: formData.notes || undefined,
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset form
    setFormData({
      policy_type: 'property',
      policy_name: '',
      policy_number: '',
      insurer_name: '',
      broker_name: '',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      sum_insured: '',
      premium: '',
      notes: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Dodaj nową polisę</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="policy_type">Typ polisy *</Label>
              <Select
                value={formData.policy_type}
                onValueChange={(v) => setFormData(prev => ({ ...prev, policy_type: v as PolicyType }))}
              >
                <SelectTrigger id="policy_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(POLICY_TYPE_LABELS) as PolicyType[]).map(type => (
                    <SelectItem key={type} value={type}>
                      {POLICY_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="policy_number">Numer polisy</Label>
              <Input
                id="policy_number"
                value={formData.policy_number}
                onChange={(e) => setFormData(prev => ({ ...prev, policy_number: e.target.value }))}
                placeholder="np. POL-2026-001"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="policy_name">Nazwa polisy *</Label>
            <Input
              id="policy_name"
              value={formData.policy_name}
              onChange={(e) => setFormData(prev => ({ ...prev, policy_name: e.target.value }))}
              placeholder="np. Ubezpieczenie majątkowe - budynki"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="insurer_name">Ubezpieczyciel</Label>
              <Input
                id="insurer_name"
                value={formData.insurer_name}
                onChange={(e) => setFormData(prev => ({ ...prev, insurer_name: e.target.value }))}
                placeholder="np. PZU SA"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="broker_name">Broker</Label>
              <Input
                id="broker_name"
                value={formData.broker_name}
                onChange={(e) => setFormData(prev => ({ ...prev, broker_name: e.target.value }))}
                placeholder="np. Marsh Polska"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Data rozpoczęcia *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">Data zakończenia *</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sum_insured">Suma ubezpieczenia (PLN)</Label>
              <Input
                id="sum_insured"
                type="number"
                value={formData.sum_insured}
                onChange={(e) => setFormData(prev => ({ ...prev, sum_insured: e.target.value }))}
                placeholder="np. 10000000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="premium">Składka (PLN)</Label>
              <Input
                id="premium"
                type="number"
                value={formData.premium}
                onChange={(e) => setFormData(prev => ({ ...prev, premium: e.target.value }))}
                placeholder="np. 50000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notatki</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Dodatkowe uwagi..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Anuluj
            </Button>
            <Button type="submit" disabled={isLoading || !formData.policy_name}>
              {isLoading ? 'Dodawanie...' : 'Dodaj polisę'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
