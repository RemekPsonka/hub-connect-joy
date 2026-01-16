import { Badge } from '@/components/ui/badge';

interface TaskPriorityBadgeProps {
  priority: string | null;
}

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: {
    label: 'Niski',
    className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  },
  medium: {
    label: 'Średni',
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  },
  high: {
    label: 'Wysoki',
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  },
  urgent: {
    label: 'Pilny',
    className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  },
};

export function TaskPriorityBadge({ priority }: TaskPriorityBadgeProps) {
  const config = priorityConfig[priority || 'medium'] || priorityConfig.medium;

  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  );
}
