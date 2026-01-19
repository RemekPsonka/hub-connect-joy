import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import { cn } from '@/lib/utils';

interface SectionCardProps {
  icon?: ReactNode;
  title: string;
  confidence?: number;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  compact?: boolean;
}

export function SectionCard({ 
  icon, 
  title, 
  confidence,
  children,
  action,
  className,
  headerClassName,
  contentClassName,
  compact = false
}: SectionCardProps) {
  return (
    <Card className={cn(compact && 'shadow-sm', className)}>
      <CardHeader className={cn('pb-3', compact && 'py-3', headerClassName)}>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className={cn(
            'flex items-center gap-2',
            compact ? 'text-sm' : 'text-base'
          )}>
            {icon && <span className="text-primary shrink-0">{icon}</span>}
            {title}
          </CardTitle>
          <div className="flex items-center gap-2 shrink-0">
            {typeof confidence === 'number' && (
              <ConfidenceIndicator score={confidence} size="sm" showIcon={false} />
            )}
            {action}
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn(compact && 'pb-3', contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}

// Lightweight version for nested sections
export function SectionBox({ 
  title, 
  icon, 
  children, 
  className 
}: { 
  title: string; 
  icon?: ReactNode; 
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        {icon && <span className="text-primary">{icon}</span>}
        {title}
      </h4>
      {children}
    </div>
  );
}
