import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowRight, Route, Loader2, Search } from 'lucide-react';
import { ContactNode, useFindConnectionPath } from '@/hooks/useConnections';

interface FindPathModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodes: ContactNode[];
  startContactId: string | null;
  onPathFound: (path: string[]) => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function FindPathModal({
  open,
  onOpenChange,
  nodes,
  startContactId,
  onPathFound,
}: FindPathModalProps) {
  const [endContactId, setEndContactId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const startContact = useMemo(
    () => nodes.find((n) => n.id === startContactId),
    [nodes, startContactId]
  );

  const { data: pathResult, isLoading } = useFindConnectionPath(startContactId, endContactId);

  const filteredNodes = useMemo(() => {
    return nodes
      .filter((n) => n.id !== startContactId)
      .filter((n) => 
        n.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (n.company && n.company.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .slice(0, 50);
  }, [nodes, startContactId, searchTerm]);

  const handleSelectEndContact = (contactId: string) => {
    setEndContactId(contactId);
  };

  const handleShowPath = () => {
    if (pathResult && pathResult.length > 0) {
      onPathFound(pathResult[0].path);
      onOpenChange(false);
    }
  };

  const endContact = useMemo(
    () => nodes.find((n) => n.id === endContactId),
    [nodes, endContactId]
  );

  const pathContacts = useMemo(() => {
    if (!pathResult || pathResult.length === 0) return [];
    return pathResult[0].path.map((id) => nodes.find((n) => n.id === id)).filter(Boolean);
  }, [pathResult, nodes]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" />
            Znajdź ścieżkę połączeń
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Start Contact */}
          <div>
            <Label className="text-sm text-muted-foreground">Od</Label>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg mt-1">
              <Avatar className="h-10 w-10">
                <AvatarFallback style={{ backgroundColor: startContact?.group_color || '#6366f1' }} className="text-white">
                  {startContact ? getInitials(startContact.full_name) : '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{startContact?.full_name || 'Wybierz kontakt'}</p>
                {startContact?.company && (
                  <p className="text-sm text-muted-foreground">{startContact.company}</p>
                )}
              </div>
            </div>
          </div>

          {/* End Contact Selection */}
          <div>
            <Label className="text-sm text-muted-foreground">Do</Label>
            {endContact ? (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg mt-1">
                <Avatar className="h-10 w-10">
                  <AvatarFallback style={{ backgroundColor: endContact.group_color || '#6366f1' }} className="text-white">
                    {getInitials(endContact.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{endContact.full_name}</p>
                  {endContact.company && (
                    <p className="text-sm text-muted-foreground">{endContact.company}</p>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setEndContactId(null)}>
                  Zmień
                </Button>
              </div>
            ) : (
              <div className="mt-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Szukaj kontaktu..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <ScrollArea className="h-48 mt-2 border rounded-lg">
                  <div className="p-1">
                    {filteredNodes.map((node) => (
                      <button
                        key={node.id}
                        className="w-full p-2 rounded-md hover:bg-muted flex items-center gap-3 text-left transition-colors"
                        onClick={() => handleSelectEndContact(node.id)}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs" style={{ backgroundColor: node.group_color || '#6366f1' }}>
                            {getInitials(node.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{node.full_name}</p>
                          {node.company && (
                            <p className="text-xs text-muted-foreground truncate">{node.company}</p>
                          )}
                        </div>
                      </button>
                    ))}
                    {filteredNodes.length === 0 && (
                      <p className="p-4 text-center text-sm text-muted-foreground">
                        Nie znaleziono kontaktów
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Path Result */}
          {endContactId && (
            <div className="border-t pt-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : pathResult && pathResult.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Stopnie separacji:</span>
                    <span className="font-semibold text-primary">{pathResult[0].depth}</span>
                  </div>
                  
                  <div className="flex items-center flex-wrap gap-2">
                    {pathContacts.map((contact, index) => (
                      <div key={contact?.id} className="flex items-center gap-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs" style={{ backgroundColor: contact?.group_color || '#6366f1' }}>
                              {contact ? getInitials(contact.full_name) : '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{contact?.full_name}</span>
                        </div>
                        {index < pathContacts.length - 1 && (
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                  </div>

                  <Button onClick={handleShowPath} className="w-full">
                    Pokaż na grafie
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nie znaleziono ścieżki między tymi kontaktami</p>
                  <p className="text-sm mt-1">Nie są połączeni w sieci</p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
