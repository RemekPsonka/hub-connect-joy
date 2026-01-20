import { SectionCard, SectionBox } from '../SectionCard';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  GitBranch, 
  Building2, 
  ArrowUp, 
  ArrowDown,
  X,
  TrendingUp,
  DollarSign,
  Link2
} from 'lucide-react';
import type { CompanyAnalysis, GroupCompany, ConsolidatedRevenue } from '../types';

interface AffiliationsSectionProps {
  data: CompanyAnalysis;
  groupCompanies?: GroupCompany[];
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

function getRoleIcon(role?: string) {
  switch (role) {
    case 'parent': return <ArrowUp className="h-4 w-4 text-blue-500" />;
    case 'subsidiary': return <ArrowDown className="h-4 w-4 text-green-500" />;
    default: return <Link2 className="h-4 w-4 text-muted-foreground" />;
  }
}

function getRoleLabel(role?: string): string {
  switch (role) {
    case 'parent': return 'Spółka matka';
    case 'subsidiary': return 'Spółka zależna';
    case 'affiliate': return 'Spółka stowarzyszona';
    default: return 'Spółka powiązana';
  }
}

function getRoleBadgeVariant(role?: string): 'default' | 'secondary' | 'outline' {
  switch (role) {
    case 'parent': return 'default';
    case 'subsidiary': return 'secondary';
    default: return 'outline';
  }
}

export function AffiliationsSection({ 
  data, 
  groupCompanies = [],
  consolidatedRevenue,
  onRemoveCompany 
}: AffiliationsSectionProps) {
  // Use passed groupCompanies or extract from data
  const companies = groupCompanies.length > 0 
    ? groupCompanies 
    : (data.group_companies as GroupCompany[] || []);

  const consRevenue = consolidatedRevenue || data.consolidated_revenue as ConsolidatedRevenue | undefined;

  // Check if company is part of a group
  const isPartOfGroup = data.is_group || companies.length > 0 || data.parent_company_id;

  if (!isPartOfGroup && companies.length === 0) {
    return null;
  }

  // Separate companies by role
  const parentCompanies = companies.filter(c => c.role === 'parent');
  const subsidiaries = companies.filter(c => c.role === 'subsidiary');
  const affiliates = companies.filter(c => c.role === 'affiliate' || !c.role);

  // Calculate totals
  const totalRevenue = companies.reduce((sum, c) => sum + (c.revenue_amount || 0), 0);
  const companiesWithRevenue = companies.filter(c => c.revenue_amount);

  return (
    <SectionCard
      icon={<GitBranch className="h-4 w-4" />}
      title="Powiązania kapitałowe"
    >
      <div className="space-y-6">
        {/* Consolidated revenue card */}
        {consRevenue?.amount && (
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 dark:from-blue-950/20 dark:to-indigo-950/20 dark:border-blue-800">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Przychody skonsolidowane ({consRevenue.year})
                  </p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                    {formatRevenue(consRevenue.amount)}
                  </p>
                </div>
                {consRevenue.source && (
                  <Badge variant="outline" className="text-xs">
                    {consRevenue.source}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Visual Group Structure */}
        <div className="relative">
          {/* Parent Companies */}
          {parentCompanies.length > 0 && (
            <SectionBox title="Spółki nadrzędne" icon={<ArrowUp className="h-3 w-3 text-blue-500" />}>
              <div className="space-y-2">
                {parentCompanies.map((company, i) => (
                  <CompanyCard 
                    key={i} 
                    company={company} 
                    onRemove={onRemoveCompany}
                  />
                ))}
              </div>
            </SectionBox>
          )}

          {/* Current company indicator */}
          <div className="my-4 flex items-center justify-center">
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg border-2 border-primary/30">
              <Building2 className="h-5 w-5 text-primary" />
              <span className="font-medium text-sm">{data.name || data.short_name || 'Ta firma'}</span>
            </div>
          </div>

          {/* Subsidiaries */}
          {subsidiaries.length > 0 && (
            <SectionBox title="Spółki zależne" icon={<ArrowDown className="h-3 w-3 text-green-500" />}>
              <div className="space-y-2">
                {subsidiaries.map((company, i) => (
                  <CompanyCard 
                    key={i} 
                    company={company} 
                    onRemove={onRemoveCompany}
                  />
                ))}
              </div>
            </SectionBox>
          )}

          {/* Affiliates */}
          {affiliates.length > 0 && (
            <SectionBox title="Spółki powiązane" icon={<Link2 className="h-3 w-3" />}>
              <div className="space-y-2">
                {affiliates.map((company, i) => (
                  <CompanyCard 
                    key={i} 
                    company={company} 
                    onRemove={onRemoveCompany}
                  />
                ))}
              </div>
            </SectionBox>
          )}
        </div>

        {/* Revenue summary */}
        {companiesWithRevenue.length > 0 && totalRevenue > 0 && (
          <div className="flex items-center justify-between pt-4 border-t">
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

// Extracted company card component
function CompanyCard({ 
  company, 
  onRemove 
}: { 
  company: GroupCompany; 
  onRemove?: (name: string) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="h-9 w-9 rounded-lg bg-background flex items-center justify-center shrink-0 border">
          {getRoleIcon(company.role)}
        </div>
        
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{company.name}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <Badge variant={getRoleBadgeVariant(company.role)} className="text-[10px]">
              {getRoleLabel(company.role)}
            </Badge>
            {company.ownership_percent !== undefined && (
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
        {onRemove && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(company.name)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
