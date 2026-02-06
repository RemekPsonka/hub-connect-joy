import { type ReactNode } from 'react';

interface DataCardProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function DataCard({ title, description, action, children, footer, className, noPadding }: DataCardProps) {
  return (
    <div className={`bg-card rounded-xl shadow-sm border border-border overflow-hidden ${className || ''}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div>
            {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-5'}>
        {children}
      </div>
      {footer && (
        <div className="px-5 py-3 bg-muted/30 border-t border-border">
          {footer}
        </div>
      )}
    </div>
  );
}
