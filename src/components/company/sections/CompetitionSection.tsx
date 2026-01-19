import { SectionCard, SectionBox } from '../SectionCard';
import { Badge } from '@/components/ui/badge';
import { Swords, AlertTriangle, Target } from 'lucide-react';
import type { SectionProps } from '../types';

export function CompetitionSection({ data }: SectionProps) {
  const mainCompetitors = data.main_competitors || [];
  const marketChallenges = data.market_challenges || [];

  const hasData = mainCompetitors.length > 0 || data.competitive_differentiation || 
    marketChallenges.length > 0;

  if (!hasData) return null;

  return (
    <SectionCard
      icon={<Swords className="h-4 w-4" />}
      title="Konkurencja i pozycja rynkowa"
    >
      <div className="space-y-4">
        {/* Main competitors */}
        {mainCompetitors.length > 0 && (
          <SectionBox title="Główni konkurenci" icon={<Target className="h-3 w-3" />}>
            <div className="space-y-2">
              {mainCompetitors.map((competitor, i) => {
                if (typeof competitor === 'string') {
                  return (
                    <Badge key={i} variant="secondary" className="text-xs mr-1.5 mb-1.5">
                      {competitor}
                    </Badge>
                  );
                }
                return (
                  <div key={i} className="p-2.5 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium">{competitor.name}</p>
                    {competitor.strength && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <span className="text-green-600">Siła:</span> {competitor.strength}
                      </p>
                    )}
                    {competitor.weakness && (
                      <p className="text-xs text-muted-foreground">
                        <span className="text-orange-600">Słabość:</span> {competitor.weakness}
                      </p>
                    )}
                    {competitor.market_share && (
                      <Badge variant="outline" className="text-[10px] mt-1">
                        Udział: {competitor.market_share}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </SectionBox>
        )}

        {/* Competitive differentiation */}
        {data.competitive_differentiation && (
          <SectionBox title="Wyróżniki konkurencyjne">
            <p className="text-sm text-muted-foreground">{data.competitive_differentiation}</p>
          </SectionBox>
        )}

        {/* Market challenges */}
        {marketChallenges.length > 0 && (
          <SectionBox title="Wyzwania rynkowe" icon={<AlertTriangle className="h-3 w-3" />}>
            <ul className="space-y-1">
              {marketChallenges.map((challenge, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-orange-500">!</span>
                  {challenge}
                </li>
              ))}
            </ul>
          </SectionBox>
        )}
      </div>
    </SectionCard>
  );
}
