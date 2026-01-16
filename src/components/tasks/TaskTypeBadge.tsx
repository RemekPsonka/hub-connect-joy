import { Badge } from '@/components/ui/badge';
import { Link2, Users, CheckSquare } from 'lucide-react';

interface TaskTypeBadgeProps {
  type: string | null;
}

const typeConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  standard: {
    label: 'Standardowe',
    className: 'bg-muted text-muted-foreground',
    icon: <CheckSquare className="h-3 w-3" />,
  },
  cross: {
    label: 'Krosowe',
    className: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    icon: <Link2 className="h-3 w-3" />,
  },
  group: {
    label: 'Grupowe',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    icon: <Users className="h-3 w-3" />,
  },
};

export function TaskTypeBadge({ type }: TaskTypeBadgeProps) {
  const config = typeConfig[type || 'standard'] || typeConfig.standard;

  return (
    <Badge variant="secondary" className={`${config.className} gap-1`}>
      {config.icon}
      {config.label}
    </Badge>
  );
}
