import { Badge } from '@/components/ui/badge';
import { PROSPECT_SOURCE_LABELS, type ProspectSource } from '@/types/dealTeam';

interface SourceBadgeProps {
  value: ProspectSource | string | null | undefined;
}

export function SourceBadge({ value }: SourceBadgeProps) {
  if (!value) return null;
  const label = PROSPECT_SOURCE_LABELS[value as ProspectSource];
  if (!label) return null;
  return (
    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-sky-500/10 text-sky-700 border-sky-300">
      {label}
    </Badge>
  );
}
