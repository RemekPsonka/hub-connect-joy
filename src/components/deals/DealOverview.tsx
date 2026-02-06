import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  Building2,
  User,
  Calendar,
  DollarSign,
  Percent,
  TrendingUp,
  Users2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Deal } from '@/hooks/useDeals';
import { DealTeam } from '@/hooks/useDealTeams';

interface DealOverviewProps {
  deal: Deal;
  teamDetails?: DealTeam | null;
}

export function DealOverview({ deal, teamDetails }: DealOverviewProps) {
  const expectedRevenue = deal.value * (deal.probability / 100);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wartość</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {deal.value.toLocaleString('pl-PL', {
                style: 'currency',
                currency: deal.currency,
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prawdopodobieństwo</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deal.probability}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Oczekiwany przychód</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {expectedRevenue.toLocaleString('pl-PL', {
                style: 'currency',
                currency: deal.currency,
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Szczegóły</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {deal.contact && (
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Kontakt</p>
                <Link
                  to={`/contacts/${deal.contact.id}`}
                  className="text-primary hover:underline font-medium"
                >
                  {deal.contact.full_name}
                </Link>
              </div>
            </div>
          )}

          {deal.company && (
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Firma</p>
                <Link
                  to={`/companies/${deal.company.id}`}
                  className="text-primary hover:underline font-medium"
                >
                  {deal.company.name}
                </Link>
              </div>
            </div>
          )}

          {deal.expected_close_date && (
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Oczekiwana data zamknięcia</p>
                <p className="font-medium">
                  {format(new Date(deal.expected_close_date), 'd MMMM yyyy', {
                    locale: pl,
                  })}
                </p>
              </div>
            </div>
          )}

          {deal.source && (
            <div>
              <p className="text-sm text-muted-foreground">Źródło</p>
              <Badge variant="outline" className="mt-1">
                {deal.source}
              </Badge>
            </div>
          )}

          {deal.owner && (
            <div>
              <p className="text-sm text-muted-foreground">Właściciel</p>
              <p className="font-medium">{deal.owner.full_name}</p>
            </div>
          )}

          {teamDetails && (
            <div className="flex items-start gap-3">
              <Users2 className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm text-muted-foreground">Zespół</p>
                <Badge
                  variant="outline"
                  style={{ borderColor: teamDetails.color, color: teamDetails.color }}
                >
                  {teamDetails.name}
                </Badge>
                {teamDetails.members && teamDetails.members.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {teamDetails.members.map((m) => (
                      <span key={m.id} className="text-sm text-muted-foreground">
                        {m.director?.full_name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {deal.description && (
            <div>
              <p className="text-sm text-muted-foreground">Opis</p>
              <p className="text-sm mt-1">{deal.description}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
