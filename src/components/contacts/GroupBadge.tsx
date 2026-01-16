import { Badge } from '@/components/ui/badge';
import type { ContactGroup } from '@/hooks/useContacts';

interface GroupBadgeProps {
  group: ContactGroup | null;
  className?: string;
}

export function GroupBadge({ group, className }: GroupBadgeProps) {
  if (!group) {
    return (
      <Badge variant="outline" className={className}>
        Brak grupy
      </Badge>
    );
  }

  return (
    <Badge
      className={className}
      style={{
        backgroundColor: group.color || '#6366f1',
        color: 'white',
      }}
    >
      {group.name}
    </Badge>
  );
}
