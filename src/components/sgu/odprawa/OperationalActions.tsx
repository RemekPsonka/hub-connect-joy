import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { StickyNote, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { DealTeamContact } from '@/types/dealTeam';

interface OperationalActionsProps {
  contact: DealTeamContact;
  teamId: string;
  tenantId: string;
}

/**
 * Quick actions w Odprawie. Po HOTFIX-ODPRAWA-2BUGS zostały tu tylko akcje
 * niesprzedażowe — Notatka (touchpoint do logu aktywności) i 10x (toggle
 * priorytetu). Akcje typu Zadzwoń/Mail/Umów spotkanie zostały przeniesione
 * do "Co dalej?" templates (tworzą zadania zamiast nieśledzonych klików).
 */
export function OperationalActions({ contact, teamId, tenantId }: OperationalActionsProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const is10x = contact.temperature === '10x';

  const submitNote = async () => {
    const text = noteText.trim();
    if (!text) {
      toast.error('Notatka nie może być pusta');
      return;
    }
    setSavingNote(true);
    try {
      const { error } = await supabase.from('deal_team_activity_log').insert({
        team_id: teamId,
        tenant_id: tenantId,
        team_contact_id: contact.id,
        actor_id: user?.id ?? null,
        action: 'note_added',
        new_value: { note: text, source: 'odprawa' },
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['deal_team_activity_log'] });
      toast.success('Notatka zapisana');
      setNoteOpen(false);
      setNoteText('');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Nie udało się zapisać notatki';
      toast.error(msg);
    } finally {
      setSavingNote(false);
    }
  };

  const toggle10x = async () => {
    const newTemp = is10x ? null : '10x';
    try {
      const { error } = await supabase
        .from('deal_team_contacts')
        .update({ temperature: newTemp })
        .eq('id', contact.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['deal_team_contact_for_agenda'] });
      qc.invalidateQueries({ queryKey: ['odprawa-agenda'] });
      toast.success(newTemp === '10x' ? 'Oznaczono 10x' : 'Usunięto 10x');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Nie udało się';
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold">Quick actions</div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setNoteOpen(true)}>
          <StickyNote className="h-4 w-4 mr-1" /> Notatka
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={toggle10x}
          className={cn(
            is10x && 'bg-violet-100 border-violet-400 text-violet-900 hover:bg-violet-200',
          )}
        >
          <Sparkles className="h-4 w-4 mr-1" /> 10x
        </Button>
      </div>

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notatka z odprawy</DialogTitle>
          </DialogHeader>
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Co ustaliliście?"
            className="min-h-[120px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteOpen(false)} disabled={savingNote}>
              Anuluj
            </Button>
            <Button onClick={submitNote} disabled={savingNote || !noteText.trim()}>
              Zapisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
