import { useState } from 'react';
import { SectionCard } from '../SectionCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { History, ChevronDown, GitMerge } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SectionProps } from '../types';

export function HistoryTimelineSection({ data }: SectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const timeline = data.timeline || [];
  const mergersAcquisitions = data.mergers_acquisitions || [];
  const majorTransformations = data.major_transformations || [];

  if (timeline.length === 0 && mergersAcquisitions.length === 0 && !data.founding_story && !data.expansion_history) {
    return null;
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <SectionCard
        icon={<History className="h-4 w-4" />}
        title="Historia i kamienie milowe"
        action={
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform duration-200",
                isExpanded && "rotate-180"
              )} />
            </Button>
          </CollapsibleTrigger>
        }
      >
        <CollapsibleContent className="space-y-4">
          {/* Timeline */}
          {timeline.length > 0 && (
            <div className="relative border-l-2 border-primary/20 pl-4 ml-2 space-y-4">
              {timeline.map((event, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-[22px] w-3 h-3 rounded-full bg-primary border-2 border-background" />
                  <div className="space-y-1">
                    <Badge variant="outline" className="text-xs font-mono">
                      {event.year}
                    </Badge>
                    <p className="text-sm font-medium">{event.event}</p>
                    {event.impact && (
                      <p className="text-xs text-muted-foreground">{event.impact}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Major transformations */}
          {majorTransformations.length > 0 && (
            <div className="pt-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">Główne transformacje</p>
              <ul className="space-y-1">
                {majorTransformations.map((transformation, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    {transformation}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Mergers & Acquisitions */}
          {mergersAcquisitions.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <GitMerge className="h-3 w-3" />
                Fuzje i przejęcia
              </p>
              <div className="space-y-2">
                {mergersAcquisitions.map((ma, i) => (
                  <div key={i} className="flex items-center gap-2 flex-wrap text-sm">
                    <Badge variant="secondary" className="text-xs">{ma.year}</Badge>
                    <span>{ma.details}</span>
                    {ma.value_pln && (
                      <Badge variant="outline" className="text-xs text-green-600">
                        {(ma.value_pln / 1_000_000).toFixed(1)}M PLN
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Founding story */}
          {data.founding_story && (
            <div className="pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-1">Historia firmy</p>
              <p className="text-sm text-muted-foreground">{data.founding_story}</p>
            </div>
          )}

          {/* Expansion history */}
          {data.expansion_history && (
            <div className="pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-1">Historia ekspansji</p>
              <p className="text-sm text-muted-foreground">{data.expansion_history}</p>
            </div>
          )}
        </CollapsibleContent>

        {/* Preview when collapsed */}
        {!isExpanded && timeline.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {timeline.length} wydarzeń w historii firmy
            {data.year_founded && ` (od ${data.year_founded})`}
          </p>
        )}
      </SectionCard>
    </Collapsible>
  );
}
