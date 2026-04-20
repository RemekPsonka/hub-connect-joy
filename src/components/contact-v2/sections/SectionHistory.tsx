import { useState } from 'react';
import {
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  UserPlus,
  Brain,
  GitMerge,
  RefreshCw,
  Edit,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useContactConsultations, useContactActivityLog } from '@/hooks/useContacts';
import { SectionShell } from './SectionShell';

interface SectionHistoryProps {
  contactId: string;
}

const activityTypeConfig: Record<
  string,
  { icon: typeof UserPlus; label: string; color: string }
> = {
  created: { icon: UserPlus, label: 'Kontakt dodany', color: 'text-green-500' },
  ai_profile_generated: { icon: Brain, label: 'Profil AI wygenerowany', color: 'text-purple-500' },
  ai_agent_initialized: { icon: Brain, label: 'Agent AI zainicjalizowany', color: 'text-indigo-500' },
  merged: { icon: GitMerge, label: 'Kontakt scalony', color: 'text-orange-500' },
  updated: { icon: Edit, label: 'Kontakt zaktualizowany', color: 'text-blue-500' },
  refreshed: { icon: RefreshCw, label: 'Dane odświeżone', color: 'text-cyan-500' },
};

type Ev =
  | { id: string; kind: 'consultation'; date: string; data: Record<string, unknown> }
  | { id: string; kind: 'activity'; date: string; data: Record<string, unknown> };

export function SectionHistory({ contactId }: SectionHistoryProps) {
  const {
    data: consultations = [],
    isLoading: lc,
    isError: ec,
    refetch: rc,
  } = useContactConsultations(contactId);
  const {
    data: activityLog = [],
    isLoading: la,
    isError: ea,
    refetch: ra,
  } = useContactActivityLog(contactId);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isLoading = lc || la;
  const isError = ec || ea;
  const isEmpty =
    !isLoading && !isError && consultations.length === 0 && activityLog.length === 0;

  const events: Ev[] = [
    ...consultations
      .filter((c: { scheduled_at?: string | null }) => !!c.scheduled_at)
      .map((c) => ({
        id: `c-${(c as { id: string }).id}`,
        kind: 'consultation' as const,
        date: (c as { scheduled_at: string }).scheduled_at,
        data: c as Record<string, unknown>,
      })),
    ...activityLog.map((a) => ({
      id: `a-${(a as { id: string }).id}`,
      kind: 'activity' as const,
      date: (a as { created_at: string }).created_at,
      data: a as Record<string, unknown>,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <SectionShell
      isLoading={isLoading}
      isError={isError}
      refetch={() => {
        rc();
        ra();
      }}
      isEmpty={isEmpty}
      emptyMessage="Brak historii — żadnych konsultacji ani zdarzeń w audycie"
    >
      <div className="space-y-3">
        {events.map((ev) => {
          if (ev.kind === 'activity') {
            const type = (ev.data.activity_type as string) ?? 'updated';
            const cfg =
              activityTypeConfig[type] ?? {
                icon: MessageSquare,
                label: type,
                color: 'text-muted-foreground',
              };
            const Icon = cfg.icon;
            const description = ev.data.description as string | undefined;
            return (
              <div
                key={ev.id}
                className="flex items-start gap-3 rounded-md border bg-card px-3 py-2"
              >
                <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.color}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{cfg.label}</p>
                  {description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                  )}
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {format(new Date(ev.date), 'd MMM yyyy, HH:mm', { locale: pl })}
                  </div>
                </div>
              </div>
            );
          }
          const c = ev.data as {
            id: string;
            scheduled_at: string;
            status?: string | null;
            notes?: string | null;
            title?: string | null;
          };
          const isExp = expandedId === ev.id;
          return (
            <div key={ev.id} className="rounded-md border bg-card">
              <button
                type="button"
                onClick={() => setExpandedId(isExp ? null : ev.id)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-muted/40"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Calendar className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm font-medium truncate">
                    {c.title ?? 'Konsultacja'}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {c.status ?? '?'}
                  </Badge>
                </div>
                {isExp ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </button>
              <div className="px-3 pb-2 text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(c.scheduled_at), 'd MMM yyyy, HH:mm', { locale: pl })}
              </div>
              {isExp && c.notes && (
                <p className="px-3 pb-3 text-sm whitespace-pre-wrap">{c.notes}</p>
              )}
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}
