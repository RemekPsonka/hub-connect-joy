import { Clock, FileEdit, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PolicyFunnelCard } from './PolicyFunnelCard';
import type { PipelineStats, PolicyWithCompany } from '@/hooks/useAllPolicies';
import type { RenewalChecklist } from '@/components/renewal/types';

interface PolicyFunnelViewProps {
  stats: PipelineStats;
  onChecklistChange?: (policyId: string, checklist: RenewalChecklist) => void;
  onToggleOurPolicy?: (policyId: string, isOurs: boolean) => void;
}

interface FunnelStage {
  id: 'backlog' | 'preparation' | 'finalization' | 'expired';
  label: string;
  description: string;
  policies: PolicyWithCompany[];
  color: string;
  bgColor: string;
  icon: typeof Clock;
  urgent?: boolean;
}

export function PolicyFunnelView({
  stats,
  onChecklistChange,
  onToggleOurPolicy,
}: PolicyFunnelViewProps) {
  const stages: FunnelStage[] = [
    {
      id: 'backlog',
      label: 'Do zrobienia',
      description: 'Polisy aktywne (>120 dni)',
      policies: stats.backlog,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/30',
      icon: Clock,
    },
    {
      id: 'preparation',
      label: 'Przygotowanie',
      description: '30-120 dni do wygaśnięcia',
      policies: stats.preparation,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50/50 dark:bg-emerald-950/20',
      icon: FileEdit,
    },
    {
      id: 'finalization',
      label: 'Finalizacja',
      description: '<30 dni - pilne!',
      policies: stats.finalization,
      color: 'text-red-600',
      bgColor: 'bg-red-50/50 dark:bg-red-950/20',
      icon: AlertTriangle,
      urgent: true,
    },
    {
      id: 'expired',
      label: 'Wygasłe',
      description: 'Wymagają odnowienia',
      policies: stats.expired,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50/50 dark:bg-orange-950/20',
      icon: XCircle,
      urgent: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {stages.map((stage) => (
        <Card key={stage.id} className={`${stage.bgColor} border-0`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <stage.icon className={`h-4 w-4 ${stage.color}`} />
                <CardTitle className="text-sm font-medium">
                  {stage.label}
                </CardTitle>
              </div>
              <Badge
                variant={stage.urgent ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {stage.policies.length}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{stage.description}</p>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="h-[400px]">
              {stage.policies.length === 0 ? (
                <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
                  Brak polis
                </div>
              ) : (
                <div className="space-y-1">
                  {stage.policies.map((policy) => (
                    <PolicyFunnelCard
                      key={policy.id}
                      policy={policy}
                      showChecklist={stage.id === 'preparation' || stage.id === 'finalization'}
                      onChecklistChange={onChecklistChange}
                      onToggleOurPolicy={onToggleOurPolicy}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
