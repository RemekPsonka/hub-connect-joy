import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

const sectionLabels: Record<string, string> = {
  name: 'Nazwa firmy',
  industry: 'Branża',
  description: 'Opis działalności',
  timeline: 'Historia',
  revenue: 'Przychody',
  business_model: 'Model biznesowy',
  products: 'Produkty',
  services: 'Usługi',
  locations: 'Lokalizacje',
  reference_projects: 'Projekty referencyjne',
  key_clients: 'Klienci',
  main_competitors: 'Konkurencja',
  management: 'Zarząd',
  recent_news: 'Aktualności',
  nip: 'NIP',
  krs: 'KRS',
  regon: 'REGON',
  employee_count: 'Zatrudnienie',
  year_founded: 'Rok założenia',
  seeking_clients: 'Szukani klienci',
  seeking_partners: 'Szukani partnerzy',
  collaboration_opportunities: 'Możliwości współpracy',
  csr_activities: 'CSR',
};

interface MissingSectionsWarningProps {
  sections: string[];
  maxVisible?: number;
}

export function MissingSectionsWarning({ sections, maxVisible = 6 }: MissingSectionsWarningProps) {
  if (!sections || sections.length === 0) return null;

  const visibleSections = sections.slice(0, maxVisible);
  const hiddenCount = sections.length - maxVisible;

  return (
    <Alert variant="default" className="border-yellow-200 bg-yellow-50/50">
      <AlertTriangle className="h-4 w-4 text-yellow-600" />
      <AlertTitle className="text-yellow-800">Niepełne dane</AlertTitle>
      <AlertDescription className="mt-2">
        <div className="flex flex-wrap gap-1.5">
          {visibleSections.map((section) => (
            <Badge 
              key={section} 
              variant="outline" 
              className="text-xs bg-yellow-100/50 text-yellow-700 border-yellow-300"
            >
              {sectionLabels[section] || section}
            </Badge>
          ))}
          {hiddenCount > 0 && (
            <Badge 
              variant="outline" 
              className="text-xs bg-yellow-100/50 text-yellow-700 border-yellow-300"
            >
              +{hiddenCount} więcej
            </Badge>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
