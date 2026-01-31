import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { POLICY_TYPE_LABELS, PolicyType } from '@/components/renewal/types';
import { DEFAULT_COMMISSION_RATES } from '@/hooks/useInsuranceProductsCatalog';

const MONTH_NAMES = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
];

const formSchema = z.object({
  production_month: z.number().min(1).max(12),
  product_category: z.string().min(1, 'Wybierz kategorię'),
  forecasted_premium: z.number().min(0).optional(),
  actual_premium: z.number().min(0).optional(),
  commission_rate: z.number().min(0).max(100).optional(),
  actual_commission: z.number().min(0).optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AddProductionRecordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  month: number;
  onSubmit: (data: {
    production_year: number;
    production_month: number;
    product_category: string;
    forecasted_premium?: number;
    actual_premium?: number;
    commission_rate?: number;
    forecasted_commission?: number;
    actual_commission?: number;
    notes?: string;
  }) => void;
  isLoading?: boolean;
}

export function AddProductionRecordModal({
  open,
  onOpenChange,
  year,
  month,
  onSubmit,
  isLoading,
}: AddProductionRecordModalProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      production_month: month,
      product_category: '',
      forecasted_premium: 0,
      actual_premium: 0,
      commission_rate: 15,
      actual_commission: 0,
      notes: '',
    },
  });

  const watchCategory = form.watch('product_category');
  const watchActualPremium = form.watch('actual_premium');
  const watchCommissionRate = form.watch('commission_rate');

  // Auto-calculate commission when premium or rate changes
  const calculatedCommission = (watchActualPremium || 0) * ((watchCommissionRate || 0) / 100);

  // Update default commission rate when category changes
  const handleCategoryChange = (category: string) => {
    form.setValue('product_category', category);
    const defaultRate = DEFAULT_COMMISSION_RATES[category as PolicyType] || 15;
    form.setValue('commission_rate', defaultRate);
  };

  const handleSubmit = (data: FormData) => {
    const forecastedCommission = (data.forecasted_premium || 0) * ((data.commission_rate || 0) / 100);
    const actualCommission = data.actual_commission ?? calculatedCommission;

    onSubmit({
      production_year: year,
      production_month: data.production_month,
      product_category: data.product_category,
      forecasted_premium: data.forecasted_premium || 0,
      actual_premium: data.actual_premium || 0,
      commission_rate: data.commission_rate,
      forecasted_commission: forecastedCommission,
      actual_commission: actualCommission,
      notes: data.notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Dodaj rekord produkcji</DialogTitle>
          <DialogDescription>
            Wprowadź dane produkcji za {MONTH_NAMES[month - 1]} {year}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="production_month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Miesiąc</FormLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(parseInt(v))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MONTH_NAMES.map((name, idx) => (
                          <SelectItem key={idx} value={String(idx + 1)}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="product_category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategoria ryzyka *</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={handleCategoryChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(POLICY_TYPE_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="forecasted_premium"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Składka prognozowana (PLN)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="actual_premium"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Składka realna (PLN)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="commission_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stawka prowizji (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="actual_commission"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prowizja realna (PLN)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder={calculatedCommission.toFixed(0)}
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notatki</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Opcjonalne uwagi..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Anuluj
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Zapisywanie...' : 'Dodaj'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
