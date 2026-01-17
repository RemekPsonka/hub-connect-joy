interface CrossTaskProgressBadgeProps {
  completed: number;
  total: number;
}

export function CrossTaskProgressBadge({ completed, total }: CrossTaskProgressBadgeProps) {
  const getColorClasses = () => {
    if (completed === 0) return 'bg-muted text-muted-foreground';
    if (completed === total) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  };

  const getDotColor = () => {
    if (completed === 0) return 'bg-muted-foreground/40';
    if (completed === total) return 'bg-green-600 dark:bg-green-400';
    return 'bg-blue-600 dark:bg-blue-400';
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${getColorClasses()}`}>
      <span>{completed}/{total}</span>
      <span className="flex gap-0.5">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              i < completed ? getDotColor() : 'bg-current/20'
            }`}
          />
        ))}
      </span>
    </span>
  );
}
