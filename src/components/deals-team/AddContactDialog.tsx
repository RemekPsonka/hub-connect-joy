import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
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
  const [category, setCategory] = useState<DealCategory>(defaultCategory);
  const [priority, setPriority] = useState<DealPriority>('medium');

  // Search contacts
  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ['contacts-search', searchQuery, tenantId],
    queryFn: async () => {
      if (!tenantId || searchQuery.length < 2) return [];

      const { data, error } = await supabase
        .from('contacts')
        .select('id, full_name, company, email')
        .eq('tenant_id', tenantId)
        .ilike('full_name', `%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      return data as Contact[];
    },
    enabled: !!tenantId && searchQuery.length >= 2,
  });

  const selectedContact = searchResults.find((c) => c.id === selectedContactId);

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
    setCategory(defaultCategory);
    setPriority('medium');
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSearchQuery('');
      setSelectedContactId(null);
      setCategory(defaultCategory);
      setPriority('medium');
    }
    onOpenChange(newOpen);
  };

  return (
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
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nie znaleziono kontaktów
                </p>
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
          {selectedContact && (
            <div className="p-3 bg-muted rounded-md">
              <p className="font-medium text-sm">{selectedContact.full_name}</p>
              {selectedContact.company && (
                <p className="text-xs text-muted-foreground">{selectedContact.company}</p>
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
                <SelectItem value="top">⭐ TOP</SelectItem>
                <SelectItem value="lead">📋 LEAD</SelectItem>
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
  );
}
