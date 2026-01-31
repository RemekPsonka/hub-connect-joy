import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarDays } from 'lucide-react';
import { OperationalDNAGrid } from './OperationalDNAGrid';
import { RiskDomainAccordion } from './RiskDomainAccordion';
import type {
  TypDzialnosci,
  RyzykoMajatkowe,
  RyzykoOC,
  RyzykoFlota,
  RyzykoSpecjalistyczne,
  RyzykoPracownicy,
  RyzykoFinansowe,
} from './types';
import type { QuickPolicyData } from './QuickAddPolicyButton';

interface RiskMatrixPanelProps {
  companyName: string;
  industry?: string | null;
  revenue?: number | null;
  meetingDate?: string;
  onMeetingDateChange?: (date: string) => void;
  operationalTypes: TypDzialnosci[];
  onOperationalTypesChange: (types: TypDzialnosci[]) => void;
  majatek: RyzykoMajatkowe;
  oc: RyzykoOC;
  flota: RyzykoFlota;
  specjalistyczne: RyzykoSpecjalistyczne;
  pracownicy: RyzykoPracownicy;
  finansowe: RyzykoFinansowe;
  onMajatekChange: (data: RyzykoMajatkowe) => void;
  onOcChange: (data: RyzykoOC) => void;
  onFlotaChange: (data: RyzykoFlota) => void;
  onSpecjalistyczneChange: (data: RyzykoSpecjalistyczne) => void;
  onPracownicyChange: (data: RyzykoPracownicy) => void;
  onFinansoweChange: (data: RyzykoFinansowe) => void;
  companyId?: string;
  onAddPolicy?: (data: QuickPolicyData) => void;
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
  meetingDate,
  onMeetingDateChange,
  operationalTypes,
  onOperationalTypesChange,
  majatek,
  oc,
  flota,
  specjalistyczne,
  pracownicy,
  finansowe,
  onMajatekChange,
  onOcChange,
  onFlotaChange,
  onSpecjalistyczneChange,
  onPracownicyChange,
  onFinansoweChange,
  companyId,
  onAddPolicy,
}: RiskMatrixPanelProps) {
  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">{companyName}</h2>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-wrap gap-2">
              {industry && (
                <Badge variant="secondary">{industry}</Badge>
              )}
              {revenue && revenue > 0 && (
                <Badge variant="outline">{formatRevenue(revenue)}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="meeting-date" className="text-sm text-muted-foreground whitespace-nowrap">
                Data spotkania:
              </Label>
              <Input
                id="meeting-date"
                type="date"
                value={meetingDate || ''}
                onChange={(e) => onMeetingDateChange?.(e.target.value)}
                className="w-40 h-8"
              />
            </div>
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
          finansowe={finansowe}
          onMajatekChange={onMajatekChange}
          onOcChange={onOcChange}
          onFlotaChange={onFlotaChange}
          onSpecjalistyczneChange={onSpecjalistyczneChange}
          onPracownicyChange={onPracownicyChange}
          onFinansoweChange={onFinansoweChange}
          companyId={companyId}
          onAddPolicy={onAddPolicy}
        />
      </div>
    </ScrollArea>
  );
}
