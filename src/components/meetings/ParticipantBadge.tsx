import { Badge } from '@/components/ui/badge';

interface ParticipantBadgeProps {
  isMember: boolean;
  isNew: boolean;
  primaryGroupId?: string | null;
  isProspect?: boolean;
}

export function ParticipantBadge({ isMember, isNew, primaryGroupId, isProspect }: ParticipantBadgeProps) {
  if (isProspect) {
    return (
      <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 hover:bg-orange-500/20">
        Prospect
      </Badge>
    );
  }

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

  return (
    <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 hover:bg-indigo-500/20">
      Członek CC
    </Badge>
  );
}
