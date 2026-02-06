interface SkeletonCardProps {
  height?: string;
  className?: string;
  lines?: number;
}

export function SkeletonCard({ height = 'h-32', className, lines = 3 }: SkeletonCardProps) {
  return (
    <div className={`bg-card rounded-xl border border-border p-5 animate-pulse ${height} ${className || ''}`}>
      <div className="h-4 w-1/3 bg-muted rounded-md mb-4" />
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-3 bg-muted rounded-md"
            style={{ width: `${85 - i * 15}%` }}
          />
        ))}
      </div>
    </div>
  );
}
