import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useSubmitWeeklyStatus } from '@/hooks/useWeeklyStatuses';
import { useTeamContactWeeklyStatuses } from '@/hooks/useTeamContactWeeklyStatuses';
import { useTeamMembers } from '@/hooks/useDealsTeamMembers';
import { useProductCategories } from '@/hooks/useProductCategories';
import { useConvertToClient, useAddClientProduct, CATEGORY_PROBABILITY } from '@/hooks/useTeamClients';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const weeklyStatusSchema = z.object({
  statusSummary: z.string().min(10, 'Minimum 10 znaków — opisz co się wydarzyło'),
  nextSteps: z.string().optional(),
  blockers: z.string().optional(),
  meetingHappened: z.boolean().default(false),
  meetingOutcome: z.string().optional(),
  categoryRecommendation: z
    .enum(['keep', 'hot', 'cold', '10x', 'snooze', 'convert_client', 'close_lost'])
    .default('keep'),
});

type WeeklyStatusFormData = z.infer<typeof weeklyStatusSchema>;

interface WeeklyStatusFormProps {
  teamContactId: string;
  teamId: string;
  contactId?: string;
  contactName: string;
  contactCompany: string | null;
  currentCategory?: string;
  open: boolean;
  onClose: () => void;
}

const categoryLabels: Record<string, string> = {
  hot: 'HOT', top: 'TOP', lead: 'LEAD', '10x': '10x',
  cold: 'COLD', lost: 'PRZEGRANE', client: 'KLIENT', offering: 'OFERTOWANIE',
};

const categoryColors: Record<string, string> = {
  hot: 'bg-red-500/20 text-red-700 border-red-300',
  top: 'bg-amber-500/20 text-amber-700 border-amber-300',
  lead: 'bg-blue-500/20 text-blue-700 border-blue-300',
  '10x': 'bg-purple-500/20 text-purple-700 border-purple-300',
  cold: 'bg-sky-500/20 text-sky-700 border-sky-300',
  lost: 'bg-gray-500/20 text-gray-700 border-gray-300',
  client: 'bg-green-500/20 text-green-700 border-green-300',
  offering: 'bg-orange-500/20 text-orange-700 border-orange-300',
};

const recommendationLabels: Record<string, string> = {
  keep: 'Zostaw w obecnej kategorii',
  hot: '🔥 HOT Lead (spotkanie umówione/w toku)',
  cold: '❄️ COLD Lead (temat na później)',
  '10x': '🔄 10x (buduj relacje, wróć później)',
  snooze: '😴 Odłóż (snooze)',
  convert_client: '✅ Konwertuj na Klienta',
  close_lost: '❌ Zamknij jako przegrany',
};

const TASK_PRESETS = [
  'Umówić spotkanie',
  'Zadzwonić',
  'Wysłać ofertę',
  'Przygotować audyt',
];

export function WeeklyStatusForm({
  teamContactId, teamId, contactId, contactName, contactCompany, currentCategory, open, onClose,
}: WeeklyStatusFormProps) {
  const queryClient = useQueryClient();
  const submitStatus = useSubmitWeeklyStatus();
  const { data: previousStatuses = [] } = useTeamContactWeeklyStatuses(teamContactId);
  const { data: members = [] } = useTeamMembers(teamId);
  const { data: categories = [] } = useProductCategories(teamId);
  const convertToClient = useConvertToClient();
  const addProduct = useAddClientProduct();

  const lastStatus = previousStatuses[0] || null;

  // Parse previous next_steps into checklist items
  const previousSteps = useMemo(() => {
    if (!lastStatus?.next_steps) return [];
    return lastStatus.next_steps
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }, [lastStatus]);

  const [previousTasksDone, setPreviousTasksDone] = useState<string[]>([]);
  const [showPreviousContext, setShowPreviousContext] = useState(true);

  // Task section
  const [createTask, setCreateTask] = useState(true);
  const [taskTitle, setTaskTitle] = useState('Umówić spotkanie');
  const [taskCustomTitle, setTaskCustomTitle] = useState('');
  const [taskAssignedTo, setTaskAssignedTo] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');

  // Snooze
  const [snoozeUntil, setSnoozeUntil] = useState('');

  // Convert to client
  const [productCategoryId, setProductCategoryId] = useState('');
  const [dealValue, setDealValue] = useState('');
  const [commissionPercent, setCommissionPercent] = useState('');

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
  const recommendation = form.watch('categoryRecommendation');

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
      setPreviousTasksDone([]);
      setCreateTask(true);
      setTaskTitle('Umówić spotkanie');
      setTaskCustomTitle('');
      setTaskAssignedTo('');
      setTaskDueDate('');
      setSnoozeUntil('');
      setProductCategoryId('');
      setDealValue('');
      setCommissionPercent('');
    }
  }, [open, form]);

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const weekLabel = `${format(weekStart, 'dd.MM', { locale: pl })} - ${format(weekEnd, 'dd.MM.yyyy', { locale: pl })}`;

  const handleCategorySelect = (catId: string) => {
    setProductCategoryId(catId);
    const cat = categories.find(c => c.id === catId);
    if (cat?.default_commission_percent) {
      setCommissionPercent(String(cat.default_commission_percent));
    }
  };

  const onSubmit = async (data: WeeklyStatusFormData) => {
    try {
      // 1. Save status
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

      // 2. Create task if requested
      if (createTask && taskAssignedTo) {
        const finalTitle = taskTitle === '__custom__' ? taskCustomTitle : taskTitle;
        if (finalTitle) {
          const { director } = await import('@/contexts/AuthContext').then(m => {
            // We can't use hooks here, so use supabase directly
            return { director: null };
          });
          // Insert assignment directly
          const { data: directorData } = await supabase
            .from('directors')
            .select('id, tenant_id')
            .eq('user_id', (await supabase.auth.getUser()).data.user?.id || '')
            .single();

          if (directorData) {
            // Insert into unified tasks table
            const categoryLabel = categoryLabels[currentCategory || 'lead'] || (currentCategory || 'lead').toUpperCase();
            const taskDescription = [
              `Etap: ${categoryLabel} | Kontakt: ${contactName}${contactCompany ? ` (${contactCompany})` : ''}`,
              '',
              `Status (${weekLabel}):`,
              data.statusSummary,
              data.nextSteps ? `\nNastępne kroki:\n${data.nextSteps}` : '',
              data.blockers ? `\nBlokery:\n${data.blockers}` : '',
              data.meetingHappened && data.meetingOutcome ? `\nWynik spotkania:\n${data.meetingOutcome}` : '',
            ].filter(Boolean).join('\n');

            const { data: newTask, error: taskError } = await supabase.from('tasks').insert({
              tenant_id: directorData.tenant_id,
              title: finalTitle,
              description: taskDescription,
              owner_id: directorData.id,
              assigned_to: taskAssignedTo,
              due_date: taskDueDate || null,
              status: 'todo',
              priority: 'medium',
              deal_team_id: teamId,
              deal_team_contact_id: teamContactId,
            }).select('id').single();

            if (!taskError && newTask && contactId) {
              // Link task to contact via task_contacts
              await supabase.from('task_contacts').insert({
                task_id: newTask.id,
                contact_id: contactId,
                role: 'primary',
              });
              // Invalidate contact tasks cache
              queryClient.invalidateQueries({ queryKey: ['contact-tasks-with-cross', contactId] });
            }
          }
        }
      }

      // 3. Handle recommendation side effects
      if (data.categoryRecommendation === 'hot') {
        await supabase.from('deal_team_contacts').update({ category: 'hot' as any }).eq('id', teamContactId);
      } else if (data.categoryRecommendation === 'cold') {
        await supabase.from('deal_team_contacts').update({ category: 'cold' as any }).eq('id', teamContactId);
      } else if (data.categoryRecommendation === '10x') {
        await supabase.from('deal_team_contacts').update({ category: '10x' as any }).eq('id', teamContactId);
      } else if (data.categoryRecommendation === 'close_lost') {
        await supabase.from('deal_team_contacts').update({ category: 'lost' as any, status: 'lost' } as any).eq('id', teamContactId);
      } else if (data.categoryRecommendation === 'snooze' && snoozeUntil) {
        await supabase.from('deal_team_contacts').update({
          snoozed_until: snoozeUntil,
          snoozed_from_category: currentCategory || 'lead',
        } as any).eq('id', teamContactId);
      } else if (data.categoryRecommendation === 'convert_client') {
        if (!productCategoryId || !dealValue) {
          toast.error('Wypełnij dane finansowe do konwersji');
          return;
        }
        const numValue = parseFloat(dealValue);
        const numCommission = parseFloat(commissionPercent) || 0;
        await convertToClient.mutateAsync({ id: teamContactId, teamId });
        await addProduct.mutateAsync({
          teamId,
          teamContactId,
          productCategoryId,
          dealValue: numValue,
          commissionPercent: numCommission,
          expectedCommission: numValue * (numCommission / 100),
          probabilityPercent: CATEGORY_PROBABILITY.client || 100,
        });
      }

      onClose();
    } catch {
      // Error handled in hooks
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Cotygodniowy status</DialogTitle>
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{contactName}</p>
            {contactCompany && <p>{contactCompany}</p>}
            {currentCategory && (
              <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded border ${categoryColors[currentCategory] || 'bg-muted text-muted-foreground border-border'}`}>
                Etap: {categoryLabels[currentCategory] || currentCategory.toUpperCase()}
              </span>
            )}
            <p className="mt-1">Tydzień: {weekLabel}</p>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto -mx-6 px-6" style={{ maxHeight: '60vh' }}>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-4">

              {/* Previous context */}
              {lastStatus && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <button
                    type="button"
                    className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground uppercase"
                    onClick={() => setShowPreviousContext(!showPreviousContext)}
                  >
                    <span>Poprzedni status ({format(new Date(lastStatus.week_start), 'dd.MM', { locale: pl })})</span>
                    {showPreviousContext ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                  {showPreviousContext && (
                    <>
                      <p className="text-xs">{lastStatus.status_summary}</p>
                      {previousSteps.length > 0 && (
                        <div className="space-y-1.5 mt-2">
                          <p className="text-xs font-medium">Status realizacji:</p>
                          {previousSteps.map((step, i) => (
                            <label key={i} className="flex items-start gap-2 text-xs cursor-pointer">
                              <Checkbox
                                checked={previousTasksDone.includes(step)}
                                onCheckedChange={(checked) => {
                                  setPreviousTasksDone(prev =>
                                    checked
                                      ? [...prev, step]
                                      : prev.filter(s => s !== step)
                                  );
                                }}
                                className="mt-0.5 h-3.5 w-3.5"
                              />
                              <span className={previousTasksDone.includes(step) ? 'line-through text-muted-foreground' : ''}>
                                {step}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                      {lastStatus.blockers && (
                        <p className="text-xs text-destructive">⚠ {lastStatus.blockers}</p>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Status summary */}
              <FormField
                control={form.control}
                name="statusSummary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Co się wydarzyło w tym tygodniu? *</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Opisz postęp, rozmowy, ustalenia..." rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Meeting */}
              <FormField
                control={form.control}
                name="meetingHappened"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Spotkanie się odbyło</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              {meetingHappened && (
                <FormField
                  control={form.control}
                  name="meetingOutcome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wynik spotkania</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Co ustaliliście?" rows={2} {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              {/* Next steps */}
              <FormField
                control={form.control}
                name="nextSteps"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Co dalej / następne kroki *</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Zaplanowane działania na następny tydzień (każdy krok w nowej linii)..." rows={3} {...field} />
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
                      <Textarea placeholder="Czy coś blokuje postęp?" rows={2} {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Separator />

              {/* Task assignment section */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={createTask} onCheckedChange={(v) => setCreateTask(!!v)} />
                  <span className="text-sm font-medium">Dodaj zadanie operacyjne</span>
                </label>
                {createTask && (
                  <div className="space-y-3 pl-6 border-l-2 border-primary/20">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Zadanie</Label>
                      <Select value={taskTitle} onValueChange={setTaskTitle}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TASK_PRESETS.map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                          <SelectItem value="__custom__">Inne...</SelectItem>
                        </SelectContent>
                      </Select>
                      {taskTitle === '__custom__' && (
                        <Input
                          placeholder="Wpisz tytuł zadania..."
                          value={taskCustomTitle}
                          onChange={e => setTaskCustomTitle(e.target.value)}
                          className="h-8 text-sm"
                        />
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Przypisz do</Label>
                      <Select value={taskAssignedTo} onValueChange={setTaskAssignedTo}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Wybierz osobę..." />
                        </SelectTrigger>
                        <SelectContent>
                          {members.map(m => (
                            <SelectItem key={m.director_id} value={m.director_id}>
                              {m.director?.full_name || m.director_id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Termin</Label>
                      <Input
                        type="date"
                        value={taskDueDate}
                        onChange={e => setTaskDueDate(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Category recommendation */}
              <FormField
                control={form.control}
                name="categoryRecommendation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rekomendacja kategorii</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz rekomendację..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(recommendationLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Snooze date */}
              {recommendation === 'snooze' && (
                <div className="space-y-2 bg-muted/50 rounded p-3">
                  <Label>Odłóż do daty *</Label>
                  <Input
                    type="date"
                    value={snoozeUntil}
                    onChange={e => setSnoozeUntil(e.target.value)}
                  />
                </div>
              )}

              {/* Convert to client - financial data */}
              {recommendation === 'convert_client' && (
                <div className="space-y-3 bg-accent/50 rounded-lg p-3 border border-border">
                  <p className="text-xs font-semibold text-primary uppercase">
                    Dane finansowe klienta
                  </p>
                  <div className="space-y-2">
                    <Label className="text-xs">Grupa produktów *</Label>
                    <Select value={productCategoryId} onValueChange={handleCategorySelect}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Wybierz grupę..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                              {cat.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Wartość składki (PLN) *</Label>
                    <Input
                      type="number"
                      min={0}
                      step={100}
                      placeholder="np. 50000"
                      value={dealValue}
                      onChange={e => setDealValue(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Prowizja (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      placeholder="np. 15"
                      value={commissionPercent}
                      onChange={e => setCommissionPercent(e.target.value)}
                      className="h-8 text-sm"
                    />
                    {dealValue && commissionPercent && (
                      <p className="text-xs text-muted-foreground">
                        Prowizja: {(parseFloat(dealValue) * parseFloat(commissionPercent) / 100).toLocaleString('pl-PL')} PLN
                      </p>
                    )}
                  </div>
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={onClose}>Anuluj</Button>
                <Button type="submit" disabled={submitStatus.isPending || convertToClient.isPending}>
                  {(submitStatus.isPending || convertToClient.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  💾 Zapisz status
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
