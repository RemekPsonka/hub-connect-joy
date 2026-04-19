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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface CompanyContactOption {
  id: string;
  full_name: string;
  position?: string | null;
  email?: string | null;
}

const schema = z.object({
  contact_id: z.string().uuid({ message: 'Wybierz kontakt' }),
  expected_annual_premium_pln: z
    .number({ invalid_type_error: 'Podaj liczbę' })
    .min(0, 'Wartość nie może być ujemna')
    .max(1_000_000_000, 'Wartość zbyt duża'),
  notes: z.string().max(500, 'Maksymalnie 500 znaków').optional(),
});

type FormData = z.infer<typeof schema>;

interface PushCompanyContactDialogProps {
  companyName: string;
  contacts: CompanyContactOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PushCompanyContactDialog({
  companyName,
  contacts,
  open,
  onOpenChange,
}: PushCompanyContactDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { contact_id: '', expected_annual_premium_pln: 0, notes: '' },
  });
  const selectedId = form.watch('contact_id');

  const onSubmit = async (values: FormData) => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('sgu-push-contact', {
        body: {
          contact_id: values.contact_id,
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Przekaż do SGU</DialogTitle>
          <DialogDescription>
            Wybierz kontakt z firmy <span className="font-medium text-foreground">{companyName}</span> do
            przekazania do zespołu SGU.
          </DialogDescription>
        </DialogHeader>

        {createdId ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Kontakt jest dostępny w lejku SGU.</p>
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
            <div className="space-y-2">
              <Label>Kontakt</Label>
              <ScrollArea className="h-48 rounded-md border p-2">
                <RadioGroup
                  value={selectedId}
                  onValueChange={(v) => form.setValue('contact_id', v, { shouldValidate: true })}
                  className="space-y-1"
                >
                  {contacts.map((c) => (
                    <label
                      key={c.id}
                      htmlFor={`push-contact-${c.id}`}
                      className="flex items-start gap-3 rounded-md p-2 cursor-pointer hover:bg-muted/60 transition-colors"
                    >
                      <RadioGroupItem id={`push-contact-${c.id}`} value={c.id} className="mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{c.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {[c.position, c.email].filter(Boolean).join(' · ') || '—'}
                        </p>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              </ScrollArea>
              {form.formState.errors.contact_id && (
                <p className="text-xs text-destructive">{form.formState.errors.contact_id.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="premium-co">Oczekiwany przypis roczny (PLN)</Label>
              <Input
                id="premium-co"
                type="number"
                step="100"
                min="0"
                disabled={submitting || !selectedId}
                {...form.register('expected_annual_premium_pln', { valueAsNumber: true })}
              />
              {form.formState.errors.expected_annual_premium_pln && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.expected_annual_premium_pln.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes-co">Notatki (opcjonalne)</Label>
              <Textarea
                id="notes-co"
                rows={3}
                maxLength={500}
                disabled={submitting || !selectedId}
                {...form.register('notes')}
              />
              {form.formState.errors.notes && (
                <p className="text-xs text-destructive">{form.formState.errors.notes.message}</p>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={submitting}>
                Anuluj
              </Button>
              <Button type="submit" disabled={submitting || !selectedId}>
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
