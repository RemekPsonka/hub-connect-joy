import { BarChart3, Users, TrendingUp, Calendar, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCompanyContacts } from '@/hooks/useCompanies';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface CompanyQuickStatsProps {
  company: {
    id: string;
    industry?: string | null;
    analysis_confidence_score?: number | null;
    company_analysis_status?: string | null;
    company_analysis_date?: string | null;
    revenue_amount?: number | null;
    revenue_year?: number | null;
    revenue_currency?: string | null;
  };
}

function formatRevenue(amount: number | null | undefined, currency?: string | null): string {
  if (!amount) return '-';
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(2)} mld ${currency || 'PLN'}`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} mln ${currency || 'PLN'}`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)} tys. ${currency || 'PLN'}`;
  return `${amount} ${currency || 'PLN'}`;
}

function getConfidenceBadge(score: number | null | undefined) {
  if (!score) return <Badge variant="outline" className="text-xs">Brak</Badge>;
  if (score >= 80) return <Badge className="bg-emerald-500 text-xs">⭐ {score}%</Badge>;
  if (score >= 50) return <Badge className="bg-amber-500 text-xs">{score}%</Badge>;
  return <Badge variant="secondary" className="text-xs">{score}%</Badge>;
}

function getAnalysisStatusBadge(status: string | null | undefined) {
  switch (status) {
    case 'completed':
      return (
        <span className="flex items-center gap-1 text-emerald-600">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span className="text-xs">Pełna analiza</span>
        </span>
      );
    case 'processing':
    case 'in_progress':
      return (
        <span className="flex items-center gap-1 text-primary">
          <Clock className="h-3.5 w-3.5" />
          <span className="text-xs">W toku...</span>
        </span>
      );
    case 'failed':
      return (
        <span className="flex items-center gap-1 text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          <span className="text-xs">Błąd</span>
        </span>
      );
    default:
      return (
        <span className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span className="text-xs">Brak analizy</span>
        </span>
      );
  }
}

export function CompanyQuickStats({ company }: CompanyQuickStatsProps) {
  const { data: contacts } = useCompanyContacts(company.id);
  const contactCount = contacts?.length || 0;

  const stats = [
    {
      label: 'Pewność danych',
      value: getConfidenceBadge(company.analysis_confidence_score),
    },
    {
      label: 'Status analizy',
      value: getAnalysisStatusBadge(company.company_analysis_status),
    },
    {
      label: 'Kontakty',
      value: <span className="text-sm font-medium">{contactCount}</span>,
    },
    {
      label: 'Przychód',
      value: (
        <span className="text-sm font-medium">
          {formatRevenue(company.revenue_amount, company.revenue_currency)}
          {company.revenue_year ? <span className="text-xs text-muted-foreground ml-1">({company.revenue_year})</span> : null}
        </span>
      ),
    },
  ];

  if (company.industry) {
    stats.push({
      label: 'Branża',
      value: <span className="text-sm">{company.industry}</span>,
    });
  }

  if (company.company_analysis_date) {
    stats.push({
      label: 'Ostatnia analiza',
      value: (
        <span className="text-xs text-muted-foreground">
          {format(new Date(company.company_analysis_date), 'd MMM yyyy', { locale: pl })}
        </span>
      ),
    });
  }

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Statystyki
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <div className="space-y-2.5">
          {stats.map(({ label, value }, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{label}</span>
              {value}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
