import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useContactConnections } from '@/hooks/useConnections';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Plus, Building2, UserPlus } from 'lucide-react';
import { AddConnectionModal } from '@/components/network/AddConnectionModal';

interface ContactConnectionsSectionProps {
  contactId: string;
  contactName: string;
}

const connectionTypeLabels: Record<string, string> = {
  knows: 'Znajomy',
  met_at_event: 'Poznany na evencie',
  family: 'Rodzina',
  colleague: 'Współpracownik',
  business_partner: 'Partner biznesowy',
};

const connectionTypeColors: Record<string, string> = {
  knows: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  met_at_event: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  family: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  colleague: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  business_partner: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
};

export function ContactConnectionsSection({ contactId, contactName }: ContactConnectionsSectionProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { data: connections, isLoading } = useContactConnections(contactId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Sieć kontaktów
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Sieć kontaktów
            {connections && connections.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {connections.length}
              </Badge>
            )}
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsAddModalOpen(true)}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            Dodaj
          </Button>
        </CardHeader>
        <CardContent>
          {!connections || connections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Brak połączeń w sieci kontaktów</p>
              <p className="text-xs mt-1">
                Dodaj znajomych ręcznie lub poprzez spotkania 1x1 w konsultacjach
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {connections.map((connection) => (
                <Link 
                  key={connection.id} 
                  to={`/contacts/${connection.connected_contact?.id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {connection.connected_contact?.full_name}
                        </span>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${connectionTypeColors[connection.connection_type] || ''}`}
                        >
                          {connectionTypeLabels[connection.connection_type] || connection.connection_type}
                        </Badge>
                      </div>
                      {connection.connected_contact?.company && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                          <Building2 className="h-3 w-3" />
                          <span className="truncate">{connection.connected_contact.company}</span>
                          {connection.connected_contact.position && (
                            <span className="truncate">• {connection.connected_contact.position}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <div className="flex items-center gap-1">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${(connection.strength || 5) * 10}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-4">
                          {connection.strength || 5}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddConnectionModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        preselectedContactId={contactId}
      />
    </>
  );
}
