import { SectionCard, SectionBox } from '../SectionCard';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Target, Lightbulb, Zap } from 'lucide-react';
import type { SectionProps } from '../types';
import { safeString, safeArray } from '@/lib/utils';

export function BusinessModelSection({ data }: SectionProps) {
  const competitiveAdvantages = Array.isArray(data.competitive_advantages) 
    ? data.competitive_advantages 
    : [];
  const revenueStreams = data.revenue_streams || [];
  const coreActivities = typeof data.core_activities === 'string'
    ? [data.core_activities]
    : data.core_activities || [];

  const hasData = data.business_model || data.value_proposition || 
    data.competitive_position || competitiveAdvantages.length > 0;

  if (!hasData) return null;

  return (
    <SectionCard
      icon={<Briefcase className="h-4 w-4" />}
      title="Model biznesowy"
    >
      <div className="space-y-4">
        {/* Business model description */}
        {data.business_model && (
          <SectionBox title="Model działania">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {safeString(data.business_model)}
            </p>
          </SectionBox>
        )}

        {/* Value proposition */}
        {data.value_proposition && (
          <SectionBox title="Propozycja wartości (USP)" icon={<Lightbulb className="h-3 w-3" />}>
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
              <p className="text-sm">{safeString(data.value_proposition)}</p>
            </div>
          </SectionBox>
        )}

        {/* Competitive position */}
        {data.competitive_position && (
          <SectionBox title="Pozycja konkurencyjna" icon={<Target className="h-3 w-3" />}>
            <p className="text-sm text-muted-foreground">{safeString(data.competitive_position)}</p>
          </SectionBox>
        )}

        {/* Competitive advantages */}
        {competitiveAdvantages.length > 0 && (
          <SectionBox title="Przewagi konkurencyjne" icon={<Zap className="h-3 w-3" />}>
            <ul className="space-y-1.5">
              {competitiveAdvantages.map((adv, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-primary font-bold">✓</span>
                  {adv}
                </li>
              ))}
            </ul>
          </SectionBox>
        )}

        {/* Legacy fallback */}
        {data.competitive_advantage && competitiveAdvantages.length === 0 && (
          <SectionBox title="Przewaga konkurencyjna">
            <p className="text-sm text-muted-foreground">{data.competitive_advantage}</p>
          </SectionBox>
        )}

        {/* Core activities */}
        {coreActivities.length > 0 && (
          <SectionBox title="Główne obszary działalności">
            <div className="flex flex-wrap gap-1.5">
              {coreActivities.map((activity, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {activity}
                </Badge>
              ))}
            </div>
          </SectionBox>
        )}

        {/* Revenue streams */}
        {revenueStreams.length > 0 && (
          <SectionBox title="Źródła przychodów">
            <div className="flex flex-wrap gap-1.5">
              {revenueStreams.map((stream, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {stream}
                </Badge>
              ))}
            </div>
          </SectionBox>
        )}
      </div>
    </SectionCard>
  );
}
