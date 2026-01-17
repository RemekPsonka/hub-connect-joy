import { useNavigate } from 'react-router-dom';
import { X, User, Building2, Briefcase, ExternalLink, Calendar, Route } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ContactNode } from '@/hooks/useConnections';
import { useContactConnections } from '@/hooks/useConnections';

interface GraphSidebarProps {
  selectedNode: ContactNode | null;
  onClose: () => void;
  onFindPath: (contactId: string) => void;
  nodes: ContactNode[];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function GraphSidebar({ selectedNode, onClose, onFindPath, nodes }: GraphSidebarProps) {
  const navigate = useNavigate();
  const { data: connections, isLoading } = useContactConnections(selectedNode?.id || null);

  if (!selectedNode) {
    return (
      <div className="w-80 border-l bg-card p-6 flex flex-col items-center justify-center text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <User className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">
          Kliknij na węzeł aby zobaczyć szczegóły kontaktu
        </p>
      </div>
    );
  }

  return (
    <div className="w-80 border-l bg-card flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-start gap-3">
        <Avatar className="h-12 w-12">
          <AvatarFallback 
            style={{ backgroundColor: selectedNode.group_color || '#6366f1' }}
            className="text-white"
          >
            {getInitials(selectedNode.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{selectedNode.full_name}</h3>
          {selectedNode.position && (
            <p className="text-sm text-muted-foreground truncate">{selectedNode.position}</p>
          )}
          {selectedNode.company && (
            <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {selectedNode.company}
            </p>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Liczba połączeń</span>
          <Badge variant="secondary">{selectedNode.connection_count || 0}</Badge>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-b space-y-2">
        <Button 
          variant="outline" 
          className="w-full justify-start" 
          onClick={() => navigate(`/contacts/${selectedNode.id}`)}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Zobacz profil
        </Button>
        <Button 
          variant="outline" 
          className="w-full justify-start"
          onClick={() => onFindPath(selectedNode.id)}
        >
          <Route className="h-4 w-4 mr-2" />
          Znajdź ścieżkę do...
        </Button>
      </div>

      {/* Connections List */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-4 py-2 border-b">
          <h4 className="font-medium text-sm">Bezpośrednie połączenia</h4>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Ładowanie...
              </div>
            ) : connections && connections.length > 0 ? (
              connections.map((conn: any) => (
                <button
                  key={conn.id}
                  className="w-full p-2 rounded-lg hover:bg-muted flex items-center gap-3 text-left transition-colors"
                  onClick={() => navigate(`/contacts/${conn.connected_contact?.id}`)}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {conn.connected_contact ? getInitials(conn.connected_contact.full_name) : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {conn.connected_contact?.full_name || 'Nieznany'}
                    </p>
                    {conn.connected_contact?.company && (
                      <p className="text-xs text-muted-foreground truncate">
                        {conn.connected_contact.company}
                      </p>
                    )}
                  </div>
                  {conn.connection_type && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      {conn.connection_type === 'knows' ? 'zna' : conn.connection_type}
                    </Badge>
                  )}
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Brak bezpośrednich połączeń
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
