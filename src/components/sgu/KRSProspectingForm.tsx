import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, Loader2 } from 'lucide-react';
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
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { PKDAutocomplete } from './PKDAutocomplete';
import { useStartKRSProspecting } from '@/hooks/useStartKRSProspecting';

const WOJEWODZTWA = [
  'dolnośląskie',
  'kujawsko-pomorskie',
  'lubelskie',
  'lubuskie',
  'łódzkie',
  'małopolskie',
  'mazowieckie',
  'opolskie',
  'podkarpackie',
  'podlaskie',
  'pomorskie',
  'śląskie',
  'świętokrzyskie',
  'warmińsko-mazurskie',
  'wielkopolskie',
  'zachodniopomorskie',
];

const schema = z.object({
  miasto: z.string().optional(),
  promien_km: z.number().min(0).max(100).default(0),
  employees_min: z.coerce.number().int().min(0).optional(),
  employees_max: z.coerce.number().int().min(0).optional(),
  max_results: z.coerce.number().int().min(1).max(500).default(100),
  active_only: z.boolean().default(true),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onJobStarted: (jobId: string) => void;
}

export function KRSProspectingForm({ onJobStarted }: Props) {
  const [pkdCodes, setPkdCodes] = useState<string[]>([]);
  const [wojewodztwo, setWojewodztwo] = useState<string>('');
  const startMutation = useStartKRSProspecting();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { promien_km: 0, max_results: 100, active_only: true },
  });

  const promien = watch('promien_km') ?? 0;
  const activeOnly = watch('active_only') ?? true;

  const onSubmit = async (values: FormValues) => {
    const result = await startMutation.mutateAsync({
      pkd_codes: pkdCodes.length > 0 ? pkdCodes : undefined,
      wojewodztwo: wojewodztwo || undefined,
      miasto: values.miasto || undefined,
      promien_km: values.promien_km,
      employees_min: values.employees_min,
      employees_max: values.employees_max,
      max_results: values.max_results,
      active_only: values.active_only,
    });
    onJobStarted(result.job_id);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>Kody PKD</Label>
        <PKDAutocomplete value={pkdCodes} onChange={setPkdCodes} />
        <p className="text-xs text-muted-foreground">
          Wybierz jedną lub więcej branż. Możesz też zostawić puste i filtrować po lokalizacji.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Województwo</Label>
          <Select value={wojewodztwo} onValueChange={setWojewodztwo}>
            <SelectTrigger>
              <SelectValue placeholder="Wszystkie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=" ">— wszystkie —</SelectItem>
              {WOJEWODZTWA.map((w) => (
                <SelectItem key={w} value={w}>
                  {w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="miasto">Miasto</Label>
          <Input id="miasto" placeholder="np. Warszawa" {...register('miasto')} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Promień (km): {promien}</Label>
        <Slider
          value={[promien]}
          min={0}
          max={100}
          step={5}
          onValueChange={(v) => setValue('promien_km', v[0])}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="employees_min">Zatrudnienie min.</Label>
          <Input id="employees_min" type="number" min={0} {...register('employees_min')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="employees_max">Zatrudnienie max.</Label>
          <Input id="employees_max" type="number" min={0} {...register('employees_max')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="max_results">Max wyników (1-500)</Label>
          <Input
            id="max_results"
            type="number"
            min={1}
            max={500}
            {...register('max_results')}
            aria-invalid={!!errors.max_results}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <Checkbox
          checked={activeOnly}
          onCheckedChange={(v) => setValue('active_only', !!v)}
        />
        Tylko aktywne firmy
      </label>

      <Button type="submit" disabled={startMutation.isPending} className="gap-2">
        {startMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Search className="h-4 w-4" />
        )}
        Znajdź kandydatów
      </Button>
    </form>
  );
}
