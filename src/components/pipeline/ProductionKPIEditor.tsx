import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { usePipelineKPI } from '@/hooks/usePipelineKPI';

const formSchema = z.object({
  target_premium: z.number().min(0, 'Wartość musi być dodatnia'),
  target_commission_rate: z.number().min(0).max(100).optional(),
  target_commission: z.number().min(0).optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ProductionKPIEditorProps {
  year: number;
}

export function ProductionKPIEditor({ year }: ProductionKPIEditorProps) {
  const [open, setOpen] = useState(false);
  const { yearlyTarget, upsertYearlyTarget, isLoading } = usePipelineKPI(year);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      target_premium: yearlyTarget?.target_premium || 0,
      target_commission_rate: yearlyTarget?.target_commission_rate || 15,
      target_commission: yearlyTarget?.target_commission || 0,
      notes: yearlyTarget?.notes || '',
    },
  });

  // Reset form when modal opens with current values
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      form.reset({
        target_premium: yearlyTarget?.target_premium || 0,
        target_commission_rate: yearlyTarget?.target_commission_rate || 15,
        target_commission: yearlyTarget?.target_commission || 0,
        notes: yearlyTarget?.notes || '',
      });
    }
    setOpen(isOpen);
  };

  const watchPremium = form.watch('target_premium');
  const watchRate = form.watch('target_commission_rate');
  const calculatedCommission = (watchPremium || 0) * ((watchRate || 0) / 100);

  const handleSubmit = (data: FormData) => {
    const commission = data.target_commission ?? calculatedCommission;

    upsertYearlyTarget.mutate(
      {
        target_premium: data.target_premium,
        target_commission_rate: data.target_commission_rate,
        target_commission: commission,
        notes: data.notes || null,
      },
      {
        onSuccess: () => setOpen(false),
      }
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Edytuj cele
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Cele KPI na rok {year}</DialogTitle>
          <DialogDescription>
            Ustaw roczne cele składki i prowizji dla swojego zespołu
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="target_premium"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cel składki rocznej (PLN) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={100000}
                      placeholder="np. 20000000"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Łączna składka do wygenerowania w ciągu roku
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="target_commission_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Średnia stawka prowizji (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      placeholder="np. 15"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Średni procent prowizji od składki
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="target_commission"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cel prowizji rocznej (PLN)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={10000}
                      placeholder={calculatedCommission.toFixed(0)}
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                    />
                  </FormControl>
                  <FormDescription>
                    Kalkulacja automatyczna: {formatCurrency(calculatedCommission)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notatki</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Opcjonalne uwagi dotyczące celów..."
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
                onClick={() => setOpen(false)}
              >
                Anuluj
              </Button>
              <Button type="submit" disabled={upsertYearlyTarget.isPending}>
                {upsertYearlyTarget.isPending ? 'Zapisywanie...' : 'Zapisz cele'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
