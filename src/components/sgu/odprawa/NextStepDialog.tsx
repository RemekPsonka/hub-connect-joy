import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useLogDecision, type MilestoneVariant } from '@/hooks/useLogDecision';
import { useTeamDirectors } from '@/hooks/odprawa/useTeamDirectors';
import type { ContactTimelineState } from '@/hooks/odprawa/useContactTimelineState';

type DueOption = '7d' | 'next_odprawa' | 'custom' | 'none';

interface Props {
  state: ContactTimelineState;
  dealTeamContactId: string;
  contactId: string;
  teamId: string;
  tenantId: string;
  odprawaSessionId: string;
  defaultAssigneeId: string | null;
  onCreated: () => void;
}

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
  onCreated,
}: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const logMut = useLogDecision();
  const directorsQ = useTeamDirectors(teamId);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(state.nextStepSuggestion.title);
  const [assignee, setAssignee] = useState<string>('');
  const [dueOpt, setDueOpt] = useState<DueOption>('7d');
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(state.nextStepSuggestion.title);
      setAssignee(defaultAssigneeId ?? user?.id ?? '');
      setDueOpt('7d');
      setCustomDate(undefined);
      setNotes('');
    }
  }, [open, state.nextStepSuggestion.title, defaultAssigneeId, user?.id]);

  if (!state.nextStepSuggestion.title) return null;

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
      const { data: task, error: taskErr } = await supabase
        .from('tasks')
        .insert({
          tenant_id: tenantId,
          title: t,
          description: notes.trim() || null,
          status: 'open',
          assigned_to: assignee,
          owner_id: user?.id ?? null,
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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="default" size="sm">
            <Plus className="h-4 w-4 mr-1" /> Stwórz zadanie
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nowe zadanie follow-up</DialogTitle>
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