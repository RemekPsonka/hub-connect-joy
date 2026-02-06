import { useNavigate } from 'react-router-dom';
import { Building2, ExternalLink, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ContactWithDetails } from '@/hooks/useContacts';

interface ContactCompanyCardProps {
  contact: ContactWithDetails;
}

export function ContactCompanyCard({ contact }: ContactCompanyCardProps) {
  const navigate = useNavigate();
  const company = contact.companies;

  if (!company && !contact.company) {
    return (
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Firma
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 pt-0">
          <p className="text-xs text-muted-foreground">Firma nie przypisana</p>
        </CardContent>
      </Card>
    );
  }

  if (!company) {
    return (
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Firma
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 pt-0">
          <p className="text-sm font-medium">{contact.company}</p>
        </CardContent>
      </Card>
    );
  }

  const companyData = company as Record<string, unknown>;

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Firma
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0 space-y-1.5">
        <p className="text-sm font-semibold">{company.name}</p>

        {(companyData.industry as string) && (
          <p className="text-xs text-muted-foreground">{companyData.industry as string}</p>
        )}

        {((companyData.nip as string) || (companyData.krs as string)) && (
          <p className="text-xs text-muted-foreground font-mono">
            {[
              (companyData.nip as string) && `NIP: ${companyData.nip}`,
              (companyData.krs as string) && `KRS: ${companyData.krs}`,
            ].filter(Boolean).join(' · ')}
          </p>
        )}

        {(company.address || company.city) && (
          <p className="text-xs text-muted-foreground">
            {[company.address, (companyData.postal_code as string), company.city].filter(Boolean).join(', ')}
          </p>
        )}

        {(companyData.website as string) && (
          <a
            href={String(companyData.website).startsWith('http') ? String(companyData.website) : `https://${companyData.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            <Globe className="h-3 w-3" />
            {String(companyData.website).replace(/^https?:\/\//, '')}
          </a>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full mt-2 text-xs h-7 gap-1"
          onClick={() => navigate(`/companies/${company.id}`)}
        >
          <ExternalLink className="h-3 w-3" />
          Pełna karta firmy
        </Button>
      </CardContent>
    </Card>
  );
}
