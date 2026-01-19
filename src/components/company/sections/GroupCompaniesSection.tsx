import { SectionCard, SectionBox } from '../SectionCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, X, TrendingUp, DollarSign } from 'lucide-react';

interface GroupCompany {
  name: string;
  nip?: string;
  revenue_amount?: number;
  revenue_year?: number;
  role?: 'parent' | 'subsidiary' | 'affiliate';
  ownership_percent?: number;
}

interface ConsolidatedRevenue {
  amount: number;
  year: number;
  source?: string;
}

interface GroupCompaniesSectionProps {
  groupCompanies: GroupCompany[];
  consolidatedRevenue?: ConsolidatedRevenue;
  onRemoveCompany?: (name: string) => void;
}

function formatRevenue(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(2)} mld PLN`;
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)} mln PLN`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)} tys. PLN`;
  }
  return `${amount} PLN`;
}

function getRoleLabel(role?: string): string {
  switch (role) {
    case 'parent': return 'Spółka matka';
    case 'subsidiary': return 'Spółka zależna';
    case 'affiliate': return 'Spółka stowarzyszona';
    default: return 'Spółka z grupy';
  }
}

export function GroupCompaniesSection({ 
  groupCompanies, 
  consolidatedRevenue,
  onRemoveCompany 
}: GroupCompaniesSectionProps) {
  if (!groupCompanies?.length) return null;

  // Calculate total revenue from group companies
  const totalRevenue = groupCompanies.reduce((sum, c) => sum + (c.revenue_amount || 0), 0);
  const companiesWithRevenue = groupCompanies.filter(c => c.revenue_amount);

  return (
    <SectionCard
      icon={<Building2 className="h-4 w-4" />}
      title="Grupa kapitałowa"
    >
      <div className="space-y-4">
        {/* Consolidated revenue card */}
        {consolidatedRevenue?.amount && (
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 dark:from-blue-950/20 dark:to-indigo-950/20 dark:border-blue-800">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Przychody skonsolidowane ({consolidatedRevenue.year})
              </p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {formatRevenue(consolidatedRevenue.amount)}
              </p>
              {consolidatedRevenue.source && (
                <p className="text-xs text-muted-foreground mt-1">
                  Źródło: {consolidatedRevenue.source}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Group companies list */}
        <SectionBox title={`Spółki w grupie (${groupCompanies.length})`}>
          <div className="space-y-2">
            {groupCompanies.map((company, i) => (
              <div 
                key={i} 
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{company.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[10px]">
                      {getRoleLabel(company.role)}
                    </Badge>
                    {company.ownership_percent && (
                      <span className="text-[10px] text-muted-foreground">
                        {company.ownership_percent}% udziałów
                      </span>
                    )}
                    {company.nip && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        NIP: {company.nip}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  {company.revenue_amount && (
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                        {formatRevenue(company.revenue_amount)}
                      </p>
                      {company.revenue_year && (
                        <p className="text-[10px] text-muted-foreground">
                          {company.revenue_year}
                        </p>
                      )}
                    </div>
                  )}
                  {onRemoveCompany && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => onRemoveCompany(company.name)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SectionBox>

        {/* Revenue summary */}
        {companiesWithRevenue.length > 0 && totalRevenue > 0 && (
          <div className="flex items-center justify-between pt-2 border-t">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Suma przychodów {companiesWithRevenue.length} spółek:
            </p>
            <p className="text-sm font-bold">
              {formatRevenue(totalRevenue)}
            </p>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
