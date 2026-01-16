import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ConsultationStatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  scheduled: { label: 'Zaplanowana', variant: 'default' },
  completed: { label: 'Zakończona', variant: 'secondary' },
  cancelled: { label: 'Anulowana', variant: 'outline' },
  no_show: { label: 'Nieobecność', variant: 'destructive' },
};

export function ConsultationStatusBadge({ status, className }: ConsultationStatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: 'outline' as const };

  return (
    <Badge variant={config.variant} className={cn(className)}>
      {config.label}
    </Badge>
  );
}
