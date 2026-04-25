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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Phone, Mail, StickyNote, ClipboardCheck, Send, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useUpdateTeamContact } from '@/hooks/useDealsTeamContacts';
import { toast } from 'sonner';
import type { DealTeamContact } from '@/types/dealTeam';

interface OperationalActionsProps {
  contact: DealTeamContact;
  teamId: string;
  tenantId: string;
}

export function OperationalActions({ contact, teamId, tenantId }: OperationalActionsProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const updateMut = useUpdateTeamContact();
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const phone = contact.contact?.phone ?? '';
  const email = contact.contact?.email ?? '';

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

  const setOfferingStage = (stage: 'audit' | 'offer_sent') => {
    updateMut.mutate(
      { id: contact.id, teamId, offeringStage: stage },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ['deal_team_contact_for_agenda'] });
          qc.invalidateQueries({ queryKey: ['odprawa-agenda'] });
          toast.success(stage === 'audit' ? 'Audyt zrobiony' : 'Oferta wysłana');
        },
      },
    );
  };

  const setTen10x = () => {
    updateMut.mutate(
      { id: contact.id, teamId, temperature: '10x' },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ['deal_team_contact_for_agenda'] });
          qc.invalidateQueries({ queryKey: ['odprawa-agenda'] });
          toast.success('Oznaczono 10x');
        },
      },
    );
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold">Akcje operacyjne</div>
      <div className="flex flex-wrap gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button asChild={!!phone} variant="outline" size="sm" disabled={!phone}>
                  {phone ? (
                    <a href={`tel:${phone}`}>
                      <Phone className="h-4 w-4 mr-1" /> Zadzwoń
                    </a>
                  ) : (
                    <span>
                      <Phone className="h-4 w-4 mr-1" /> Zadzwoń
                    </span>
                  )}
                </Button>
              </span>
            </TooltipTrigger>
            {!phone && <TooltipContent>Brak numeru telefonu</TooltipContent>}
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button asChild={!!email} variant="outline" size="sm" disabled={!email}>
                  {email ? (
                    <a href={`mailto:${email}`}>
                      <Mail className="h-4 w-4 mr-1" /> Mail
                    </a>
                  ) : (
                    <span>
                      <Mail className="h-4 w-4 mr-1" /> Mail
                    </span>
                  )}
                </Button>
              </span>
            </TooltipTrigger>
            {!email && <TooltipContent>Brak adresu email</TooltipContent>}
          </Tooltip>
        </TooltipProvider>

        <Button variant="outline" size="sm" onClick={() => setNoteOpen(true)}>
          <StickyNote className="h-4 w-4 mr-1" /> Notatka
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled={updateMut.isPending}
          onClick={() => setOfferingStage('audit')}
        >
          <ClipboardCheck className="h-4 w-4 mr-1" /> Audyt zrobiony
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled={updateMut.isPending}
          onClick={() => setOfferingStage('offer_sent')}
        >
          <Send className="h-4 w-4 mr-1" /> Wyślij ofertę
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled={updateMut.isPending || contact.temperature === '10x'}
          onClick={setTen10x}
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
