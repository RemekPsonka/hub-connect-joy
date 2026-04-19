import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const schema = z.object({
  full_name: z.string().trim().min(2, 'Min. 2 znaki').max(120),
  phone: z
    .string()
    .trim()
    .regex(/^(\+48)?[\s0-9-]{9,15}$/, 'Niepoprawny telefon')
    .optional()
    .or(z.literal('')),
  email: z.string().trim().email('Niepoprawny email').optional().or(z.literal('')),
  company_name: z.string().trim().max(200).optional().or(z.literal('')),
  nip: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, 'NIP = 10 cyfr')
    .optional()
    .or(z.literal('')),
  expected_annual_premium_pln: z.coerce.number().min(0).max(100_000_000).optional(),
  notes: z.string().max(500).optional().or(z.literal('')),
  source: z.string().default('Ręczne'),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface AddLeadResponse {
  deal_team_contact_id: string;
  contact_id?: string;
  created: boolean;
  duplicate?: boolean;
  error?: string;
}

export function AddLeadDialog({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: '',
      phone: '',
      email: '',
      company_name: '',
      nip: '',
      expected_annual_premium_pln: 0,
      notes: '',
      source: 'Ręczne',
    },
  });

  const onSubmit = async (values: FormData) => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('sgu-add-lead', {
        body: {
          full_name: values.full_name,
          phone: values.phone || null,
          email: values.email || null,
          company_name: values.company_name || null,
          nip: values.nip || null,
          expected_annual_premium_pln: values.expected_annual_premium_pln ?? 0,
          notes: values.notes || null,
          source: values.source,
        },
      });
      if (error) throw error;
      const r = data as AddLeadResponse;
      if (r.error) throw new Error(r.error);

      if (r.duplicate) {
        setDuplicateId(r.deal_team_contact_id);
        return;
      }

      toast.success('Dodano leada');
      qc.invalidateQueries({ queryKey: ['sgu-prospects'] });
      qc.invalidateQueries({ queryKey: ['deal-team-contacts'] });
      handleClose(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Nie udało się dodać leada');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      form.reset();
      setDuplicateId(null);
    }
    onOpenChange(next);
  };

  const goToExisting = () => {
    if (!duplicateId) return;
    handleClose(false);
    navigate(`/sgu/pipeline?view=prospecting&highlight=${duplicateId}`);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Dodaj leada</DialogTitle>
          <DialogDescription>Nowy kontakt w lejku SGU (SGU-native).</DialogDescription>
        </DialogHeader>

        {duplicateId ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Lead z tym telefonem lub emailem już istnieje w zespole SGU.
            </p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Zamknij
              </Button>
              <Button onClick={goToExisting} className="gap-2">
                Otwórz istniejący <ArrowRight className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Imię i nazwisko *</Label>
              <Input id="full_name" {...form.register('full_name')} disabled={submitting} />
              {form.formState.errors.full_name && (
                <p className="text-xs text-destructive">{form.formState.errors.full_name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Telefon</Label>
                <Input id="phone" {...form.register('phone')} disabled={submitting} />
                {form.formState.errors.phone && (
                  <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...form.register('email')} disabled={submitting} />
                {form.formState.errors.email && (
                  <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="company_name">Firma</Label>
                <Input id="company_name" {...form.register('company_name')} disabled={submitting} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nip">NIP</Label>
                <Input id="nip" {...form.register('nip')} disabled={submitting} />
                {form.formState.errors.nip && (
                  <p className="text-xs text-destructive">{form.formState.errors.nip.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="premium">Oczekiwany przypis (PLN)</Label>
                <Input
                  id="premium"
                  type="number"
                  step="100"
                  min="0"
                  {...form.register('expected_annual_premium_pln', { valueAsNumber: true })}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="source">Źródło</Label>
                <Select
                  value={form.watch('source')}
                  onValueChange={(v) => form.setValue('source', v)}
                >
                  <SelectTrigger id="source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ręczne">Ręczne</SelectItem>
                    <SelectItem value="Polecenie">Polecenie</SelectItem>
                    <SelectItem value="Wizyta">Wizyta</SelectItem>
                    <SelectItem value="Inne">Inne</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notatki</Label>
              <Textarea
                id="notes"
                rows={2}
                maxLength={500}
                {...form.register('notes')}
                disabled={submitting}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={submitting}>
                Anuluj
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Dodaj leada
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
