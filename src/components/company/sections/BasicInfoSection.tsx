import { SectionCard, SectionBox } from '../SectionCard';
import { Badge } from '@/components/ui/badge';
import { Building, Calendar, Tag } from 'lucide-react';
import type { SectionProps } from '../types';

// Helper to safely render values that might be objects from KRS API
const safeString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value[0]?.nazwa) return value[0].nazwa;
  if (value && typeof value === 'object' && 'nazwa' in value) return (value as any).nazwa;
  if (value === null || value === undefined) return '';
  return String(value);
};

export function BasicInfoSection({ data }: SectionProps) {
  const subIndustries = typeof data.sub_industries === 'string' 
    ? [data.sub_industries] 
    : data.sub_industries || [];

  const yearFounded = data.year_founded || data.founding_year;

  return (
    <SectionCard
      icon={<Building className="h-4 w-4" />}
      title="Podstawowe informacje"
    >
      <div className="space-y-4">
        {/* Key facts grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data.name && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Pełna nazwa</p>
              <p className="text-sm font-medium">{safeString(data.name)}</p>
            </div>
          )}
          {data.legal_form && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Forma prawna</p>
              <p className="text-sm">{data.legal_form}</p>
            </div>
          )}
          {data.industry && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Branża</p>
              <p className="text-sm">{data.industry}</p>
            </div>
          )}
          {yearFounded && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Rok założenia</p>
              <p className="text-sm flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {yearFounded}
              </p>
            </div>
          )}
        </div>

        {/* Tagline */}
        {data.tagline && (
          <div className="p-3 bg-primary/5 rounded-lg border border-primary/10 italic text-sm">
            "{data.tagline}"
          </div>
        )}

        {/* Description */}
        {data.description && (
          <SectionBox title="Opis działalności">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {data.description}
            </p>
          </SectionBox>
        )}

        {/* Legacy fallback */}
        {data.what_company_does && !data.description && (
          <SectionBox title="Co firma robi">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {data.what_company_does}
            </p>
          </SectionBox>
        )}

        {/* Sub-industries */}
        {subIndustries.length > 0 && (
          <SectionBox title="Specjalizacje" icon={<Tag className="h-3 w-3" />}>
            <div className="flex flex-wrap gap-1.5">
              {subIndustries.map((sub, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {sub}
                </Badge>
              ))}
            </div>
          </SectionBox>
        )}

        {/* Founder info */}
        {data.founder_info && (
          <SectionBox title="Założyciel">
            <p className="text-sm text-muted-foreground">{data.founder_info}</p>
          </SectionBox>
        )}
      </div>
    </SectionCard>
  );
}
