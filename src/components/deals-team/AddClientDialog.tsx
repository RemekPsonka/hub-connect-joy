import { useState } from 'react';
import { Search, Loader2, UserPlus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAddContactToTeam } from '@/hooks/useDealsTeamContacts';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ContactModal } from '@/components/contacts/ContactModal';

interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
}

export function AddClientDialog({ open, onOpenChange, teamId }: AddClientDialogProps) {
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;
  const addContact = useAddContactToTeam();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedContactName, setSelectedContactName] = useState<string | null>(null);
  const [showCreateContact, setShowCreateContact] = useState(false);

  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ['contacts-search-client', searchQuery, tenantId],
    queryFn: async () => {
      if (!tenantId || searchQuery.length < 2) return [];
      const tokens = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
      if (tokens.length === 0) return [];
      const primary = tokens.reduce((a, b) => (b.length > a.length ? b : a));
      const { data, error } = await supabase
        .from('contacts')
        .select('id, full_name, company, email, first_name, last_name')
        .eq('tenant_id', tenantId)
        .or(`full_name.ilike.%${primary}%,first_name.ilike.%${primary}%,last_name.ilike.%${primary}%,company.ilike.%${primary}%,email.ilike.%${primary}%`)
        .limit(50);
      if (error) throw error;
      const filtered = (data || []).filter((c: any) => {
        const haystack = [c.full_name, c.first_name, c.last_name, c.company, c.email]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return tokens.every((t) => haystack.includes(t));
      });
      return filtered.slice(0, 20);
    },
    enabled: !!tenantId && searchQuery.length >= 2,
  });

  const displayContact = searchResults.find((c) => c.id === selectedContactId) ||
    (selectedContactId && selectedContactName ? { id: selectedContactId, full_name: selectedContactName, company: null } : null);

  const handleSubmit = async () => {
    if (!selectedContactId) return;
    await addContact.mutateAsync({
      teamId,
      contactId: selectedContactId,
      category: 'client' as any,
      priority: 'medium',
    });
    handleClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedContactId(null);
    setSelectedContactName(null);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Dodaj klienta z CRM</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
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

            {searchQuery.length >= 2 && (
              <div className="space-y-2">
                {isSearching ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center py-4 space-y-2">
                    <p className="text-sm text-muted-foreground">Nie znaleziono kontaktów</p>
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowCreateContact(true)}>
                      <UserPlus className="h-4 w-4" /> Dodaj nowy kontakt
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-[150px] border rounded-md">
                    <div className="p-2 space-y-1">
                      {searchResults.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedContactId(c.id)}
                          className={`w-full text-left p-2 rounded-md text-sm transition-colors ${selectedContactId === c.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                        >
                          <p className="font-medium">{c.full_name}</p>
                          {c.company && <p className={`text-xs ${selectedContactId === c.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{c.company}</p>}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}

            {displayContact && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-md">
                <p className="font-medium text-sm">{displayContact.full_name}</p>
                {displayContact.company && <p className="text-xs text-muted-foreground">{displayContact.company}</p>}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Anuluj</Button>
            <Button onClick={handleSubmit} disabled={!selectedContactId || addContact.isPending} className="bg-emerald-600 hover:bg-emerald-700">
              {addContact.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Dodaj klienta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ContactModal
        isOpen={showCreateContact}
        onClose={() => setShowCreateContact(false)}
        onCreated={(id, name) => {
          setSelectedContactId(id);
          setSelectedContactName(name);
          setShowCreateContact(false);
        }}
      />
    </>
  );
}
