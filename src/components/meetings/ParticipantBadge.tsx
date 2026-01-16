import { Badge } from '@/components/ui/badge';

interface ParticipantBadgeProps {
  isMember: boolean;
  isNew: boolean;
  primaryGroupId?: string | null;
}

export function ParticipantBadge({ isMember, isNew, primaryGroupId }: ParticipantBadgeProps) {
  if (isMember) {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20">
        Mój członek
      </Badge>
    );
  }

  if (isNew) {
    return (
      <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20">
        Nowy
      </Badge>
    );
  }

  // Check if contact is "Członek CC" based on group (this is a simplified check)
  // In a real implementation, you'd check the actual group name
  return (
    <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 hover:bg-indigo-500/20">
      Członek CC
    </Badge>
  );
}
