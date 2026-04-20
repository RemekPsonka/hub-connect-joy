import { EditableSubcategoryBadge, type SubcategoryOption } from './EditableSubcategoryBadge';
import type { Temperature } from '@/types/dealTeam';

const OPTIONS: SubcategoryOption[] = [
  { value: 'hot', label: 'HOT', className: 'bg-red-500/15 text-red-700 border-red-300' },
  { value: 'top', label: 'TOP', className: 'bg-violet-500/15 text-violet-700 border-violet-300' },
  { value: '10x', label: '10x', className: 'bg-amber-500/15 text-amber-700 border-amber-300' },
  { value: 'cold', label: 'COLD', className: 'bg-slate-500/15 text-slate-700 border-slate-300' },
];

interface TemperatureBadgeProps {
  value: Temperature | string | null | undefined;
  onChange: (next: Temperature) => void;
}

export function TemperatureBadge({ value, onChange }: TemperatureBadgeProps) {
  return (
    <EditableSubcategoryBadge
      ariaLabel="Temperatura"
      value={value}
      options={OPTIONS}
      onSelect={(v) => onChange(v as Temperature)}
    />
  );
}
