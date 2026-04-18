import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

interface ProductInput {
  value: string;
  commission: string;
  commissionTouched: boolean;
}

export function ConvertToClientDialog({
  open, onOpenChange, teamContactId, teamId, contactName,
}: ConvertToClientDialogProps) {
  const { data: categories = [] } = useProductCategories(teamId);
  const convertToClient = useConvertToClient();
  const addProduct = useAddClientProduct();

  const [inputs, setInputs] = useState<Record<string, ProductInput>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setInputs({});
    }
  }, [open]);

  const updateValue = (catId: string, value: string) => {
    setInputs(prev => {
      const current = prev[catId] || { value: '', commission: '', commissionTouched: false };
      const cat = categories.find(c => c.id === catId);
      // Auto-fill commission on first value entry
      let commission = current.commission;
      if (!current.commissionTouched && value && cat && cat.default_commission_percent > 0) {
        commission = String(cat.default_commission_percent);
      }
      return { ...prev, [catId]: { ...current, value, commission } };
    });
  };

  const updateCommission = (catId: string, commission: string) => {
    setInputs(prev => {
      const current = prev[catId] || { value: '', commission: '', commissionTouched: false };
      return { ...prev, [catId]: { ...current, commission, commissionTouched: true } };
    });
  };

  const rows = categories.map(cat => {
    const inp = inputs[cat.id] || { value: '', commission: '', commissionTouched: false };
    const v = parseFloat(inp.value) || 0;
    const c = parseFloat(inp.commission) || 0;
    const expected = v * c / 100;
    return { cat, inp, v, c, expected };
  });

  const totalValue = rows.reduce((s, r) => s + r.v, 0);
  const totalCommission = rows.reduce((s, r) => s + r.expected, 0);
  const filledCount = rows.filter(r => r.v > 0).length;

  const handleSubmit = async () => {
    const toSave = rows.filter(r => r.v > 0);
    if (toSave.length === 0) {
      toast.error('Wypełnij co najmniej jedną grupę produktów');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Convert to client
      await convertToClient.mutateAsync({ id: teamContactId, teamId });
      // 2. Add all products sequentially
      for (const r of toSave) {
        await addProduct.mutateAsync({
          teamId,
          teamContactId,
          productCategoryId: r.cat.id,
          dealValue: r.v,
          commissionPercent: r.c,
          expectedCommission: r.expected,
          probabilityPercent: CATEGORY_PROBABILITY.client || 100,
        });
      }
      toast.success(`Kontakt skonwertowany na klienta (${toSave.length} ${toSave.length === 1 ? 'produkt' : 'produkty'})`);
      onOpenChange(false);
      setInputs({});
    } catch {
      // errors handled in hooks
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Konwertuj na klienta</DialogTitle>
          <p className="text-sm text-muted-foreground">{contactName}</p>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {categories.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Brak grup produktów. Dodaj je w ustawieniach zespołu.
            </p>
          )}

          {rows.map(({ cat, inp, expected, v }) => (
            <div
              key={cat.id}
              className={`border rounded-lg p-3 transition-colors ${
                v > 0 ? 'border-primary/50 bg-primary/5' : 'border-border'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="font-medium text-sm">{cat.name}</span>
              </div>
              <div className="grid grid-cols-[1fr_120px_auto] gap-2 items-end">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Składka (PLN)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={100}
                    placeholder="0"
                    value={inp.value}
                    onChange={e => updateValue(cat.id, e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Prowizja (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    placeholder="0"
                    value={inp.commission}
                    onChange={e => updateCommission(cat.id, e.target.value)}
                  />
                </div>
                <div className="text-sm font-medium tabular-nums whitespace-nowrap pb-2 min-w-[100px] text-right">
                  {expected > 0
                    ? `${expected.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} PLN`
                    : <span className="text-muted-foreground">—</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filledCount > 0 && (
          <div className="border-t pt-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Suma składek:</span>
              <span className="font-semibold tabular-nums">
                {totalValue.toLocaleString('pl-PL')} PLN
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Suma prowizji:</span>
              <span className="font-semibold tabular-nums text-primary">
                {totalCommission.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} PLN
              </span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Anuluj</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || filledCount === 0}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            ✅ Konwertuj {filledCount > 0 && `(${filledCount})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
