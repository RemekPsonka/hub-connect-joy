import { useState } from 'react';
import { Plus, Trash2, BarChart3, Loader2 } from 'lucide-react';
import { useClientProducts, useAddClientProduct, useDeleteClientProduct, CATEGORY_PROBABILITY } from '@/hooks/useTeamClients';
import { useProductCategories } from '@/hooks/useProductCategories';
import { formatCompactCurrency } from '@/lib/formatCurrency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RevenueForecastDialog } from './RevenueForecastDialog';

interface ClientProductsPanelProps {
  teamContactId: string;
  teamId: string;
  category: string; // 'hot' | 'top' | 'lead' | 'cold' | 'client'
}

export function ClientProductsPanel({ teamContactId, teamId, category }: ClientProductsPanelProps) {
  const { data: products = [] } = useClientProducts(teamContactId);
  const { data: categories = [] } = useProductCategories(teamId);
  const addProduct = useAddClientProduct();
  const deleteProduct = useDeleteClientProduct();

  const [showAdd, setShowAdd] = useState(false);
  const [catId, setCatId] = useState('');
  const [dealValue, setDealValue] = useState('');
  const [commission, setCommission] = useState('');
  const [forecastProductId, setForecastProductId] = useState<string | null>(null);
  const forecastProduct = products.find((p) => p.id === forecastProductId);

  const probability = CATEGORY_PROBABILITY[category] || 100;

  const isClient = category === 'client';

  const handleAdd = async () => {
    if (!catId || !dealValue) return;
    const val = parseFloat(dealValue);
    const rawCom = parseFloat(commission) || 0;

    const commissionPercent = isClient ? rawCom : (val > 0 ? (rawCom / val) * 100 : 0);
    const expectedCommission = isClient ? val * (rawCom / 100) : rawCom;

    await addProduct.mutateAsync({
      teamId,
      teamContactId,
      productCategoryId: catId,
      dealValue: val,
      expectedCommission,
      commissionPercent,
      probabilityPercent: probability,
    });
    setShowAdd(false);
    setCatId('');
    setDealValue('');
    setCommission('');
  };

  const totalValue = products.reduce((s, p) => s + p.deal_value, 0);
  const totalCommission = products.reduce((s, p) => s + p.expected_commission, 0);
  const weightedValue = products.reduce((s, p) => s + p.deal_value * (p.probability_percent / 100), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase">Produkty / Deale</h4>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-3 w-3 mr-1" />
          Dodaj
        </Button>
      </div>

      {/* Product list */}
      {products.length > 0 ? (
        <div className="space-y-2">
          {products.map((p) => (
            <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30 text-xs">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.category_color || '#6366f1' }} />
              <span className="font-medium flex-1 truncate">{p.category_name || 'Produkt'}</span>
              <span className="font-semibold">{formatCompactCurrency(p.deal_value)}</span>
              {p.expected_commission > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5">
                  {formatCompactCurrency(p.expected_commission)} prow.
                </Badge>
              )}
              {category === 'client' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setForecastProductId(p.id)}
                >
                  <BarChart3 className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => deleteProduct.mutate({ id: p.id, teamContactId, teamId })}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <div className="flex justify-between text-xs pt-1 border-t">
            <span className="text-muted-foreground">Razem</span>
            <div className="text-right space-y-0.5">
              <p className="font-semibold">{formatCompactCurrency(totalValue)}</p>
              {category !== 'client' && (
                <p className="text-muted-foreground">Ważona ({probability}%): {formatCompactCurrency(weightedValue)}</p>
              )}
              {totalCommission > 0 && (
                <p className="text-muted-foreground">Prowizja: {formatCompactCurrency(totalCommission)}</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Brak produktów</p>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="space-y-2 p-3 border rounded-lg">
          <Label className="text-xs">Grupa produktów</Label>
          <Select value={catId} onValueChange={setCatId}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Wybierz grupę..." />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    {c.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Wartość deala (PLN)</Label>
              <Input value={dealValue} onChange={(e) => setDealValue(e.target.value)} type="number" className="h-8 text-xs" placeholder="0" />
            </div>
            <div>
              <Label className="text-xs">{isClient ? 'Prowizja (%)' : 'Prowizja (PLN)'}</Label>
              <Input value={commission} onChange={(e) => setCommission(e.target.value)} type="number" className="h-8 text-xs" placeholder={isClient ? 'np. 8' : '0'} min={isClient ? 0 : undefined} max={isClient ? 100 : undefined} />
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" className="flex-1 text-xs" onClick={handleAdd} disabled={!catId || !dealValue || addProduct.isPending}>
              {addProduct.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Dodaj produkt
            </Button>
            <Button size="sm" variant="outline" className="text-xs" onClick={() => setShowAdd(false)}>
              Anuluj
            </Button>
          </div>
        </div>
      )}

      {/* Revenue Forecast Dialog */}
      {forecastProduct && (
        <RevenueForecastDialog
          open={!!forecastProductId}
          onOpenChange={(open) => !open && setForecastProductId(null)}
          clientProduct={forecastProduct}
        />
      )}
    </div>
  );
}
