import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Calendar } from '@/components/ui/calendar';
import { Plus, Phone, Mail, CalendarPlus, FileSignature, Send } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useLogDecision, type MilestoneVariant } from '@/hooks/useLogDecision';
import { useTeamDirectors } from '@/hooks/odprawa/useTeamDirectors';
import type { ContactTimelineState } from '@/hooks/odprawa/useContactTimelineState';

type DueOption = '7d' | 'next_odprawa' | 'custom' | 'none';

interface ContactCtx {
  full_name: string;
  handshake_at: string | null;
  poa_signed_at: string | null;
  audit_done_at: string | null;
}

interface Props {
  state: ContactTimelineState;
  dealTeamContactId: string;
  contactId: string;
  teamId: string;
  tenantId: string;
  odprawaSessionId: string;
  defaultAssigneeId: string | null;
  contactCtx: ContactCtx;
  onCreated: () => void;
}

interface Template {
  key: string;
  label: string;
  Icon: typeof Phone;
  /** Pre-fill tytuł */
  title: (name: string) => string;
  /** Jeśli ustawiony — po sukcesie ustawiamy offering_stage. */
  stage: string | null;
  /** Filtr widoczności per stan. */
  visibleWhen?: (c: ContactCtx) => boolean;
}

const TEMPLATES: Template[] = [
  {
    key: 'call',
    label: 'Zadzwoń',
    Icon: Phone,
    title: (n) => `Zadzwonić do ${n}`,
    stage: null,
  },
  {
    key: 'email',
    label: 'Wyślij mail',
    Icon: Mail,
    title: (n) => `Wysłać maila do ${n}`,
    stage: null,
  },
  {
    key: 'meeting',
    label: 'Umów spotkanie',
    Icon: CalendarPlus,
    title: (n) => `Umówić spotkanie z ${n}`,
    stage: 'meeting_plan',
  },
  {
    key: 'poa',
    label: 'Wyślij POA',
    Icon: FileSignature,
    title: (n) => `Wysłać POA do ${n}`,
    stage: 'power_of_attorney',
    visibleWhen: (c) => !!c.handshake_at && !c.poa_signed_at,
  },
  {
    key: 'offer',
    label: 'Wyślij ofertę',
    Icon: Send,
    title: (n) => `Wysłać ofertę do ${n}`,
    stage: 'offer_sent',
    visibleWhen: (c) => !!c.audit_done_at,
  },
];

function plusDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function NextStepDialog({
  state,
  dealTeamContactId,
  contactId,
  teamId,
  tenantId,
  odprawaSessionId,
  defaultAssigneeId,
  contactCtx,
  onCreated,
}: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const logMut = useLogDecision();
  const directorsQ = useTeamDirectors(teamId);

  const [open, setOpen] = useState(false);
  const [activeTpl, setActiveTpl] = useState<Template | null>(null);
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState<string>('');
  const [dueOpt, setDueOpt] = useState<DueOption>('7d');
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const visibleTemplates = useMemo(
    () => TEMPLATES.filter((t) => !t.visibleWhen || t.visibleWhen(contactCtx)),
    [contactCtx],
  );

  const openWithTemplate = (tpl: Template | null) => {
    setActiveTpl(tpl);
    setTitle(
      tpl
        ? tpl.title(contactCtx.full_name)
        : state.nextStepSuggestion.title || '',
    );
    setAssignee(defaultAssigneeId ?? '');
    setDueOpt('7d');
    setCustomDate(undefined);
    setNotes('');
    setOpen(true);
  };

  // Reset state przy zamknięciu (oczyszczamy po ESC/click outside).
  useEffect(() => {
    if (!open) setActiveTpl(null);
  }, [open]);

  const submit = async () => {
    const t = title.trim();
    if (!t) {
      toast.error('Tytuł zadania wymagany');
      return;
    }
    if (!assignee) {
      toast.error('Wybierz wykonawcę');
      return;
    }
    let dueDate: string | null = null;
    if (dueOpt === '7d') dueDate = plusDays(7);
    else if (dueOpt === 'custom') {
      if (!customDate) {
        toast.error('Wybierz datę');
        return;
      }
      dueDate = customDate.toISOString().slice(0, 10);
    }

    setSubmitting(true);
    try {
      // OWNER vs ASSIGNEE: owner_id = director który tworzy task (zalogowany user → director),
      // assigned_to = director który ma to wykonać (z dropdown). Oba mapują na directors.id (FK
      // tasks_owner_id_fkey i tasks_assigned_to_fkey). NIE wkładać tu auth.users.id.
      // Memory: project_tasks_schema_notes.
      if (!user?.id) {
        toast.error('Brak zalogowanego użytkownika');
        setSubmitting(false);
        return;
      }
      const { data: directorRow, error: dirErr } = await supabase
        .from('directors')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (dirErr) throw dirErr;
      if (!directorRow?.id) {
        toast.error('Nie znaleziono powiązanego dyrektora dla tego użytkownika.');
        setSubmitting(false);
        return;
      }
      const ownerDirectorId = directorRow.id;

      const { data: task, error: taskErr } = await supabase
        .from('tasks')
        .insert({
          tenant_id: tenantId,
          title: t,
          description: notes.trim() || null,
          status: 'open',
          assigned_to: assignee,
          owner_id: ownerDirectorId,
          due_date: dueDate,
          deal_team_id: teamId,
          deal_team_contact_id: dealTeamContactId,
        })
        .select('id')
        .single();
      if (taskErr) throw taskErr;

      const { error: linkErr } = await supabase.from('task_contacts').insert({
        task_id: task.id,
        contact_id: contactId,
        role: 'primary',
      });
      if (linkErr) throw linkErr;

      // Jeśli template ma stage → UPDATE offering_stage.
      if (activeTpl?.stage) {
        await supabase
          .from('deal_team_contacts')
          .update({ offering_stage: activeTpl.stage })
          .eq('id', dealTeamContactId);
      }

      await logMut.mutateAsync({
        contactId: dealTeamContactId,
        teamId,
        tenantId,
        decision: 'push',
        milestoneVariant: (state.nextStepSuggestion.stageKey ??
          state.currentMilestone) as MilestoneVariant,
        odprawaSessionId,
        notes: t,
        followUpTaskId: task.id,
      });

      qc.invalidateQueries({ queryKey: ['odprawa-contact-tasks', contactId] });
      qc.invalidateQueries({ queryKey: ['odprawa-session-decisions'] });
      qc.invalidateQueries({ queryKey: ['odprawa-agenda'] });
      qc.invalidateQueries({ queryKey: ['deal_team_contact_for_agenda'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Zadanie utworzone');
      setOpen(false);
      onCreated();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Nie udało się utworzyć zadania';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold">Co dalej?</div>
      <div className="flex flex-wrap gap-2">
        {visibleTemplates.map((tpl) => {
          const Icon = tpl.Icon;
          return (
            <Button
              key={tpl.key}
              variant="outline"
              size="sm"
              onClick={() => openWithTemplate(tpl)}
            >
              <Icon className="h-4 w-4 mr-1" /> {tpl.label}
            </Button>
          );
        })}
        <Button
          variant="default"
          size="sm"
          onClick={() => openWithTemplate(null)}
        >
          <Plus className="h-4 w-4 mr-1" /> Inne zadanie
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {activeTpl ? activeTpl.label : 'Nowe zadanie follow-up'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="task-title">Tytuł zadania</Label>
              <Input
                id="task-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Co masz zrobić?"
              />
            </div>
            <div className="space-y-1">
              <Label>Wykonawca</Label>
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz wykonawcę" />
                </SelectTrigger>
                <SelectContent>
                  {(directorsQ.data ?? []).length === 0 && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      {directorsQ.isLoading ? 'Ładowanie…' : 'Brak członków zespołu'}
                    </div>
                  )}
                  {directorsQ.data?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Termin</Label>
              <Select
                value={dueOpt}
                onValueChange={(v) => setDueOpt(v as DueOption)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">+7 dni</SelectItem>
                  <SelectItem value="next_odprawa">Do kolejnej odprawy</SelectItem>
                  <SelectItem value="custom">Konkretna data</SelectItem>
                  <SelectItem value="none">Bez terminu</SelectItem>
                </SelectContent>
              </Select>
              {dueOpt === 'custom' && (
                <div className="flex justify-center pt-2">
                  <Calendar
                    mode="single"
                    selected={customDate}
                    onSelect={setCustomDate}
                    disabled={(d) =>
                      d < new Date(new Date().setHours(0, 0, 0, 0))
                    }
                    className="p-3 pointer-events-auto"
                  />
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="task-notes">Notka (opcjonalna)</Label>
              <Textarea
                id="task-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Kontekst, ustalenia…"
                className="min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Anuluj
            </Button>
            <Button onClick={submit} disabled={submitting}>
              Stwórz zadanie i idź dalej
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
