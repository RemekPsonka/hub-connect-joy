import { cn } from '@/lib/utils';

export type SovraMode = 'chat' | 'debrief' | 'morning';

interface SovraModeSelectorProps {
  mode: SovraMode;
  onModeChange: (mode: SovraMode) => void;
}

const MODES: Array<{ value: SovraMode; label: string; emoji: string }> = [
  { value: 'chat', label: 'Chat', emoji: '💬' },
  { value: 'debrief', label: 'Debrief', emoji: '📝' },
  { value: 'morning', label: 'Brief', emoji: '☀️' },
];

export function SovraModeSelector({ mode, onModeChange }: SovraModeSelectorProps) {
  return (
    <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
      {MODES.map((m) => (
        <button
          key={m.value}
          onClick={() => onModeChange(m.value)}
          className={cn(
            'px-3 py-1.5 text-sm rounded-md transition-all',
            mode === m.value
              ? 'bg-card shadow-sm font-medium text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <span className="mr-1">{m.emoji}</span>
          {m.label}
        </button>
      ))}
    </div>
  );
}
