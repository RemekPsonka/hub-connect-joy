import { cn } from '@/lib/utils';
import { StatusUbezpieczenia, STATUS_LABELS } from './types';

interface InsuranceStatusToggleProps {
  value: StatusUbezpieczenia;
  onChange: (value: StatusUbezpieczenia) => void;
  className?: string;
}

export function InsuranceStatusToggle({ value, onChange, className }: InsuranceStatusToggleProps) {
  const statuses: StatusUbezpieczenia[] = ['ubezpieczone', 'luka', 'nie_dotyczy'];
  
  return (
    <div className={cn('flex gap-1 p-1 bg-muted rounded-lg', className)}>
      {statuses.map((status) => (
        <button
          key={status}
          type="button"
          onClick={() => onChange(status)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
            value === status && status === 'ubezpieczone' && 'bg-green-500 text-white shadow-sm',
            value === status && status === 'luka' && 'bg-destructive text-destructive-foreground shadow-sm',
            value === status && status === 'nie_dotyczy' && 'bg-muted-foreground/20 text-muted-foreground shadow-sm',
            value !== status && 'text-muted-foreground hover:bg-background/60'
          )}
        >
          <span className={cn(
            'h-2 w-2 rounded-full',
            status === 'ubezpieczone' && 'bg-green-500',
            status === 'luka' && 'bg-destructive',
            status === 'nie_dotyczy' && 'bg-muted-foreground',
            value === status && status === 'ubezpieczone' && 'bg-white',
            value === status && status === 'luka' && 'bg-white',
            value === status && status === 'nie_dotyczy' && 'bg-muted-foreground'
          )} />
          {STATUS_LABELS[status]}
        </button>
      ))}
    </div>
  );
}
