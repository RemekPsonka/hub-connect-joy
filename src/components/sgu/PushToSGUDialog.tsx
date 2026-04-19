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

const schema = z.object({
  expected_annual_premium_pln: z
    .number({ invalid_type_error: 'Podaj liczbę' })
    .min(0, 'Wartość nie może być ujemna')
    .max(1_000_000_000, 'Wartość zbyt duża'),
  notes: z.string().max(500, 'Maksymalnie 500 znaków').optional(),
});

type FormData = z.infer<typeof schema>;

interface PushToSGUDialogProps {
  contactId: string;
  contactName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PushToSGUDialog({ contactId, contactName, open, onOpenChange }: PushToSGUDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { expected_annual_premium_pln: 0, notes: '' },
  });

  const onSubmit = async (values: FormData) => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('sgu-push-contact', {
        body: {
          contact_id: contactId,
          expected_annual_premium_gr: Math.round(values.expected_annual_premium_pln * 100),
          notes: values.notes?.trim() || null,
        },
      });
      if (error) throw error;
      const result = data as { deal_team_contact_id: string; created: boolean; error?: string };
      if (result.error) throw new Error(result.error);

      setCreatedId(result.deal_team_contact_id);
      toast.success(
        result.created ? 'Kontakt przekazany do SGU' : 'Kontakt już był w SGU — pokazuję istniejący'
      );
      queryClient.invalidateQueries({ queryKey: ['deals-team-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['deal-team-contacts'] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Nie udało się przekazać kontaktu';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      form.reset();
      setCreatedId(null);
    }
    onOpenChange(next);
  };

  const goToSGU = () => {
    if (!createdId) return;
    handleClose(false);
    navigate(`/sgu/pipeline?view=clients&highlight=${createdId}`);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Przekaż do SGU</DialogTitle>
          <DialogDescription>
            Przekazujesz kontakt <span className="font-medium text-foreground">{contactName}</span> do
            zespołu SGU. Dane kontaktowe pozostają w CRM — SGU widzi tylko podstawowe informacje.
          </DialogDescription>
        </DialogHeader>

        {createdId ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Kontakt jest dostępny w lejku SGU. Możesz go teraz otworzyć.
            </p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Zamknij
              </Button>
              <Button onClick={goToSGU} className="gap-2">
                Zobacz w SGU
                <ArrowRight className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="premium">Oczekiwany przypis roczny (PLN)</Label>
              <Input
                id="premium"
                type="number"
                step="100"
                min="0"
                {...form.register('expected_annual_premium_pln', { valueAsNumber: true })}
                disabled={submitting}
              />
              {form.formState.errors.expected_annual_premium_pln && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.expected_annual_premium_pln.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notatki (opcjonalne)</Label>
              <Textarea
                id="notes"
                rows={3}
                maxLength={500}
                placeholder="np. potencjalny klient OC flota, pilne odnowienie…"
                {...form.register('notes')}
                disabled={submitting}
              />
              {form.formState.errors.notes && (
                <p className="text-xs text-destructive">{form.formState.errors.notes.message}</p>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={submitting}>
                Anuluj
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Przekaż do SGU
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
