import { cn } from '@/lib/utils';

type SkeletonCardVariant = 'stat' | 'data' | 'list';

interface SkeletonCardProps {
  variant?: SkeletonCardVariant;
  height?: string;
  className?: string;
  lines?: number;
}

export function SkeletonCard({
  variant = 'data',
  height,
  className,
  lines = 3,
}: SkeletonCardProps) {
  if (variant === 'stat') {
    return (
      <div
        className={cn(
          'bg-card rounded-xl border border-border p-5 animate-pulse',
          height,
          className,
        )}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="h-4 w-16 bg-muted rounded-md" />
            <div className="h-8 w-24 bg-muted rounded-md mt-3" />
          </div>
          <div className="h-10 w-10 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div
        className={cn(
          'bg-card rounded-xl border border-border p-4 animate-pulse',
          height,
          className,
        )}
      >
        <div className="space-y-3">
          {Array.from({ length: lines }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-8 w-8 bg-muted rounded-full shrink-0" />
              <div className="h-4 bg-muted rounded-md flex-1" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // variant === 'data' (default — matches previous behavior with added header)
  return (
    <div
      className={cn(
        'bg-card rounded-xl border border-border animate-pulse overflow-hidden',
        height,
        className,
      )}
    >
      <div className="h-12 border-b border-border px-5 flex items-center">
        <div className="h-4 w-1/3 bg-muted rounded-md" />
      </div>
      <div className="p-5 space-y-2">
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
