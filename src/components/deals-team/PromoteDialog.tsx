import { useState } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { useTeamMembers } from '@/hooks/useDealsTeamMembers';
import { useUpdateTeamContact } from '@/hooks/useDealsTeamContacts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { DealTeamContact, DealCategory, DealPriority } from '@/types/dealTeam';

interface PromoteDialogProps {
  contact: DealTeamContact;
  targetCategory: 'top' | 'hot';
  teamId: string;
  open: boolean;
  onClose: () => void;
}

export function PromoteDialog({
  contact,
  targetCategory,
  teamId,
  open,
  onClose,
}: PromoteDialogProps) {
  const { data: members = [] } = useTeamMembers(teamId);
  const updateContact = useUpdateTeamContact();

  // Form state for LEAD → TOP
  const [assignedTo, setAssignedTo] = useState<string>(contact.assigned_to || '');
  const [nextAction, setNextAction] = useState<string>(contact.next_action || '');
  const [nextActionDate, setNextActionDate] = useState<Date | undefined>(
    contact.next_action_date ? new Date(contact.next_action_date) : undefined
  );
  const [priority, setPriority] = useState<DealPriority>(contact.priority || 'medium');

  // Form state for TOP → HOT
  const [nextMeetingDate, setNextMeetingDate] = useState<Date | undefined>(
    contact.next_meeting_date ? new Date(contact.next_meeting_date) : undefined
  );
  const [nextMeetingWith, setNextMeetingWith] = useState<string>(
    contact.next_meeting_with || ''
  );
  const [estimatedValue, setEstimatedValue] = useState<string>(
    contact.estimated_value?.toString() || ''
  );
  const [valueCurrency, setValueCurrency] = useState<string>(
    contact.value_currency || 'PLN'
  );

  const isToTop = targetCategory === 'top';
  const isToHot = targetCategory === 'hot';

  // Validation
  const canSubmitToTop = !!assignedTo && !!nextAction.trim();
  const canSubmitToHot = !!nextMeetingDate;
  const canSubmit = isToTop ? canSubmitToTop : canSubmitToHot;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    const updates: Parameters<typeof updateContact.mutateAsync>[0] = {
      id: contact.id,
      teamId,
      category: targetCategory as DealCategory,
    };

    if (isToTop) {
      updates.assignedTo = assignedTo;
      updates.nextAction = nextAction;
      updates.nextActionDate = nextActionDate?.toISOString() || null;
      updates.priority = priority;
    }

    if (isToHot) {
      updates.nextMeetingDate = nextMeetingDate?.toISOString() || null;
      updates.nextMeetingWith = nextMeetingWith || null;
      updates.estimatedValue = estimatedValue ? parseFloat(estimatedValue) : null;
      updates.valueCurrency = valueCurrency;
    }

    await updateContact.mutateAsync(updates);
    onClose();
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isToTop ? 'Awansuj do TOP LEAD ⭐' : 'Awansuj do HOT LEAD 🔥'}
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">
              {contact.contact?.full_name || 'Nieznany kontakt'}
            </p>
            {contact.contact?.company && <p>{contact.contact.company}</p>}
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* LEAD → TOP fields */}
          {isToTop && (
            <>
              {/* Assigned to */}
              <div className="space-y-2">
                <Label>Osoba odpowiedzialna *</Label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz członka zespołu..." />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.director_id}>
                        {member.director?.full_name || 'Nieznany'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Next action */}
              <div className="space-y-2">
                <Label>Następna akcja *</Label>
                <Input
                  placeholder="np. Umówić spotkanie z CEO"
                  value={nextAction}
                  onChange={(e) => setNextAction(e.target.value)}
                />
              </div>

              {/* Next action date */}
              <div className="space-y-2">
                <Label>Termin akcji</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !nextActionDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {nextActionDate
                        ? format(nextActionDate, 'd MMMM yyyy', { locale: pl })
                        : 'Wybierz datę...'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={nextActionDate}
                      onSelect={setNextActionDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label>Priorytet</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as DealPriority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Pilny</SelectItem>
                    <SelectItem value="high">Wysoki</SelectItem>
                    <SelectItem value="medium">Średni</SelectItem>
                    <SelectItem value="low">Niski</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* TOP → HOT fields */}
          {isToHot && (
            <>
              {/* Next meeting date */}
              <div className="space-y-2">
                <Label>Data najbliższego spotkania *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !nextMeetingDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {nextMeetingDate
                        ? format(nextMeetingDate, 'd MMMM yyyy', { locale: pl })
                        : 'Wybierz datę...'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={nextMeetingDate}
                      onSelect={setNextMeetingDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Next meeting with */}
              <div className="space-y-2">
                <Label>Kto idzie na spotkanie</Label>
                <Select value={nextMeetingWith} onValueChange={setNextMeetingWith}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz członka zespołu..." />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.director?.full_name || member.director_id}>
                        {member.director?.full_name || 'Nieznany'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Estimated value */}
              <div className="space-y-2">
                <Label>Szacowana wartość deal</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="50000"
                    value={estimatedValue}
                    onChange={(e) => setEstimatedValue(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={valueCurrency} onValueChange={setValueCurrency}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PLN">PLN</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Anuluj
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || updateContact.isPending}>
            {updateContact.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            {isToTop ? '⬆️ Awansuj do TOP' : '🔥 Awansuj do HOT'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
