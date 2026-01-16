import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Plus, Users2, ThumbsUp, ThumbsDown, Minus, Bell, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  useMeetingParticipants,
  useMeetingOneOnOnes,
  useLogOneOnOne,
  type OneOnOneOutcome,
} from '@/hooks/useMeetings';
import { toast } from 'sonner';

interface MeetingOneOnOnesTabProps {
  meetingId: string;
}

const outcomeConfig: Record<OneOnOneOutcome, { label: string; icon: React.ElementType; color: string }> = {
  positive: { label: 'Pozytywny', icon: ThumbsUp, color: 'text-emerald-600 bg-emerald-500/10' },
  neutral: { label: 'Neutralny', icon: Minus, color: 'text-muted-foreground bg-muted' },
  negative: { label: 'Negatywny', icon: ThumbsDown, color: 'text-destructive bg-destructive/10' },
};

export function MeetingOneOnOnesTab({ meetingId }: MeetingOneOnOnesTabProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [contactAId, setContactAId] = useState('');
  const [contactBId, setContactBId] = useState('');
  const [outcome, setOutcome] = useState<OneOnOneOutcome>('neutral');
  const [notes, setNotes] = useState('');
  const [followUpNeeded, setFollowUpNeeded] = useState(false);

  const { data: participants = [] } = useMeetingParticipants(meetingId);
  const { data: oneOnOnes = [], isLoading } = useMeetingOneOnOnes(meetingId);
  const logOneOnOne = useLogOneOnOne();

  const handleSubmit = async () => {
    if (!contactAId || !contactBId) {
      toast.error('Wybierz obie osoby');
      return;
    }

    if (contactAId === contactBId) {
      toast.error('Osoba A i B muszą być różne');
      return;
    }

    try {
      await logOneOnOne.mutateAsync({
        groupMeetingId: meetingId,
        contactAId,
        contactBId,
        outcome,
        notes: notes || undefined,
        followUpNeeded,
      });
      toast.success('Spotkanie 1x1 zostało zarejestrowane');
      setIsPopoverOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Błąd podczas rejestrowania spotkania');
    }
  };

  const resetForm = () => {
    setContactAId('');
    setContactBId('');
    setOutcome('neutral');
    setNotes('');
    setFollowUpNeeded(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded w-full" />
            <div className="h-10 bg-muted rounded w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {oneOnOnes.length} spotkań 1x1 zarejestrowanych
        </div>

        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Dodaj spotkanie 1x1
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <h4 className="font-medium">Nowe spotkanie 1x1</h4>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Osoba A</Label>
                  <Select value={contactAId} onValueChange={setContactAId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz osobę" />
                    </SelectTrigger>
                    <SelectContent>
                      {participants.map((p) => (
                        <SelectItem key={p.id} value={p.contact_id}>
                          {p.contact?.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Osoba B</Label>
                  <Select value={contactBId} onValueChange={setContactBId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz osobę" />
                    </SelectTrigger>
                    <SelectContent>
                      {participants
                        .filter((p) => p.contact_id !== contactAId)
                        .map((p) => (
                          <SelectItem key={p.id} value={p.contact_id}>
                            {p.contact?.full_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Wynik</Label>
                  <Select value={outcome} onValueChange={(v) => setOutcome(v as OneOnOneOutcome)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="positive">Pozytywny</SelectItem>
                      <SelectItem value="neutral">Neutralny</SelectItem>
                      <SelectItem value="negative">Negatywny</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Notatki</Label>
                  <Textarea
                    placeholder="Opcjonalne notatki..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="follow-up"
                    checked={followUpNeeded}
                    onCheckedChange={(checked) => setFollowUpNeeded(checked as boolean)}
                  />
                  <Label htmlFor="follow-up" className="text-sm cursor-pointer">
                    Wymaga follow-up
                  </Label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setIsPopoverOpen(false)}>
                  Anuluj
                </Button>
                <Button size="sm" onClick={handleSubmit} disabled={logOneOnOne.isPending}>
                  Dodaj
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {oneOnOnes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">Brak spotkań 1x1</h3>
            <p className="text-sm text-muted-foreground text-center">
              Zarejestruj spotkania 1x1, które miały miejsce podczas tego wydarzenia.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              {oneOnOnes.map((meeting, index) => {
                const outcomeInfo = outcomeConfig[meeting.outcome];
                const OutcomeIcon = outcomeInfo.icon;

                return (
                  <div key={meeting.id}>
                    {index > 0 && <Separator className="my-3" />}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{meeting.contact_a?.full_name}</span>
                          <span className="text-muted-foreground">↔</span>
                          <span className="font-medium">{meeting.contact_b?.full_name}</span>

                          <Badge className={outcomeInfo.color}>
                            <OutcomeIcon className="h-3 w-3 mr-1" />
                            {outcomeInfo.label}
                          </Badge>

                          {meeting.was_recommended && (
                            <Badge variant="outline" className="gap-1">
                              <Sparkles className="h-3 w-3" />
                              Z rekomendacji
                            </Badge>
                          )}

                          {meeting.follow_up_needed && (
                            <Badge variant="secondary" className="gap-1">
                              <Bell className="h-3 w-3" />
                              Follow-up
                            </Badge>
                          )}
                        </div>

                        {meeting.notes && (
                          <p className="text-sm text-muted-foreground mt-1">{meeting.notes}</p>
                        )}

                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(meeting.created_at), 'd MMM yyyy, HH:mm', { locale: pl })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
