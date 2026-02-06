import { Building2, Globe, MapPin, ExternalLink, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CompanyRegistryCardProps {
  company: {
    nip?: string | null;
    krs?: string | null;
    regon?: string | null;
    legal_form?: string | null;
    address?: string | null;
    city?: string | null;
    postal_code?: string | null;
    website?: string | null;
  };
}

export function CompanyRegistryCard({ company }: CompanyRegistryCardProps) {
  const hasRegistry = company.nip || company.krs || company.regon;
  const hasAddress = company.address || company.city;
  const hasAny = hasRegistry || hasAddress || company.legal_form || company.website;

  if (!hasAny) return null;

  const registryItems = [
    { label: 'NIP', value: company.nip },
    { label: 'KRS', value: company.krs },
    { label: 'REGON', value: company.regon },
    { label: 'Forma', value: company.legal_form },
  ].filter(item => item.value);

  const addressParts = [company.address, company.postal_code, company.city].filter(Boolean);

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Dane rejestrowe
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0 space-y-2">
        {registryItems.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-mono text-xs">{value}</span>
          </div>
        ))}

        {addressParts.length > 0 && (
          <div className="flex items-start gap-2 text-sm pt-1 border-t">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-muted-foreground">{addressParts.join(', ')}</span>
          </div>
        )}

        {company.website && (
          <div className="pt-1 border-t">
            <a
              href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <Globe className="h-3.5 w-3.5" />
              <span className="truncate">{company.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
