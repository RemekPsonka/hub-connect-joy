import { Rocket, Loader2, CheckCircle2, AlertCircle, Users, Brain, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { TurboAgentProgress as TurboProgressType } from '@/hooks/useTurboAgent';

interface TurboAgentProgressProps {
  progress: TurboProgressType;
}

const phaseIcons: Record<TurboProgressType['phase'], React.ReactNode> = {
  idle: <Rocket className="h-5 w-5" />,
  analyzing: <Brain className="h-5 w-5 animate-pulse" />,
  selecting: <Users className="h-5 w-5 animate-pulse" />,
  querying: <Zap className="h-5 w-5 animate-pulse" />,
  aggregating: <Brain className="h-5 w-5 animate-pulse" />,
  completed: <CheckCircle2 className="h-5 w-5 text-green-500" />,
  error: <AlertCircle className="h-5 w-5 text-destructive" />
};

export function TurboAgentProgress({ progress }: TurboAgentProgressProps) {
  const getProgressValue = () => {
    switch (progress.phase) {
      case 'idle':
        return 0;
      case 'analyzing':
        return 10;
      case 'selecting':
        return 25;
      case 'querying':
        if (progress.selectedAgents > 0) {
          return 25 + (progress.agentsResponded / progress.selectedAgents) * 50;
        }
        return 40;
      case 'aggregating':
        return 85;
      case 'completed':
        return 100;
      case 'error':
        return 0;
      default:
        return 0;
    }
  };

  const isActive = progress.phase !== 'idle' && progress.phase !== 'completed' && progress.phase !== 'error';

  return (
    <div className={cn(
      "rounded-lg border p-4 space-y-3",
      progress.phase === 'error' && "border-destructive/50 bg-destructive/5",
      progress.phase === 'completed' && "border-green-500/50 bg-green-500/5",
      isActive && "border-orange-500/50 bg-orange-500/5"
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2 rounded-full",
          progress.phase === 'error' && "bg-destructive/10",
          progress.phase === 'completed' && "bg-green-500/10",
          isActive && "bg-orange-500/10"
        )}>
          {isActive ? (
            <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
          ) : (
            phaseIcons[progress.phase]
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">🚀 Agent Turbo</span>
            {progress.selectedAgents > 0 && (
              <span className="text-xs text-muted-foreground">
                {progress.agentsResponded}/{progress.selectedAgents} agentów
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{progress.message}</p>
        </div>
      </div>

      {isActive && (
        <Progress 
          value={getProgressValue()} 
          className="h-2"
        />
      )}

      {progress.phase === 'querying' && progress.selectedAgents > 0 && (
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: progress.selectedAgents }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                i < progress.agentsResponded 
                  ? "bg-green-500" 
                  : "bg-muted-foreground/30"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
