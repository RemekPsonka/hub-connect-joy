import { SectionCard, SectionBox } from '../SectionCard';
import { Badge } from '@/components/ui/badge';
import { Search, Target, Handshake, Users, TrendingUp, AlertCircle } from 'lucide-react';
import type { SectionProps } from '../types';

export function SeekingSection({ data }: SectionProps) {
  const hiringPositions = typeof data.hiring_positions === 'string'
    ? [data.hiring_positions]
    : data.hiring_positions || [];
  const painPoints = typeof data.pain_points === 'string'
    ? [data.pain_points]
    : data.pain_points || [];

  const hasData = data.seeking_clients || data.seeking_partners || 
    data.seeking_suppliers || hiringPositions.length > 0 || 
    data.expansion_plans || painPoints.length > 0 || data.what_company_seeks;

  if (!hasData) return null;

  return (
    <SectionCard
      icon={<Search className="h-4 w-4" />}
      title="Czego firma szuka"
    >
      <div className="space-y-4">
        {/* Info banner */}
        <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
          <p className="text-xs font-medium text-primary flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5" />
            Kluczowe informacje do matchowania kontaktów
          </p>
        </div>

        {/* Seeking clients */}
        {data.seeking_clients && (
          <SectionBox title="Szukani klienci" icon={<Users className="h-3 w-3" />}>
            <p className="text-sm text-muted-foreground">{data.seeking_clients}</p>
          </SectionBox>
        )}

        {/* Seeking partners */}
        {data.seeking_partners && (
          <SectionBox title="Szukani partnerzy" icon={<Handshake className="h-3 w-3" />}>
            <p className="text-sm text-muted-foreground">{data.seeking_partners}</p>
          </SectionBox>
        )}

        {/* Seeking suppliers */}
        {data.seeking_suppliers && (
          <SectionBox title="Szukani dostawcy">
            <p className="text-sm text-muted-foreground">{data.seeking_suppliers}</p>
          </SectionBox>
        )}

        {/* Hiring positions */}
        {hiringPositions.length > 0 && (
          <SectionBox title="Otwarte rekrutacje">
            <div className="flex flex-wrap gap-1.5">
              {hiringPositions.map((position, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  👤 {position}
                </Badge>
              ))}
            </div>
          </SectionBox>
        )}

        {/* Expansion plans */}
        {data.expansion_plans && (
          <SectionBox title="Plany rozwoju" icon={<TrendingUp className="h-3 w-3" />}>
            <p className="text-sm text-muted-foreground">{data.expansion_plans}</p>
          </SectionBox>
        )}

        {/* Pain points */}
        {painPoints.length > 0 && (
          <SectionBox title="Wyzwania i problemy" icon={<AlertCircle className="h-3 w-3" />}>
            <ul className="space-y-1">
              {painPoints.map((pain, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-orange-500">!</span>
                  {pain}
                </li>
              ))}
            </ul>
          </SectionBox>
        )}

        {/* Legacy fallback */}
        {data.what_company_seeks && !data.seeking_clients && !data.seeking_partners && (
          <SectionBox title="Czego firma szuka">
            <p className="text-sm text-muted-foreground">{data.what_company_seeks}</p>
          </SectionBox>
        )}
      </div>
    </SectionCard>
  );
}
