import { useMemo } from 'react';
import { Flame, Star, ClipboardList, Search, AlertTriangle, Snowflake, UserCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useTeamContactStats } from '@/hooks/useDealsTeamContacts';
import { useTeamProspects } from '@/hooks/useDealsTeamProspects';
import { useTeamClients, useAllTeamClientProducts, CATEGORY_PROBABILITY } from '@/hooks/useTeamClients';
import { useTeamContacts } from '@/hooks/useDealsTeamContacts';
import { formatCompactCurrency } from '@/lib/formatCurrency';
import { Skeleton } from '@/components/ui/skeleton';

interface TeamStatsProps {
  teamId: string;
}

export function TeamStats({ teamId }: TeamStatsProps) {
  const contactStats = useTeamContactStats(teamId);
  const { data: prospects = [], isLoading: prospectsLoading } = useTeamProspects(teamId, true);
  const { data: clients = [] } = useTeamClients(teamId);
  const { data: allProducts = [] } = useAllTeamClientProducts(teamId);
  const { data: allContacts = [] } = useTeamContacts(teamId);

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

  // Weighted pipeline value from client products assigned to leads
  const weightedValue = useMemo(() => {
    let total = 0;
    allProducts.forEach((p) => {
      // Find the contact to determine category probability
      const contact = allContacts.find((c) => c.id === p.team_contact_id);
      const prob = contact ? (CATEGORY_PROBABILITY[contact.category] || 0) : p.probability_percent;
      total += p.deal_value * (prob / 100);
    });
    return total;
  }, [allProducts, allContacts]);

  const categoryValues = useMemo(() => {
    const values: Record<string, { value: number; commission: number }> = {
      hot: { value: 0, commission: 0 },
      top: { value: 0, commission: 0 },
      lead: { value: 0, commission: 0 },
      cold: { value: 0, commission: 0 },
    };
    allProducts.forEach((p) => {
      const contact = allContacts.find((c) => c.id === p.team_contact_id);
      if (contact && contact.category in values) {
        values[contact.category].value += p.deal_value;
        values[contact.category].commission += p.expected_commission;
      }
    });
    return values;
  }, [allProducts, allContacts]);

  const { clientTotalValue, clientTotalCommission } = useMemo(() => {
    let value = 0;
    let commission = 0;
    allProducts.forEach((p) => {
      const contact = clients.find((c) => c.id === p.team_contact_id);
      if (contact) {
        value += p.deal_value;
        commission += p.expected_commission;
      }
    });
    return { clientTotalValue: value, clientTotalCommission: commission };
  }, [allProducts, clients]);

  if (prospectsLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
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
              {formatCompactCurrency(categoryValues.hot.value)}
            </p>
            {categoryValues.hot.commission > 0 && (
              <>
                <p className="text-xs text-muted-foreground">Prowizja</p>
                <p className="text-sm font-semibold text-red-500">
                  {formatCompactCurrency(categoryValues.hot.commission)}
                </p>
              </>
            )}
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
          <div className="mt-2 space-y-1">
            <p className="text-xs text-muted-foreground">Wartość</p>
            <p className="text-sm font-semibold">
              {formatCompactCurrency(categoryValues.top.value)}
            </p>
            {categoryValues.top.commission > 0 && (
              <>
                <p className="text-xs text-muted-foreground">Prowizja</p>
                <p className="text-sm font-semibold text-amber-500">
                  {formatCompactCurrency(categoryValues.top.commission)}
                </p>
              </>
            )}
          </div>
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
          <div className="mt-2 space-y-1">
            <p className="text-xs text-muted-foreground">Wartość</p>
            <p className="text-sm font-semibold">
              {formatCompactCurrency(categoryValues.lead.value)}
            </p>
            {categoryValues.lead.commission > 0 && (
              <>
                <p className="text-xs text-muted-foreground">Prowizja</p>
                <p className="text-sm font-semibold text-blue-500">
                  {formatCompactCurrency(categoryValues.lead.commission)}
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* COLD Leads */}
      <Card className="border-l-4 border-l-slate-400">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Snowflake className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium text-muted-foreground">
                  Cold Leads
                </span>
              </div>
              <p className="text-2xl font-bold">{contactStats.cold_count}</p>
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <p className="text-xs text-muted-foreground">Wartość</p>
            <p className="text-sm font-semibold">
              {formatCompactCurrency(categoryValues.cold.value)}
            </p>
            {categoryValues.cold.commission > 0 && (
              <>
                <p className="text-xs text-muted-foreground">Prowizja</p>
                <p className="text-sm font-semibold text-slate-500">
                  {formatCompactCurrency(categoryValues.cold.commission)}
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Klienci */}
      <Card className="border-l-4 border-l-emerald-500">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium text-muted-foreground">
                  Klienci
                </span>
              </div>
              <p className="text-2xl font-bold">{clients.length}</p>
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <p className="text-xs text-muted-foreground">Wartość</p>
            <p className="text-sm font-semibold text-emerald-600">
              {formatCompactCurrency(clientTotalValue)}
            </p>
            {clientTotalCommission > 0 && (
              <>
                <p className="text-xs text-muted-foreground">Prowizja</p>
                <p className="text-sm font-semibold text-emerald-500">
                  {formatCompactCurrency(clientTotalCommission)}
                </p>
              </>
            )}
          </div>
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

      {/* Weighted pipeline value - full width */}
      {weightedValue > 0 && (
        <Card className="col-span-2 lg:col-span-6 border-l-4 border-l-indigo-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-muted-foreground">Pipeline ważony (wszystkie produkty × % szans)</p>
            </div>
            <p className="text-xl font-bold">{formatCompactCurrency(weightedValue)}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
