import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGenerateSnapshot } from '@/hooks/useGenerateSnapshot';
import { PERIOD_TYPE_LABELS, type SGUPeriodType } from '@/types/sgu-report-snapshot';

const schema = z
  .object({
    period_type: z.enum(['weekly', 'monthly', 'quarterly', 'yearly', 'custom']),
    period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Wymagana data'),
    period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  })
  .refine(
    (v) => v.period_type !== 'custom' || (v.period_end && v.period_end.length === 10),
    { message: 'Dla okresu niestandardowego wymagana jest data końcowa', path: ['period_end'] },
  );

type FormValues = z.infer<typeof schema>;

interface GenerateSnapshotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPeriodType?: SGUPeriodType;
}

export function GenerateSnapshotDialog({
  open,
  onOpenChange,
  defaultPeriodType = 'monthly',
}: GenerateSnapshotDialogProps) {
  const generate = useGenerateSnapshot();
  const [periodType, setPeriodType] = useState<SGUPeriodType>(defaultPeriodType);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      period_type: defaultPeriodType,
      period_start: new Date().toISOString().slice(0, 10),
      period_end: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    await generate.mutateAsync({
      period_type: values.period_type,
      period_start: values.period_start,
      period_end: values.period_end || undefined,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generuj raport SGU</DialogTitle>
          <DialogDescription>
            Snapshot zostanie zapisany i będzie dostępny dla całego zespołu partnerskiego.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Typ okresu</Label>
            <Select
              value={periodType}
              onValueChange={(v) => {
                setPeriodType(v as SGUPeriodType);
                reset({
                  period_type: v as SGUPeriodType,
                  period_start: new Date().toISOString().slice(0, 10),
                  period_end: '',
                });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PERIOD_TYPE_LABELS) as SGUPeriodType[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {PERIOD_TYPE_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" {...register('period_type')} value={periodType} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="period_start">Data początku okresu</Label>
            <Input id="period_start" type="date" {...register('period_start')} />
            {errors.period_start && (
              <p className="text-xs text-destructive">{errors.period_start.message}</p>
            )}
          </div>

          {periodType === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="period_end">Data końca okresu</Label>
              <Input id="period_end" type="date" {...register('period_end')} />
              {errors.period_end && (
                <p className="text-xs text-destructive">{errors.period_end.message}</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={generate.isPending}>
              {generate.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Generuj
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
