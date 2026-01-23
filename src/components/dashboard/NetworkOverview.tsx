import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Network, Users, Link2, ArrowRight, Crown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface NetworkStats {
  totalContacts: number;
  totalConnections: number;
  topConnected: Array<{
    id: string;
    full_name: string;
    connection_count: number;
  }>;
}

export function NetworkOverview() {
  const navigate = useNavigate();
  const { director } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['network-overview', director?.tenant_id],
    queryFn: async (): Promise<NetworkStats> => {
      // Pobierz liczbę kontaktów
      const { count: contactsCount } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Pobierz liczbę połączeń
      const { count: connectionsCount } = await supabase
        .from('connections')
        .select('*', { count: 'exact', head: true });

      // Pobierz top 5 najbardziej połączonych kontaktów
      const { data: connections } = await supabase
        .from('connections')
        .select('contact_a_id, contact_b_id');

      // Policz połączenia dla każdego kontaktu
      const connectionCounts: Record<string, number> = {};
      connections?.forEach((conn) => {
        connectionCounts[conn.contact_a_id] = (connectionCounts[conn.contact_a_id] || 0) + 1;
        connectionCounts[conn.contact_b_id] = (connectionCounts[conn.contact_b_id] || 0) + 1;
      });

      // Znajdź top 5
      const topIds = Object.entries(connectionCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id]) => id);

      let topConnected: NetworkStats['topConnected'] = [];
      
      if (topIds.length > 0) {
        const { data: topContacts } = await supabase
          .from('contacts')
          .select('id, full_name')
          .in('id', topIds);

        topConnected = topIds.map((id) => {
          const contact = topContacts?.find((c) => c.id === id);
          return {
            id,
            full_name: contact?.full_name || 'Nieznany',
            connection_count: connectionCounts[id],
          };
        });
      }

      return {
        totalContacts: contactsCount || 0,
        totalConnections: connectionsCount || 0,
        topConnected,
      };
    },
    enabled: !!director?.tenant_id,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Network className="h-4 w-4 text-primary" />
            Moja sieć
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Network className="h-4 w-4 text-primary" />
            Moja sieć
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/network')}
            className="h-8"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-semibold">{stats?.totalContacts || 0}</p>
            <p className="text-xs text-muted-foreground">Kontaktów</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <Link2 className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-semibold">{stats?.totalConnections || 0}</p>
            <p className="text-xs text-muted-foreground">Połączeń</p>
          </div>
        </div>

        {/* Top connected */}
        {stats?.topConnected && stats.topConnected.length > 0 ? (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Crown className="h-3 w-3" />
              Najbardziej połączeni
            </p>
            <div className="space-y-1.5">
              {stats.topConnected.map((contact, index) => (
                <button
                  key={contact.id}
                  onClick={() => navigate(`/contacts/${contact.id}`)}
                  className="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground w-4">
                      {index + 1}.
                    </span>
                    <span className="text-sm truncate">{contact.full_name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {contact.connection_count} połączeń
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <Network className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p className="text-xs">Brak połączeń w sieci</p>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/network')}
          className="w-full mt-3 text-muted-foreground hover:text-foreground"
        >
          Zobacz pełną sieć
          <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
