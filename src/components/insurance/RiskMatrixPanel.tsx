import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OperationalDNAGrid } from './OperationalDNAGrid';
import { RiskDomainAccordion } from './RiskDomainAccordion';
import type {
  TypDzialnosci,
  RyzykoMajatkowe,
  RyzykoOC,
  RyzykoFlota,
  RyzykoSpecjalistyczne,
  RyzykoPracownicy,
} from './types';

interface RiskMatrixPanelProps {
  companyName: string;
  industry?: string | null;
  revenue?: number | null;
  operationalTypes: TypDzialnosci[];
  onOperationalTypesChange: (types: TypDzialnosci[]) => void;
  majatek: RyzykoMajatkowe;
  oc: RyzykoOC;
  flota: RyzykoFlota;
  specjalistyczne: RyzykoSpecjalistyczne;
  pracownicy: RyzykoPracownicy;
  onMajatekChange: (data: RyzykoMajatkowe) => void;
  onOcChange: (data: RyzykoOC) => void;
  onFlotaChange: (data: RyzykoFlota) => void;
  onSpecjalistyczneChange: (data: RyzykoSpecjalistyczne) => void;
  onPracownicyChange: (data: RyzykoPracownicy) => void;
}

function formatRevenue(amount: number): string {
  if (amount >= 1000000000) {
    return `${(amount / 1000000000).toFixed(1)} mld PLN`;
  }
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)} mln PLN`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)} tys. PLN`;
  }
  return `${amount} PLN`;
}

export function RiskMatrixPanel({
  companyName,
  industry,
  revenue,
  operationalTypes,
  onOperationalTypesChange,
  majatek,
  oc,
  flota,
  specjalistyczne,
  pracownicy,
  onMajatekChange,
  onOcChange,
  onFlotaChange,
  onSpecjalistyczneChange,
  onPracownicyChange,
}: RiskMatrixPanelProps) {
  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">{companyName}</h2>
          <div className="flex flex-wrap gap-2">
            {industry && (
              <Badge variant="secondary">{industry}</Badge>
            )}
            {revenue && revenue > 0 && (
              <Badge variant="outline">{formatRevenue(revenue)}</Badge>
            )}
          </div>
        </div>

        {/* DNA Operacyjne */}
        <OperationalDNAGrid
          selected={operationalTypes}
          onChange={onOperationalTypesChange}
        />

        {/* Domeny Ryzyka */}
        <RiskDomainAccordion
          operationalTypes={operationalTypes}
          majatek={majatek}
          oc={oc}
          flota={flota}
          specjalistyczne={specjalistyczne}
          pracownicy={pracownicy}
          onMajatekChange={onMajatekChange}
          onOcChange={onOcChange}
          onFlotaChange={onFlotaChange}
          onSpecjalistyczneChange={onSpecjalistyczneChange}
          onPracownicyChange={onPracownicyChange}
        />
      </div>
    </ScrollArea>
  );
}
