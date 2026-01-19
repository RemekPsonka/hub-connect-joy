import { SectionCard, SectionBox } from '../SectionCard';
import { Badge } from '@/components/ui/badge';
import { Heart, Leaf, Globe } from 'lucide-react';
import type { SectionProps, CSRActivity } from '../types';

export function CSRSection({ data }: SectionProps) {
  const csrActivities = data.csr_activities || [];
  const sustainabilityInitiatives = data.sustainability_initiatives || [];

  // Parse CSR activities
  const csrList: Array<CSRActivity | string> = csrActivities;

  const hasData = csrList.length > 0 || sustainabilityInitiatives.length > 0 || data.social_impact;

  if (!hasData) return null;

  return (
    <SectionCard
      icon={<Heart className="h-4 w-4" />}
      title="CSR i działalność społeczna"
    >
      <div className="space-y-4">
        {/* CSR Activities */}
        {csrList.length > 0 && (
          <SectionBox title="Działania CSR" icon={<Globe className="h-3 w-3" />}>
            <div className="space-y-2">
              {csrList.map((activity, i) => {
                if (typeof activity === 'string') {
                  return (
                    <div key={i} className="p-2 bg-muted/50 rounded-lg">
                      <p className="text-sm">{activity}</p>
                    </div>
                  );
                }
                return (
                  <div key={i} className="p-2.5 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium">{activity.area}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{activity.description}</p>
                    {activity.impact && (
                      <p className="text-xs text-green-600 mt-1">Wpływ: {activity.impact}</p>
                    )}
                    {activity.year && (
                      <Badge variant="outline" className="text-[10px] mt-1">{activity.year}</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </SectionBox>
        )}

        {/* Sustainability initiatives */}
        {sustainabilityInitiatives.length > 0 && (
          <SectionBox title="Inicjatywy zrównoważonego rozwoju" icon={<Leaf className="h-3 w-3" />}>
            <div className="flex flex-wrap gap-1.5">
              {sustainabilityInitiatives.map((initiative, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  🌱 {initiative}
                </Badge>
              ))}
            </div>
          </SectionBox>
        )}

        {/* Social impact */}
        {data.social_impact && (
          <SectionBox title="Wpływ społeczny">
            <p className="text-sm text-muted-foreground">{data.social_impact}</p>
          </SectionBox>
        )}
      </div>
    </SectionCard>
  );
}
