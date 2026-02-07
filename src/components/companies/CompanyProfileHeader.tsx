import { useState } from 'react';
import { 
  Building2, 
  Globe, 
  MapPin, 
  Users, 
  TrendingUp,
  Calendar,
  Edit,
  Sparkles,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { CompanyModal } from '@/components/contacts/CompanyModal';
import { useRegenerateCompanyAI, type Company } from '@/hooks/useCompanies';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface CompanyProfileHeaderProps {
  company: Company;
}

const sizeLabels: Record<string, string> = {
  micro: 'Mikro (1-9)',
  small: 'Mała (10-49)',
  medium: 'Średnia (50-249)',
  large: 'Duża (250+)',
};

export function CompanyProfileHeader({ company }: CompanyProfileHeaderProps) {
  const [editOpen, setEditOpen] = useState(false);
  const regenerateAI = useRegenerateCompanyAI();

  
  const handleRegenerateAI = async () => {
    await regenerateAI.mutateAsync({
      id: company.id,
      companyName: company.name,
      website: company.website,
      industryHint: company.industry,
    });
  };

  // Format revenue
  const formatRevenue = (amount: number | null, year: number | null, currency: string | null) => {
    if (!amount) return null;
    const formattedAmount = amount >= 1_000_000 
      ? `${(amount / 1_000_000).toFixed(1)}M` 
      : amount >= 1_000 
        ? `${(amount / 1_000).toFixed(0)}k` 
        : amount.toString();
    return `${formattedAmount} ${currency || 'PLN'}${year ? ` (${year})` : ''}`;
  };

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Logo */}
            <div className="flex-shrink-0">
              <CompanyLogo
                companyName={company.name}
                website={company.website}
                logoUrl={company.logo_url}
                size="lg"
                className="h-24 w-24 text-2xl border-2"
              />
            </div>

            {/* Info */}
            <div className="flex-1 space-y-3">
              <div>
                <h1 className="text-2xl font-bold">{company.name}</h1>
                {(company as Record<string, unknown>).tagline ? (
                  <p className="text-muted-foreground mt-1">
                    {String((company as Record<string, unknown>).tagline)}
                  </p>
                ) : null}
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {company.industry && (
                  <Badge variant="secondary">{company.industry}</Badge>
                )}
                {company.employee_count && sizeLabels[company.employee_count] && (
                  <Badge variant="outline">
                    <Users className="h-3 w-3 mr-1" />
                    {sizeLabels[company.employee_count]}
                  </Badge>
                )}
                {typeof (company as Record<string, unknown>).company_size === 'string' && 
                 sizeLabels[(company as Record<string, unknown>).company_size as string] ? (
                  <Badge variant="outline">
                    <Users className="h-3 w-3 mr-1" />
                    {sizeLabels[(company as Record<string, unknown>).company_size as string]}
                  </Badge>
                ) : null}
              </div>

              {/* Details */}
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {company.website && (
                  <a 
                    href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    <Globe className="h-4 w-4" />
                    Strona WWW
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                
                {company.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {company.city}
                  </span>
                )}

                {formatRevenue(
                  (company as Record<string, unknown>).revenue_amount as number | null,
                  (company as Record<string, unknown>).revenue_year as number | null,
                  (company as Record<string, unknown>).revenue_currency as string | null
                ) && (
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    {formatRevenue(
                      (company as Record<string, unknown>).revenue_amount as number | null,
                      (company as Record<string, unknown>).revenue_year as number | null,
                      (company as Record<string, unknown>).revenue_currency as string | null
                    )}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 items-end">
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edytuj
              </Button>

              <div className="flex flex-col items-end gap-1">
                <Button 
                  variant="default" 
                  onClick={handleRegenerateAI}
                  disabled={regenerateAI.isPending}
                >
                  {regenerateAI.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Analiza AI
                </Button>
                
                {company.company_analysis_date && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Ostatnia: {format(new Date(company.company_analysis_date), 'dd.MM.yyyy HH:mm', { locale: pl })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <CompanyModal
        open={editOpen}
        onOpenChange={setEditOpen}
        company={company}
      />
    </>
  );
}
