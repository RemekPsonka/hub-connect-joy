import type { ClientComplexity } from '@/types/dealTeam';

const AREAS: Array<{ key: keyof ClientComplexity; label: string; icon: string }> = [
  { key: 'property_active', label: 'Majątek', icon: '🏠' },
  { key: 'financial_active', label: 'Finansowe', icon: '💰' },
  { key: 'communication_active', label: 'Komunikacja', icon: '📞' },
  { key: 'life_group_active', label: 'Grupowe', icon: '🏥' },
];

interface ComplexityChipsProps {
  complexity: ClientComplexity | Record<string, unknown> | null | undefined;
}

export function ComplexityChips({ complexity }: ComplexityChipsProps) {
  if (!complexity) return null;
  const c = complexity as Record<string, unknown>;
  const active = AREAS.filter((a) => Boolean(c[a.key]));
  if (active.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {active.map((a) => (
        <span
          key={a.key}
          className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
        >
          <span>{a.icon}</span>
          <span>{a.label}</span>
        </span>
      ))}
    </div>
  );
}
