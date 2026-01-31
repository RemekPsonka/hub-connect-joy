import { useState, useEffect } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { POLICY_TYPE_LABELS, type PolicyType, type InsurancePolicy } from './types';

interface EditPolicyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy: InsurancePolicy | null;
  onSubmit: (data: {
    id: string;
    policy_type?: PolicyType;
    policy_name?: string;
    policy_number?: string;
    insurer_name?: string;
    broker_name?: string;
    start_date?: string;
    end_date?: string;
    sum_insured?: number;
    premium?: number;
    notes?: string;
    is_our_policy?: boolean;
  }) => void;
  isLoading?: boolean;
}

export function EditPolicyModal({
  open,
  onOpenChange,
  policy,
  onSubmit,
  isLoading,
}: EditPolicyModalProps) {
  const [formData, setFormData] = useState({
    policy_type: 'property' as PolicyType,
    policy_name: '',
    policy_number: '',
    insurer_name: '',
    broker_name: '',
    start_date: '',
    end_date: '',
    sum_insured: '',
    premium: '',
    notes: '',
    is_our_policy: false,
  });

  // Load policy data when modal opens
  useEffect(() => {
    if (policy && open) {
      setFormData({
        policy_type: policy.policy_type,
        policy_name: policy.policy_name,
        policy_number: policy.policy_number || '',
        insurer_name: policy.insurer_name || '',
        broker_name: policy.broker_name || '',
        start_date: policy.start_date,
        end_date: policy.end_date,
        sum_insured: policy.sum_insured?.toString() || '',
        premium: policy.premium?.toString() || '',
        notes: policy.notes || '',
        is_our_policy: policy.is_our_policy || false,
      });
    }
  }, [policy, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!policy) return;

    onSubmit({
      id: policy.id,
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
      is_our_policy: formData.is_our_policy,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edytuj polisę</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_policy_type">Typ polisy *</Label>
              <Select
                value={formData.policy_type}
                onValueChange={(v) => setFormData(prev => ({ ...prev, policy_type: v as PolicyType }))}
              >
                <SelectTrigger id="edit_policy_type">
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
              <Label htmlFor="edit_policy_number">Numer polisy</Label>
              <Input
                id="edit_policy_number"
                value={formData.policy_number}
                onChange={(e) => setFormData(prev => ({ ...prev, policy_number: e.target.value }))}
                placeholder="np. POL-2026-001"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_policy_name">Nazwa polisy *</Label>
            <Input
              id="edit_policy_name"
              value={formData.policy_name}
              onChange={(e) => setFormData(prev => ({ ...prev, policy_name: e.target.value }))}
              placeholder="np. Ubezpieczenie majątkowe - budynki"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_insurer_name">Ubezpieczyciel</Label>
              <Input
                id="edit_insurer_name"
                value={formData.insurer_name}
                onChange={(e) => setFormData(prev => ({ ...prev, insurer_name: e.target.value }))}
                placeholder="np. PZU SA"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_broker_name">Broker</Label>
              <Input
                id="edit_broker_name"
                value={formData.broker_name}
                onChange={(e) => setFormData(prev => ({ ...prev, broker_name: e.target.value }))}
                placeholder="np. Marsh Polska"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_start_date">Data rozpoczęcia *</Label>
              <Input
                id="edit_start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_end_date">Data zakończenia *</Label>
              <Input
                id="edit_end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_sum_insured">Suma ubezpieczenia (PLN)</Label>
              <Input
                id="edit_sum_insured"
                type="number"
                value={formData.sum_insured}
                onChange={(e) => setFormData(prev => ({ ...prev, sum_insured: e.target.value }))}
                placeholder="np. 10000000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_premium">Składka (PLN)</Label>
              <Input
                id="edit_premium"
                type="number"
                value={formData.premium}
                onChange={(e) => setFormData(prev => ({ ...prev, premium: e.target.value }))}
                placeholder="np. 50000"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="edit_is_our_policy"
              checked={formData.is_our_policy}
              onCheckedChange={(checked) =>
                setFormData(prev => ({ ...prev, is_our_policy: !!checked }))
              }
            />
            <Label htmlFor="edit_is_our_policy" className="text-sm font-medium cursor-pointer">
              Nasza polisa (obsługujemy jako broker)
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_notes">Notatki</Label>
            <Textarea
              id="edit_notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Dodatkowe uwagi..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={isLoading || !formData.policy_name}>
              {isLoading ? 'Zapisywanie...' : 'Zapisz zmiany'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
