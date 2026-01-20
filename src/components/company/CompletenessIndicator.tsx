import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle2, AlertCircle } from 'lucide-react';

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

const TOTAL_SECTIONS = 16;

interface CompletenessIndicatorProps {
  missingSections: string[];
  compact?: boolean;
}

export function CompletenessIndicator({ missingSections, compact = false }: CompletenessIndicatorProps) {
  const completedSections = TOTAL_SECTIONS - missingSections.length;
  const percentage = Math.round((completedSections / TOTAL_SECTIONS) * 100);

  // Color based on completeness
  const getProgressColor = () => {
    if (percentage >= 80) return 'bg-gradient-to-r from-emerald-500 to-green-400';
    if (percentage >= 60) return 'bg-gradient-to-r from-amber-500 to-yellow-400';
    if (percentage >= 40) return 'bg-gradient-to-r from-orange-500 to-amber-400';
    return 'bg-gradient-to-r from-red-500 to-orange-400';
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 cursor-help">
              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${getProgressColor()} transition-all duration-500`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{percentage}%</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="font-medium mb-1">
              {completedSections} z {TOTAL_SECTIONS} sekcji
            </p>
            {missingSections.length > 0 && (
              <div className="text-xs text-muted-foreground">
                <p className="mb-1">Brakujące dane:</p>
                <ul className="list-disc pl-3 space-y-0.5">
                  {missingSections.slice(0, 6).map((section) => (
                    <li key={section}>{sectionLabels[section] || section}</li>
                  ))}
                  {missingSections.length > 6 && (
                    <li>+{missingSections.length - 6} więcej...</li>
                  )}
                </ul>
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {percentage >= 80 ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-amber-500" />
          )}
          <span className="text-sm font-medium">Kompletność danych</span>
        </div>
        <span className="text-sm font-semibold">{percentage}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${getProgressColor()} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {completedSections} z {TOTAL_SECTIONS} sekcji wypełnionych
      </p>
    </div>
  );
}
