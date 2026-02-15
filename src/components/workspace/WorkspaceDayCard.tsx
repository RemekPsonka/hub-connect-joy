import { cn } from '@/lib/utils';

interface ProjectInfo {
  name: string;
  color: string;
}

interface WorkspaceDayCardProps {
  dayIndex: number;
  dayName: string;
  projects: ProjectInfo[];
  isActive: boolean;
  isToday: boolean;
  onClick: () => void;
}

export function WorkspaceDayCard({
  dayName,
  projects,
  isActive,
  isToday,
  onClick,
}: WorkspaceDayCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border transition-all min-w-[110px]',
        'hover:bg-accent/50',
        isActive
          ? 'bg-primary/10 border-primary/40 shadow-sm'
          : 'bg-card border-border/50',
        isToday && !isActive && 'ring-1 ring-primary/20'
      )}
    >
      <span className={cn(
        'text-[11px] font-semibold uppercase tracking-wider',
        isActive ? 'text-primary' : 'text-muted-foreground'
      )}>
        {dayName}
      </span>
      {projects.length > 0 ? (
        <div className="flex flex-col items-center gap-0.5">
          {projects.map((p, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: p.color || 'hsl(var(--primary))' }}
              />
              <span className={cn(
                'text-xs truncate max-w-[90px]',
                isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
              )}>
                {p.name}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <span className="text-[10px] text-muted-foreground/50 italic">Wolny dzień</span>
      )}
    </button>
  );
}
