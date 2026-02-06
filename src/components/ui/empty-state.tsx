import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Object-style action (existing API) */
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  /** Flat action label — used when `action` object is not provided */
  actionLabel?: string;
  /** Flat action handler — used when `action` object is not provided */
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  // Resolve which action to render: object-style takes priority
  const resolvedAction = action
    ? action
    : actionLabel && onAction
      ? { label: actionLabel, onClick: onAction }
      : null;

  return (
    <Card className={cn(className)}>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Icon className="h-16 w-16 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground text-center mb-6 max-w-md">{description}</p>
        {resolvedAction && (
          <Button onClick={resolvedAction.onClick}>
            {(resolvedAction as { icon?: LucideIcon }).icon && (
              <ActionIcon icon={(resolvedAction as { icon?: LucideIcon }).icon!} />
            )}
            {resolvedAction.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/** Small helper to avoid inline JSX complexity for the optional icon */
function ActionIcon({ icon: IconComponent }: { icon: LucideIcon }) {
  return <IconComponent className="mr-2 h-4 w-4" />;
}
