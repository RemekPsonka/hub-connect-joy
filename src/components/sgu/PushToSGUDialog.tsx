import { useEffect, useMemo, useState } from 'react';
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
import { useAvailableDealTeams } from '@/hooks/useAvailableDealTeams';

const STAGE_OPTIONS = [
  { value: 'prospect', label: 'Prospekt' },
  { value: 'lead', label: 'Lead' },
  { value: 'offering', label: 'Ofertowanie' },
  { value: 'client', label: 'Klient' },
] as const;

type Stage = (typeof STAGE_OPTIONS)[number]['value'];

const schema = z.object({
  team_id: z.string().uuid('Wybierz lejek'),
  stage: z.enum(['prospect', 'lead', 'offering', 'client']),
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
  const { teams, isLoading: teamsLoading } = useAvailableDealTeams();
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [createdTeamId, setCreatedTeamId] = useState<string | null>(null);

  const defaultTeamId = useMemo(() => {
    if (teams.length === 0) return '';
    const sgu = teams.find((t) => t.is_sgu);
    return (sgu ?? teams[0]).id;
  }, [teams]);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      team_id: defaultTeamId,
      stage: 'lead',
      expected_annual_premium_pln: 0,
      notes: '',
    },
  });

  // Po załadowaniu lejków ustaw default w formularzu (gdy jeszcze pusty).
  useEffect(() => {
    if (defaultTeamId && !form.getValues('team_id')) {
      form.setValue('team_id', defaultTeamId);
    }
  }, [defaultTeamId, form]);

  const stage = form.watch('stage');
  const teamId = form.watch('team_id');
  const showPremium = stage !== 'prospect';

  const onSubmit = async (values: FormData) => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('sgu-push-contact', {
        body: {
          contact_id: contactId,
          team_id: values.team_id,
          stage: values.stage,
          expected_annual_premium_gr: showPremium
            ? Math.round(values.expected_annual_premium_pln * 100)
            : 0,
          notes: values.notes?.trim() || null,
        },
      });
      if (error) throw error;
      const result = data as {
        deal_team_contact_id: string;
        team_id: string;
        stage: Stage;
        created: boolean;
        error?: string;
      };
      if (result.error) throw new Error(result.error);

      setCreatedId(result.deal_team_contact_id);
      setCreatedTeamId(result.team_id);
      toast.success(
        result.created
          ? 'Kontakt przekazany do lejka'
          : 'Kontakt już był w tym lejku — pokazuję istniejący'
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
      form.reset({
        team_id: defaultTeamId,
        stage: 'lead',
        expected_annual_premium_pln: 0,
        notes: '',
      });
      setCreatedId(null);
      setCreatedTeamId(null);
    }
    onOpenChange(next);
  };

  const goToPipeline = () => {
    if (!createdId || !createdTeamId) return;
    const team = teams.find((t) => t.id === createdTeamId);
    handleClose(false);
    if (team?.is_sgu) {
      navigate(`/sgu/sprzedaz?highlight=${createdId}`);
    } else {
      navigate(`/deals-team?team=${createdTeamId}&view=sales&highlight=${createdId}`);
    }
  };

  const showTeamSelect = teams.length > 1;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Przekaż do lejka</DialogTitle>
          <DialogDescription>
            Przekazujesz kontakt <span className="font-medium text-foreground">{contactName}</span>.
            Wybierz lejek i etap startowy. Dane kontaktu pozostają w CRM.
          </DialogDescription>
        </DialogHeader>

        {createdId ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Kontakt jest dostępny w wybranym lejku. Możesz go teraz otworzyć.
            </p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Zamknij
              </Button>
              <Button onClick={goToPipeline} className="gap-2">
                Zobacz w lejku
                <ArrowRight className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {showTeamSelect && (
              <div className="space-y-1.5">
                <Label htmlFor="team">Lejek</Label>
                <Select
                  value={teamId}
                  onValueChange={(v) => form.setValue('team_id', v, { shouldValidate: true })}
                  disabled={submitting || teamsLoading}
                >
                  <SelectTrigger id="team">
                    <SelectValue placeholder="Wybierz lejek" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.team_id && (
                  <p className="text-xs text-destructive">{form.formState.errors.team_id.message}</p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="stage">Etap startowy</Label>
              <Select
                value={stage}
                onValueChange={(v) => form.setValue('stage', v as Stage, { shouldValidate: true })}
                disabled={submitting}
              >
                <SelectTrigger id="stage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showPremium && (
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
            )}

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
              <Button type="submit" disabled={submitting || teams.length === 0}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Przekaż
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
