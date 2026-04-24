import { cn } from '@/lib/utils';
import type { DealTeamContact } from '@/types/dealTeam';

interface Step {
  key: string;
  label: string;
  value?: string | null;
}

interface ContactMilestoneTimelineProps {
  contact: DealTeamContact;
}

const dateFmt = new Intl.DateTimeFormat('pl-PL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function fmtDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return dateFmt.format(d);
}

function daysBetween(a: string, b: string): number | null {
  const d1 = new Date(a).getTime();
  const d2 = new Date(b).getTime();
  if (Number.isNaN(d1) || Number.isNaN(d2)) return null;
  return Math.max(0, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
}

export function ContactMilestoneTimeline({ contact }: ContactMilestoneTimelineProps) {
  const steps: Step[] = [
    { key: 'k1', label: 'K1 Spotkanie', value: contact.k1_meeting_done_at },
    { key: 'k2a', label: 'K2 Handshake', value: contact.handshake_at },
    { key: 'k2b', label: 'K2+ Pełnomocnictwo', value: contact.poa_signed_at },
    { key: 'k3', label: 'K3 Audyt', value: contact.audit_done_at },
    { key: 'k4', label: 'K4 Polisa wygrana', value: contact.won_at },
  ];

  const allEmpty = steps.every((s) => !s.value);
  if (allEmpty) {
    return (
      <p className="text-xs text-muted-foreground italic">
        📅 Brak zarejestrowanych kamieni milowych — kliknij dowolny etap lejka, aby
        auto-stempelować daty.
      </p>
    );
  }

  // Last index of a non-empty value, used to find a "previous reached milestone" for delta
  let lastReachedValue: string | null = null;

  return (
    <ol className="space-y-0">
      {steps.map((step, idx) => {
        const reached = !!step.value;
        const isLast = idx === steps.length - 1;
        const delta =
          reached && lastReachedValue && step.value
            ? daysBetween(lastReachedValue, step.value)
            : null;
        if (reached && step.value) lastReachedValue = step.value;

        return (
          <li key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'h-3 w-3 rounded-full border shrink-0',
                  reached
                    ? 'bg-emerald-600 border-emerald-600'
                    : 'bg-muted border-border',
                )}
                aria-hidden
              />
              {!isLast && <span className="w-px bg-border flex-1 min-h-6" aria-hidden />}
            </div>
            <div className={cn('pb-3', isLast && 'pb-0')}>
              <div className="text-xs font-medium leading-tight">{step.label}</div>
              <div className="text-[11px] text-muted-foreground tabular-nums">
                {fmtDate(step.value)}
                {delta !== null && delta > 0 && (
                  <span className="ml-2 text-emerald-700 dark:text-emerald-400">
                    +{delta} {delta === 1 ? 'dzień' : 'dni'}
                  </span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}