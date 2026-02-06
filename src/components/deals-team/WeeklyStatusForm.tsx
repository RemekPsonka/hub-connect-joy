import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import { useSubmitWeeklyStatus } from '@/hooks/useWeeklyStatuses';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const weeklyStatusSchema = z.object({
  statusSummary: z.string().min(10, 'Minimum 10 znaków — opisz co się wydarzyło'),
  nextSteps: z.string().optional(),
  blockers: z.string().optional(),
  meetingHappened: z.boolean().default(false),
  meetingOutcome: z.string().optional(),
  categoryRecommendation: z
    .enum(['keep', 'promote', 'demote', 'close_won', 'close_lost'])
    .default('keep'),
});

type WeeklyStatusFormData = z.infer<typeof weeklyStatusSchema>;

interface WeeklyStatusFormProps {
  teamContactId: string;
  teamId: string;
  contactName: string;
  contactCompany: string | null;
  open: boolean;
  onClose: () => void;
}

const recommendationLabels: Record<string, string> = {
  keep: 'Zostaw w obecnej kategorii',
  promote: 'Awansuj do wyższej kategorii',
  demote: 'Degraduj do niższej kategorii',
  close_won: 'Zamknij jako wygrany',
  close_lost: 'Zamknij jako przegrany',
};

export function WeeklyStatusForm({
  teamContactId,
  teamId,
  contactName,
  contactCompany,
  open,
  onClose,
}: WeeklyStatusFormProps) {
  const submitStatus = useSubmitWeeklyStatus();

  const form = useForm<WeeklyStatusFormData>({
    resolver: zodResolver(weeklyStatusSchema),
    defaultValues: {
      statusSummary: '',
      nextSteps: '',
      blockers: '',
      meetingHappened: false,
      meetingOutcome: '',
      categoryRecommendation: 'keep',
    },
  });

  const meetingHappened = form.watch('meetingHappened');

  // Reset form when opening
  useEffect(() => {
    if (open) {
      form.reset({
        statusSummary: '',
        nextSteps: '',
        blockers: '',
        meetingHappened: false,
        meetingOutcome: '',
        categoryRecommendation: 'keep',
      });
    }
  }, [open, form]);

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const weekLabel = `${format(weekStart, 'dd.MM', { locale: pl })} - ${format(weekEnd, 'dd.MM.yyyy', { locale: pl })}`;

  const onSubmit = async (data: WeeklyStatusFormData) => {
    try {
      await submitStatus.mutateAsync({
        teamId,
        teamContactId,
        statusSummary: data.statusSummary,
        nextSteps: data.nextSteps || undefined,
        blockers: data.blockers || undefined,
        meetingHappened: data.meetingHappened,
        meetingOutcome: data.meetingHappened ? data.meetingOutcome : undefined,
        categoryRecommendation: data.categoryRecommendation,
      });
      onClose();
    } catch {
      // Error handled in hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Cotygodniowy status</DialogTitle>
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{contactName}</p>
            {contactCompany && <p>{contactCompany}</p>}
            <p className="mt-1">Tydzień: {weekLabel}</p>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Status summary */}
            <FormField
              control={form.control}
              name="statusSummary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Co się wydarzyło w tym tygodniu? *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Opisz postęp, rozmowy, ustalenia..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Next steps */}
            <FormField
              control={form.control}
              name="nextSteps"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Co dalej / następne kroki</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Zaplanowane działania na następny tydzień..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Blockers */}
            <FormField
              control={form.control}
              name="blockers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Blokery / problemy</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Czy coś blokuje postęp?"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Meeting happened checkbox */}
            <FormField
              control={form.control}
              name="meetingHappened"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Spotkanie się odbyło</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {/* Meeting outcome - visible only if meeting happened */}
            {meetingHappened && (
              <FormField
                control={form.control}
                name="meetingOutcome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wynik spotkania</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Co ustaliliście na spotkaniu?"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Category recommendation */}
            <FormField
              control={form.control}
              name="categoryRecommendation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rekomendacja kategorii</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz rekomendację..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(recommendationLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Anuluj
              </Button>
              <Button type="submit" disabled={submitStatus.isPending}>
                {submitStatus.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                💾 Zapisz status
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
