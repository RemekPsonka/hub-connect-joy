import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  Loader2,
  Circle,
  XCircle,
  Database,
  Globe,
  Search,
  DollarSign,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type StageState = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface FullAnalysisStage {
  id: string;
  label: string;
  state: StageState;
  error?: string;
}

interface FullAnalysisProgressProps {
  stages: FullAnalysisStage[];
  currentStage: number;
  isRunning: boolean;
  onCancel?: () => void;
}

const stageIcons: Record<string, React.ElementType> = {
  source: Database,
  www: Globe,
  external: Search,
  financials: DollarSign,
  synthesis: Sparkles,
};

function StageIcon({ state }: { state: StageState }) {
  if (state === 'running') {
    return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  }
  if (state === 'completed') {
    return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  }
  if (state === 'failed') {
    return <XCircle className="h-4 w-4 text-destructive" />;
  }
  if (state === 'skipped') {
    return <Circle className="h-4 w-4 text-muted-foreground/50" />;
  }
  return <Circle className="h-4 w-4 text-muted-foreground/30" />;
}

export function FullAnalysisProgress({
  stages,
  currentStage,
  isRunning,
}: FullAnalysisProgressProps) {
  const completedCount = stages.filter(s => s.state === 'completed').length;
  const progressPercent = (completedCount / stages.length) * 100;

  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {isRunning ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (
              <Sparkles className="h-5 w-5 text-primary" />
            )}
            <h4 className="font-medium">
              {isRunning ? 'Trwa pełna analiza firmy...' : 'Analiza zakończona'}
            </h4>
          </div>
          <span className="text-sm text-muted-foreground">
            {completedCount}/{stages.length} etapów
          </span>
        </div>

        {/* Progress bar */}
        <Progress value={progressPercent} className="h-2 mb-4" />

        {/* Stage list */}
        <div className="space-y-2">
          {stages.map((stage, index) => {
            const Icon = stageIcons[stage.id] || Circle;
            const isActive = index === currentStage && isRunning;

            return (
              <div
                key={stage.id}
                className={cn(
                  'flex items-center gap-3 py-1.5 px-2 rounded-md transition-colors',
                  isActive && 'bg-primary/10',
                  stage.state === 'completed' && 'text-muted-foreground'
                )}
              >
                <StageIcon state={stage.state} />
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className={cn(
                  'flex-1 text-sm',
                  stage.state === 'completed' && 'line-through opacity-70'
                )}>
                  {index + 1}. {stage.label}
                </span>
                {stage.state === 'running' && (
                  <span className="text-xs text-primary animate-pulse">
                    Przetwarzanie...
                  </span>
                )}
                {stage.state === 'skipped' && (
                  <span className="text-xs text-muted-foreground">
                    Pominięto
                  </span>
                )}
                {stage.state === 'failed' && stage.error && (
                  <span className="text-xs text-destructive truncate max-w-[150px]">
                    {stage.error}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
