import { useState, useMemo } from 'react';
import { Search, X, Eye, Loader2 } from 'lucide-react';
import { useTeamWatchedContacts, useAddWatchedContact, useRemoveWatchedContact } from '@/hooks/useTeamWatchedContacts';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface WatchedContactsConfigProps {
  teamId: string;
  tenantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WatchedContactsConfig({ teamId, tenantId, open, onOpenChange }: WatchedContactsConfigProps) {
  const { data: watched = [], isLoading } = useTeamWatchedContacts(teamId);
  const addWatched = useAddWatchedContact();
  const removeWatched = useRemoveWatchedContact();

  const [searchQuery, setSearchQuery] = useState('');

  // Search contacts from CRM
  const { data: searchResults = [] } = useQuery({
    queryKey: ['search-contacts-for-watch', searchQuery, tenantId],
    queryFn: async () => {
      if (searchQuery.length < 2) return [];
      const { data, error } = await supabase
        .from('contacts')
        .select('id, full_name, company, position')
        .eq('tenant_id', tenantId)
        .ilike('full_name', `%${searchQuery}%`)
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: searchQuery.length >= 2,
  });

  const watchedIds = useMemo(() => new Set(watched.map(w => w.contact_id)), [watched]);

  const filteredResults = useMemo(
    () => searchResults.filter(c => !watchedIds.has(c.id)),
    [searchResults, watchedIds]
  );

  const handleAdd = async (contactId: string) => {
    await addWatched.mutateAsync({ teamId, contactId, tenantId });
  };

  const handleRemove = async (id: string) => {
    await removeWatched.mutateAsync({ id, teamId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Monitorowane kontakty (Poszukiwani)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current watched list */}
          <div>
            <p className="text-sm font-medium mb-2">
              Monitorowani ({watched.length})
            </p>
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : watched.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Brak monitorowanych kontaktów. Dodaj kontakt CRM, aby widzieć jego wpisy "Poszukiwani" w lejku.
              </p>
            ) : (
              <ScrollArea className="max-h-48">
                <div className="space-y-1">
                  {watched.map((w) => (
                    <div key={w.id} className="flex items-center justify-between p-2 rounded-md border bg-muted/30">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {(w.contact as any)?.full_name || 'Nieznany'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {(w.contact as any)?.company || ''}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => handleRemove(w.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          <Separator />

          {/* Search and add */}
          <div>
            <p className="text-sm font-medium mb-2">Dodaj kontakt do monitorowania</p>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj kontakt CRM..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {searchQuery.length >= 2 && (
              <ScrollArea className="max-h-48">
                <div className="space-y-1">
                  {filteredResults.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      Nie znaleziono kontaktów
                    </p>
                  ) : (
                    filteredResults.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center justify-between p-2 rounded-md border cursor-pointer hover:bg-muted"
                        onClick={() => handleAdd(contact.id)}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{contact.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {[contact.position, contact.company].filter(Boolean).join(' @ ')}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">+ Dodaj</Badge>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
