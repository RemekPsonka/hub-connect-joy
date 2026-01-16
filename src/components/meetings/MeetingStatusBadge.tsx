import { Badge } from '@/components/ui/badge';
import { Calendar, Play, CheckCircle2, XCircle } from 'lucide-react';
import type { MeetingStatus } from '@/hooks/useMeetings';

interface MeetingStatusBadgeProps {
  status: MeetingStatus;
}

const statusConfig: Record<MeetingStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
  upcoming: {
    label: 'Nadchodzące',
    variant: 'default',
    icon: Calendar,
  },
  in_progress: {
    label: 'W trakcie',
    variant: 'secondary',
    icon: Play,
  },
  completed: {
    label: 'Zakończone',
    variant: 'outline',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Anulowane',
    variant: 'destructive',
    icon: XCircle,
  },
};

export function MeetingStatusBadge({ status }: MeetingStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.upcoming;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
