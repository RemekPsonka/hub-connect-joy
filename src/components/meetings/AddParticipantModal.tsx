import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, UserPlus } from 'lucide-react';
import { useContacts } from '@/hooks/useContacts';
import { useAddParticipant } from '@/hooks/useMeetings';
import { toast } from 'sonner';

interface AddParticipantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingId: string;
  existingParticipantIds: string[];
}

export function AddParticipantModal({
  open,
  onOpenChange,
  meetingId,
  existingParticipantIds,
}: AddParticipantModalProps) {
  const [search, setSearch] = useState('');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [isNew, setIsNew] = useState(false);

  const { data: contactsData, isLoading } = useContacts({ search, sortBy: 'full_name', sortOrder: 'asc' });
  const addParticipant = useAddParticipant();

  const contacts = Array.isArray(contactsData) ? contactsData : contactsData?.data ?? [];

  // Filter out already added participants
  const availableContacts = contacts.filter(
    (c) => !existingParticipantIds.includes(c.id)
  );

  const handleAdd = async () => {
    if (!selectedContactId) return;

    try {
      await addParticipant.mutateAsync({
        meetingId,
        contactId: selectedContactId,
        isMember,
        isNew,
      });
      toast.success('Uczestnik został dodany');
      onOpenChange(false);
      setSelectedContactId(null);
      setIsMember(false);
      setIsNew(false);
      setSearch('');
    } catch (error) {
      toast.error('Błąd podczas dodawania uczestnika');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dodaj uczestnika</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj kontaktu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-64 border rounded-md">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">Ładowanie...</div>
            ) : availableContacts.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                {search ? 'Nie znaleziono kontaktów' : 'Brak dostępnych kontaktów'}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {availableContacts.slice(0, 20).map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => setSelectedContactId(contact.id)}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                      selectedContactId === contact.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="font-medium">{contact.full_name}</div>
                    {contact.company && (
                      <div className={`text-sm ${selectedContactId === contact.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                        {contact.company}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Checkbox
                id="is-member"
                checked={isMember}
                onCheckedChange={(checked) => {
                  setIsMember(checked as boolean);
                  if (checked) setIsNew(false);
                }}
              />
              <Label htmlFor="is-member" className="text-sm">
                Mój członek
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="is-new"
                checked={isNew}
                onCheckedChange={(checked) => {
                  setIsNew(checked as boolean);
                  if (checked) setIsMember(false);
                }}
              />
              <Label htmlFor="is-new" className="text-sm">
                Nowy kontakt
              </Label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!selectedContactId || addParticipant.isPending}
              className="gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Dodaj uczestnika
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
