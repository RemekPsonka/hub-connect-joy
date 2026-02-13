import { Badge } from '@/components/ui/badge';
import { Clock, Loader2, CheckCircle } from 'lucide-react';

interface TaskStatusBadgeProps {
  status: string | null;
}

const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  todo: {
    label: 'Do zrobienia',
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    icon: <Clock className="h-3 w-3" />,
  },
  pending: {
    label: 'Do zrobienia',
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    icon: <Clock className="h-3 w-3" />,
  },
  in_progress: {
    label: 'W trakcie',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    icon: <Loader2 className="h-3 w-3" />,
  },
  completed: {
    label: 'Zakończone',
    className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    icon: <CheckCircle className="h-3 w-3" />,
  },
  cancelled: {
    label: 'Anulowane',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    icon: <Clock className="h-3 w-3" />,
  },
};

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  const config = statusConfig[status || 'pending'] || statusConfig.pending;

  return (
    <Badge variant="secondary" className={`${config.className} gap-1`}>
      {config.icon}
      {config.label}
    </Badge>
  );
}
