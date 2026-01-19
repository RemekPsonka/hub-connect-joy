import { SectionCard, SectionBox } from '../SectionCard';
import { Badge } from '@/components/ui/badge';
import { Handshake, UserCheck, Sparkles } from 'lucide-react';
import type { SectionProps, CollaborationOpportunity } from '../types';

export function CollaborationSection({ data }: SectionProps) {
  const collaborationOpportunities = data.collaboration_opportunities || [];
  const synergyPotential = typeof data.synergy_potential === 'string'
    ? [data.synergy_potential]
    : data.synergy_potential || [];

  const hasData = collaborationOpportunities.length > 0 || 
    data.ideal_partner_profile || synergyPotential.length > 0 || 
    data.collaboration_areas;

  if (!hasData) return null;

  // Parse collaboration opportunities
  const opportunities: CollaborationOpportunity[] = typeof collaborationOpportunities === 'string'
    ? [{ area: 'Ogólne', description: collaborationOpportunities }]
    : collaborationOpportunities as CollaborationOpportunity[];

  return (
    <SectionCard
      icon={<Handshake className="h-4 w-4" />}
      title="Potencjał współpracy"
    >
      <div className="space-y-4">
        {/* Collaboration opportunities */}
        {opportunities.length > 0 && typeof opportunities[0] === 'object' && (
          <SectionBox title="Możliwości współpracy" icon={<Sparkles className="h-3 w-3" />}>
            <div className="space-y-2">
              {opportunities.map((opp, i) => (
                <div key={i} className="p-2.5 bg-muted/50 rounded-lg">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{opp.area}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{opp.description}</p>
                    </div>
                    {opp.priority && (
                      <Badge 
                        variant={opp.priority === 'high' ? 'default' : 'outline'} 
                        className="text-[10px] shrink-0"
                      >
                        {opp.priority === 'high' ? '🔥' : opp.priority === 'medium' ? '⭐' : '💡'}
                      </Badge>
                    )}
                  </div>
                  {opp.fit_for && (
                    <p className="text-xs text-primary mt-1.5">
                      Pasuje dla: {opp.fit_for}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </SectionBox>
        )}

        {/* Legacy: collaboration areas */}
        {data.collaboration_areas && opportunities.length === 0 && (
          <SectionBox title="Obszary współpracy">
            <p className="text-sm text-muted-foreground">{data.collaboration_areas}</p>
          </SectionBox>
        )}

        {/* Ideal partner profile */}
        {data.ideal_partner_profile && (
          <SectionBox title="Idealny partner" icon={<UserCheck className="h-3 w-3" />}>
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
              <p className="text-sm">{data.ideal_partner_profile}</p>
            </div>
          </SectionBox>
        )}

        {/* Synergy potential */}
        {synergyPotential.length > 0 && (
          <SectionBox title="Potencjał synergii">
            <div className="flex flex-wrap gap-1.5">
              {synergyPotential.map((syn, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  ⚡ {syn}
                </Badge>
              ))}
            </div>
          </SectionBox>
        )}
      </div>
    </SectionCard>
  );
}
