import { Badge } from '@/components/ui/badge';
import type { ContactGroup } from '@/hooks/useContacts';

interface GroupBadgeProps {
  group: ContactGroup | null;
  className?: string;
  compact?: boolean;
}

export function GroupBadge({ group, className, compact }: GroupBadgeProps) {
  if (!group) {
    if (compact) {
      return <span className="text-xs text-muted-foreground">–</span>;
    }
    return (
      <Badge variant="outline" className={className}>
        Brak grupy
      </Badge>
    );
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 min-w-0 ${className || ''}`}>
        <span
          className="h-2 w-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: group.color || '#6366f1' }}
        />
        <span className="text-xs text-muted-foreground truncate max-w-[80px]">
          {group.name}
        </span>
      </div>
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
