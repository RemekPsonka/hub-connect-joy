import { useMemo } from 'react';
import { Flame, Star, ClipboardList, Search, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useTeamContactStats } from '@/hooks/useDealsTeamContacts';
import { useTeamProspects } from '@/hooks/useDealsTeamProspects';
import { Skeleton } from '@/components/ui/skeleton';

interface TeamStatsProps {
  teamId: string;
}

export function TeamStats({ teamId }: TeamStatsProps) {
  const contactStats = useTeamContactStats(teamId);
  const { data: prospects = [], isLoading: prospectsLoading } = useTeamProspects(teamId, true);

  const prospectStats = useMemo(() => {
    const activeProspects = prospects.filter(
      (p) => p.status !== 'converted' && p.status !== 'cancelled'
    );
    const convertedProspects = prospects.filter((p) => p.status === 'converted');
    return {
      total: activeProspects.length,
      converted: convertedProspects.length,
    };
  }, [prospects]);

  if (prospectsLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* HOT Leads */}
      <Card className="border-l-4 border-l-red-500">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium text-muted-foreground">
                  HOT Leads
                </span>
              </div>
              <p className="text-2xl font-bold">{contactStats.hot_count}</p>
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <p className="text-xs text-muted-foreground">Wartość</p>
            <p className="text-sm font-semibold">
              {contactStats.total_value.toLocaleString('pl-PL')} PLN
            </p>
          </div>
          {contactStats.overdue_count > 0 && (
            <div className="mt-2 flex items-center gap-1 text-xs text-destructive font-medium">
              <AlertTriangle className="h-3 w-3" />
              <span>{contactStats.overdue_count} bez statusu</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* TOP Leads */}
      <Card className="border-l-4 border-l-amber-500">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium text-muted-foreground">
                  TOP Leads
                </span>
              </div>
              <p className="text-2xl font-bold">{contactStats.top_count}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Gotowe do awansu</p>
        </CardContent>
      </Card>

      {/* LEAD */}
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-muted-foreground">
                  Leads
                </span>
              </div>
              <p className="text-2xl font-bold">{contactStats.lead_count}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">W kolejce</p>
        </CardContent>
      </Card>

      {/* Poszukiwani */}
      <Card className="border-l-4 border-l-purple-500">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium text-muted-foreground">
                  Poszukiwani
                </span>
              </div>
              <p className="text-2xl font-bold">{prospectStats.total}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {prospectStats.converted} skonwertowanych
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
