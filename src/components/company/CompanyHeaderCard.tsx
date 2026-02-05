import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Building, Globe, MapPin, Pencil, DollarSign, Calendar 
} from 'lucide-react';
import { getCompanyLogoUrl } from '@/hooks/useCompanies';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { CompanyModal } from '@/components/contacts/CompanyModal';

interface Company {
  id: string;
  name: string;
  short_name?: string | null;
  tagline?: string | null;
  industry?: string | null;
  company_size?: string | null;
  legal_form?: string | null;
  website?: string | null;
  logo_url?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  revenue_amount?: number | null;
  revenue_currency?: string | null;
  revenue_year?: number | null;
  company_analysis_date?: string | null;
}

interface CompanyHeaderCardProps {
  company: Company;
  ownerContactId?: string;
}

const sizeLabels: Record<string, string> = {
  'micro': 'Mikro (1-9)',
  'small': 'Mała (10-49)',
  'medium': 'Średnia (50-249)',
  'large': 'Duża (250+)',
};

export function CompanyHeaderCard({ company, ownerContactId }: CompanyHeaderCardProps) {
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);

  const formatRevenue = (amount: number | null, currency: string | null) => {
    if (!amount) return null;
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: currency || 'PLN',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            {/* Logo */}
            <Avatar className="h-16 w-16">
              {(company.logo_url || getCompanyLogoUrl(company.website)) ? (
                <AvatarImage 
                  src={company.logo_url || getCompanyLogoUrl(company.website) || ''} 
                  alt={company.name}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                <Building className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            
            {/* Company Info */}
            <div className="flex-1 space-y-2">
              <div>
                <h2 className="text-xl font-bold">{company.name}</h2>
                {company.short_name && company.short_name !== company.name && (
                  <p className="text-sm text-muted-foreground">({company.short_name})</p>
                )}
                {company.tagline && (
                  <p className="text-muted-foreground">{company.tagline}</p>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2">
                {company.industry && (
                  <Badge variant="secondary">{company.industry}</Badge>
                )}
                {company.company_size && (
                  <Badge variant="outline">{sizeLabels[company.company_size] || company.company_size}</Badge>
                )}
                {company.legal_form && (
                  <Badge variant="outline">{company.legal_form}</Badge>
                )}
              </div>

              {/* Quick Info Row */}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground pt-2">
                {company.website && (
                  <a 
                    href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <Globe className="h-4 w-4" />
                    {company.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </a>
                )}
                {(company.city || company.address) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {[company.address, company.postal_code, company.city].filter(Boolean).join(', ')}
                  </span>
                )}
                {company.revenue_amount && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    {formatRevenue(company.revenue_amount, company.revenue_currency ?? null)}
                    {company.revenue_year && ` (${company.revenue_year})`}
                  </span>
                )}
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex flex-col items-end gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsCompanyModalOpen(true)}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Edytuj
              </Button>
              {company.company_analysis_date && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Analiza: {format(new Date(company.company_analysis_date), 'd MMM yyyy', { locale: pl })}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <CompanyModal
        open={isCompanyModalOpen}
        onOpenChange={setIsCompanyModalOpen}
        company={company as any}
        ownerContactId={ownerContactId}
      />
    </>
  );
}
