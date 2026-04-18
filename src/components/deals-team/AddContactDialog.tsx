import { useState } from 'react';
import { Search, Loader2, UserPlus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAddContactToTeam } from '@/hooks/useDealsTeamContacts';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { ContactModal } from '@/components/contacts/ContactModal';
import type { DealCategory, DealPriority } from '@/types/dealTeam';

interface AddContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  defaultCategory: DealCategory;
}

interface Contact {
  id: string;
  full_name: string;
  company: string | null;
  email: string | null;
}

export function AddContactDialog({
  open,
  onOpenChange,
  teamId,
  defaultCategory,
}: AddContactDialogProps) {
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;
  const addContact = useAddContactToTeam();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedContactName, setSelectedContactName] = useState<string | null>(null);
  const [category, setCategory] = useState<DealCategory>(defaultCategory);
  const [priority, setPriority] = useState<DealPriority>('medium');
  const [showCreateContact, setShowCreateContact] = useState(false);

  // Search contacts
  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ['contacts-search', searchQuery, tenantId],
    queryFn: async () => {
      if (!tenantId || searchQuery.length < 2) return [];

      const tokens = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
      if (tokens.length === 0) return [];

      // Use longest token for server-side narrowing
      const primary = tokens.reduce((a, b) => (b.length > a.length ? b : a));
      const { data, error } = await supabase
        .from('contacts')
        .select('id, full_name, company, email, first_name, last_name')
        .eq('tenant_id', tenantId)
        .or(
          `full_name.ilike.%${primary}%,first_name.ilike.%${primary}%,last_name.ilike.%${primary}%,company.ilike.%${primary}%,email.ilike.%${primary}%`
        )
        .limit(50);

      if (error) throw error;
      // Client-side: every token must be present in concatenated haystack
      const filtered = (data as Contact[]).filter((c) => {
        const haystack = [c.full_name, (c as any).first_name, (c as any).last_name, c.company, c.email]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return tokens.every((t) => haystack.includes(t));
      });
      return filtered.slice(0, 20);
    },
    enabled: !!tenantId && searchQuery.length >= 2,
  });

  const selectedContact = searchResults.find((c) => c.id === selectedContactId);

  // For contacts created via ContactModal (not in search results)
  const selectedCreatedContact = selectedContactId && !selectedContact && selectedContactName
    ? { id: selectedContactId, full_name: selectedContactName, company: null, email: null }
    : null;

  const displayContact = selectedContact || selectedCreatedContact;

  const handleContactCreated = (contactId: string, contactName: string) => {
    setSelectedContactId(contactId);
    setSelectedContactName(contactName);
    setShowCreateContact(false);
  };

  const handleSubmit = async () => {
    if (!selectedContactId) return;

    await addContact.mutateAsync({
      teamId,
      contactId: selectedContactId,
      category,
      priority,
    });

    // Reset form and close dialog
    setSearchQuery('');
    setSelectedContactId(null);
    setSelectedContactName(null);
    setCategory(defaultCategory);
    setPriority('medium');
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSearchQuery('');
      setSelectedContactId(null);
      setSelectedContactName(null);
      setCategory(defaultCategory);
      setPriority('medium');
    }
    onOpenChange(newOpen);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Dodaj kontakt do zespołu</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search input */}
          <div className="space-y-2">
            <Label>Wyszukaj kontakt</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Wpisz imię lub nazwisko..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Search results */}
          {searchQuery.length >= 2 && (
            <div className="space-y-2">
              <Label>Wyniki wyszukiwania</Label>
              {isSearching ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-4 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Nie znaleziono kontaktów
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setShowCreateContact(true)}
                  >
                    <UserPlus className="h-4 w-4" />
                    Dodaj nowy kontakt
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-[150px] border rounded-md">
                  <div className="p-2 space-y-1">
                    {searchResults.map((contact) => (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => setSelectedContactId(contact.id)}
                        className={`w-full text-left p-2 rounded-md text-sm transition-colors ${
                          selectedContactId === contact.id
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <p className="font-medium">{contact.full_name}</p>
                        {contact.company && (
                          <p
                            className={`text-xs ${
                              selectedContactId === contact.id
                                ? 'text-primary-foreground/80'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {contact.company}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}

          {/* Selected contact preview */}
          {displayContact && (
            <div className="p-3 bg-muted rounded-md">
              <p className="font-medium text-sm">{displayContact.full_name}</p>
              {displayContact.company && (
                <p className="text-xs text-muted-foreground">{displayContact.company}</p>
              )}
            </div>
          )}

          {/* Category select */}
          <div className="space-y-2">
            <Label>Kategoria</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as DealCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hot">🔥 HOT</SelectItem>
                <SelectItem value="audit">📅 AUDYT</SelectItem>
                <SelectItem value="top">⭐ TOP</SelectItem>
                <SelectItem value="lead">📋 LEAD</SelectItem>
                <SelectItem value="10x">🔄 10x</SelectItem>
                <SelectItem value="cold">❄️ COLD</SelectItem>
                <SelectItem value="lost">✖️ PRZEGRANE</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority select */}
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Anuluj
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedContactId || addContact.isPending}
          >
            {addContact.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Dodaj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ContactModal
      isOpen={showCreateContact}
      onClose={() => setShowCreateContact(false)}
      onCreated={handleContactCreated}
    />
  </>
  );
}
