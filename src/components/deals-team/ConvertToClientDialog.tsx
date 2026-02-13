import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useProductCategories } from '@/hooks/useProductCategories';
import { useConvertToClient, useAddClientProduct, CATEGORY_PROBABILITY } from '@/hooks/useTeamClients';
import { toast } from 'sonner';

interface ConvertToClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamContactId: string;
  teamId: string;
  contactName: string;
}

export function ConvertToClientDialog({
  open, onOpenChange, teamContactId, teamId, contactName,
}: ConvertToClientDialogProps) {
  const { data: categories = [] } = useProductCategories(teamId);
  const convertToClient = useConvertToClient();
  const addProduct = useAddClientProduct();

  const [productCategoryId, setProductCategoryId] = useState('');
  const [dealValue, setDealValue] = useState('');
  const [commissionPercent, setCommissionPercent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-fill commission from category
  const handleCategoryChange = (catId: string) => {
    setProductCategoryId(catId);
    const cat = categories.find(c => c.id === catId);
    if (cat && cat.default_commission_percent > 0) {
      setCommissionPercent(String(cat.default_commission_percent));
    }
  };

  const handleSubmit = async () => {
    if (!productCategoryId || !dealValue) {
      toast.error('Wypełnij grupę produktów i wartość składki');
      return;
    }
    const numValue = parseFloat(dealValue);
    const numCommission = parseFloat(commissionPercent) || 0;
    if (isNaN(numValue) || numValue <= 0) {
      toast.error('Podaj prawidłową wartość składki');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Convert to client
      await convertToClient.mutateAsync({ id: teamContactId, teamId });
      // 2. Add product
      await addProduct.mutateAsync({
        teamId,
        teamContactId,
        productCategoryId,
        dealValue: numValue,
        commissionPercent: numCommission,
        expectedCommission: numValue * (numCommission / 100),
        probabilityPercent: CATEGORY_PROBABILITY.client || 100,
      });
      toast.success('Kontakt skonwertowany na klienta');
      onOpenChange(false);
      // Reset
      setProductCategoryId('');
      setDealValue('');
      setCommissionPercent('');
    } catch {
      // errors handled in hooks
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Konwertuj na klienta</DialogTitle>
          <p className="text-sm text-muted-foreground">{contactName}</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Grupa produktów *</Label>
            <Select value={productCategoryId} onValueChange={handleCategoryChange}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz grupę..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Wartość składki (PLN) *</Label>
            <Input
              type="number"
              min={0}
              step={100}
              placeholder="np. 50000"
              value={dealValue}
              onChange={e => setDealValue(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Prowizja (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.5}
              placeholder="np. 15"
              value={commissionPercent}
              onChange={e => setCommissionPercent(e.target.value)}
            />
            {dealValue && commissionPercent && (
              <p className="text-xs text-muted-foreground">
                Prowizja: {(parseFloat(dealValue) * parseFloat(commissionPercent) / 100).toLocaleString('pl-PL')} PLN
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Anuluj</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            ✅ Konwertuj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
