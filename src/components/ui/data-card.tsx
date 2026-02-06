import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DataCardProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  noPadding?: boolean;
  isLoading?: boolean;
}

export function DataCard({
  title,
  description,
  action,
  children,
  footer,
  className,
  noPadding,
  isLoading,
}: DataCardProps) {
  return (
    <div
      className={cn(
        'bg-card rounded-xl shadow-sm border border-border overflow-hidden',
        className,
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div>
            {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-5'}>
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-4 w-3/4 bg-muted rounded-md" />
            <div className="h-4 w-1/2 bg-muted rounded-md" />
            <div className="h-4 w-2/3 bg-muted rounded-md" />
          </div>
        ) : (
          children
        )}
      </div>
      {footer && (
        <div className="px-5 py-3 bg-muted/30 border-t border-border">{footer}</div>
      )}
    </div>
  );
}
