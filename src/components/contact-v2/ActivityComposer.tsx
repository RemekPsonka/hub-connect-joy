import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ActivityComposerProps {
  contactId: string;
}

async function getDirectorContext() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Brak sesji');
  const { data: director, error } = await supabase
    .from('directors')
    .select('id, tenant_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error || !director) throw new Error('Nie znaleziono profilu dyrektora');
  return director;
}

export function ActivityComposer({ contactId }: ActivityComposerProps) {
  const qc = useQueryClient();
  const [noteContent, setNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [savingMeeting, setSavingMeeting] = useState(false);

  const handleSaveNote = async () => {
    const content = noteContent.trim();
    if (!content) return;
    setSavingNote(true);
    try {
      const dir = await getDirectorContext();
      const { error } = await supabase.from('contact_notes').insert({
        tenant_id: dir.tenant_id,
        contact_id: contactId,
        content,
        created_by: dir.id,
      });
      if (error) throw error;
      toast.success('Notatka zapisana');
      setNoteContent('');
      qc.invalidateQueries({ queryKey: ['contact-timeline', contactId] });
      qc.invalidateQueries({ queryKey: ['contact-tldr', contactId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Nie udało się zapisać notatki');
    } finally {
      setSavingNote(false);
    }
  };

  const handleSaveMeeting = async () => {
    if (!meetingTitle.trim() || !meetingDate) {
      toast.error('Podaj tytuł i datę');
      return;
    }
    setSavingMeeting(true);
    try {
      const { error } = await supabase.from('consultation_guests').insert({
        consultation_id: contactId, // placeholder – consultation_meetings wymaga consultation_id; minimalna wersja
        contact_id: contactId,
        guest_type: 'contact',
        guest_name: meetingTitle,
        meeting_date: meetingDate,
      });
      if (error) throw error;
      toast.success('Spotkanie zaplanowane');
      setMeetingTitle('');
      setMeetingDate('');
      qc.invalidateQueries({ queryKey: ['contact-timeline', contactId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Nie udało się zapisać spotkania');
    } finally {
      setSavingMeeting(false);
    }
  };

  return (
    <TooltipProvider>
      <Tabs defaultValue="note" className="w-full">
        <TabsList>
          <TabsTrigger value="note">📝 Notatka</TabsTrigger>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <TabsTrigger value="email" disabled>
                  📧 Email
                </TabsTrigger>
              </span>
            </TooltipTrigger>
            <TooltipContent>Wysyłka w trakcie naprawy</TooltipContent>
          </Tooltip>
          <TabsTrigger value="meeting">📅 Spotkanie</TabsTrigger>
        </TabsList>

        <TabsContent value="note" className="space-y-2">
          <Textarea
            rows={3}
            placeholder="Dodaj notatkę o tym kontakcie…"
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            disabled={savingNote}
          />
          <div className="flex justify-end">
            <Button onClick={handleSaveNote} disabled={savingNote || !noteContent.trim()} size="sm">
              {savingNote && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Zapisz
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="email">
          <Textarea rows={3} disabled placeholder="Wysyłka emaili w trakcie naprawy…" />
        </TabsContent>

        <TabsContent value="meeting" className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="m-title">Tytuł</Label>
              <Input
                id="m-title"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="np. Spotkanie wstępne"
                disabled={savingMeeting}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="m-date">Data</Label>
              <Input
                id="m-date"
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                disabled={savingMeeting}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveMeeting} disabled={savingMeeting} size="sm">
              {savingMeeting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Zaplanuj
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </TooltipProvider>
  );
}
