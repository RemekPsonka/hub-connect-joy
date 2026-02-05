import { useState, useRef } from 'react';
import { useRepresentativeContacts } from '@/hooks/useRepresentativeContacts';
import { SalesRepresentative } from '@/hooks/useRepresentatives';
import { useContacts } from '@/hooks/useContacts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVirtualizer } from '@tanstack/react-virtual';

interface AssignContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  representatives: SalesRepresentative[];
  prefilledContactId?: string;
}

export function AssignContactModal({ 
  isOpen, 
  onClose, 
  representatives,
  prefilledContactId,
}: AssignContactModalProps) {
  const { assignContact } = useRepresentativeContacts();
  const { data: contactsData, isLoading: isLoadingContacts } = useContacts({ pageSize: 100 });
  const contacts = contactsData?.data || [];
  const [contactId, setContactId] = useState<string | null>(prefilledContactId || null);
  const [representativeId, setRepresentativeId] = useState<string>('');
  const [deadlineDays, setDeadlineDays] = useState<string>('14');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedContact = contacts?.find(c => c.id === contactId);

  // Filter contacts based on search
  const filteredContacts = contacts.filter(contact => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      contact.full_name.toLowerCase().includes(query) ||
      (contact.company?.toLowerCase().includes(query) ?? false)
    );
  });

  // Virtualization
  const listRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: filteredContacts.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contactId || !representativeId) return;

    setIsSubmitting(true);
    try {
      await assignContact.mutateAsync({
        contact_id: contactId,
        representative_id: representativeId,
        deadline_days: parseInt(deadlineDays, 10),
        notes: notes || undefined,
      });
      
      // Reset form
      setContactId(null);
      setRepresentativeId('');
      setDeadlineDays('14');
      setNotes('');
      setSearchQuery('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeReps = representatives.filter(r => r.is_active);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Przekaż kontakt</DialogTitle>
          <DialogDescription>
            Przypisz kontakt do przedstawiciela handlowego lub ambasadora.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Kontakt *</Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between"
                >
                  {selectedContact ? selectedContact.full_name : "Wybierz kontakt..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0">
                <Command shouldFilter={false}>
                  <CommandInput 
                    placeholder="Szukaj kontaktu..." 
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                  />
                  <CommandList>
                    <CommandEmpty>Nie znaleziono kontaktów.</CommandEmpty>
                    <div ref={listRef} className="max-h-[300px] overflow-auto">
                      <CommandGroup>
                        <div
                          style={{
                            height: virtualizer.getTotalSize(),
                            position: 'relative',
                          }}
                        >
                          {virtualizer.getVirtualItems().map((virtualRow) => {
                            const contact = filteredContacts[virtualRow.index];
                            return (
                              <CommandItem
                                key={contact.id}
                                value={contact.full_name}
                                onSelect={() => {
                                  setContactId(contact.id);
                                  setOpen(false);
                                  setSearchQuery('');
                                }}
                                className="cursor-pointer absolute w-full"
                                style={{
                                  top: 0,
                                  left: 0,
                                  height: 48,
                                  transform: `translateY(${virtualRow.start}px)`,
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    contactId === contact.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div>
                                  <div>{contact.full_name}</div>
                                  {contact.company && (
                                    <div className="text-xs text-muted-foreground">{contact.company}</div>
                                  )}
                                </div>
                              </CommandItem>
                            );
                          })}
                        </div>
                      </CommandGroup>
                    </div>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="representative">Przedstawiciel *</Label>
            <Select value={representativeId} onValueChange={setRepresentativeId}>
              <SelectTrigger id="representative">
                <SelectValue placeholder="Wybierz przedstawiciela" />
              </SelectTrigger>
              <SelectContent>
                {activeReps.map((rep) => (
                  <SelectItem key={rep.id} value={rep.id}>
                    {rep.full_name} ({rep.role_type === 'ambassador' ? 'Ambasador' : 'Przedstawiciel'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline">Termin na umówienie spotkania</Label>
            <Select value={deadlineDays} onValueChange={setDeadlineDays}>
              <SelectTrigger id="deadline">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 dni</SelectItem>
                <SelectItem value="14">14 dni</SelectItem>
                <SelectItem value="21">21 dni</SelectItem>
                <SelectItem value="30">30 dni</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notatki (opcjonalne)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Dodatkowe instrukcje lub kontekst dla przedstawiciela..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Anuluj
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !contactId || !representativeId}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Przekaż
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
