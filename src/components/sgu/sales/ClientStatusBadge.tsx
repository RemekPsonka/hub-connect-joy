import { Star } from 'lucide-react';
import { EditableSubcategoryBadge, type SubcategoryOption } from './EditableSubcategoryBadge';
import { CLIENT_STATUS_LABELS, type ClientStatus } from '@/types/dealTeam';

const OPTIONS: SubcategoryOption[] = [
  {
    value: 'standard',
    label: CLIENT_STATUS_LABELS.standard,
    className: 'bg-emerald-500/15 text-emerald-700 border-emerald-300',
  },
  {
    value: 'ambassador',
    label: CLIENT_STATUS_LABELS.ambassador,
    className: 'bg-amber-500/15 text-amber-700 border-amber-300',
    icon: <Star className="h-3 w-3 fill-current" />,
  },
];

interface ClientStatusBadgeProps {
  value: ClientStatus | string | null | undefined;
  onChange: (next: 'standard' | 'ambassador') => void;
}

export function ClientStatusBadge({ value, onChange }: ClientStatusBadgeProps) {
  return (
    <EditableSubcategoryBadge
      ariaLabel="Status klienta"
      value={value}
      options={OPTIONS}
      emptyLabel="Status"
      onSelect={(v) => onChange(v as 'standard' | 'ambassador')}
    />
  );
}
