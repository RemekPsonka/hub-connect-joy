interface ConnectionLegendProps {
  className?: string;
}

const legendItems = [
  { type: 'personal', label: 'Znajomi', color: '#22c55e' },
  { type: 'professional', label: 'Współpracownicy', color: '#3b82f6' },
  { type: 'met_at_event', label: 'Poznani na evencie', color: '#f59e0b' },
  { type: 'project', label: 'Wspólny projekt', color: '#8b5cf6' },
  { type: 'family', label: 'Rodzina', color: '#ec4899' },
  { type: 'knows', label: 'Ogólne', color: '#6b7280' },
];

export function ConnectionLegend({ className }: ConnectionLegendProps) {
  return (
    <div className={`flex flex-wrap items-center gap-4 p-3 bg-muted/50 rounded-lg text-sm ${className || ''}`}>
      <span className="font-medium text-foreground">Typy połączeń:</span>
      {legendItems.map((item) => (
        <div key={item.type} className="flex items-center gap-1.5">
          <div 
            className="w-6 h-1 rounded-full" 
            style={{ backgroundColor: item.color }}
          />
          <span className="text-xs text-muted-foreground">{item.label}</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5 ml-2 border-l border-border pl-4">
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5 bg-muted-foreground/50 rounded" />
          <div className="w-6 h-1 bg-muted-foreground/50 rounded" />
          <div className="w-8 h-1.5 bg-muted-foreground/50 rounded" />
        </div>
        <span className="text-xs text-muted-foreground">
          Grubość = siła (1-10)
        </span>
      </div>
    </div>
  );
}
