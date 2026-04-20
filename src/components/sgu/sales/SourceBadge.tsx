import { EditableSubcategoryBadge, type SubcategoryOption } from './EditableSubcategoryBadge';
import { PROSPECT_SOURCE_LABELS, type ProspectSource } from '@/types/dealTeam';

const SOURCE_CLASS = 'bg-sky-500/10 text-sky-700 border-sky-300';

const OPTIONS: SubcategoryOption[] = (Object.keys(PROSPECT_SOURCE_LABELS) as ProspectSource[]).map(
  (key) => ({
    value: key,
    label: PROSPECT_SOURCE_LABELS[key],
    className: SOURCE_CLASS,
  }),
);

interface SourceBadgeProps {
  value: ProspectSource | string | null | undefined;
  onChange: (next: ProspectSource) => void;
}

export function SourceBadge({ value, onChange }: SourceBadgeProps) {
  return (
    <EditableSubcategoryBadge
      ariaLabel="Źródło prospekta"
      value={value}
      options={OPTIONS}
      onSelect={(v) => onChange(v as ProspectSource)}
    />
  );
}
