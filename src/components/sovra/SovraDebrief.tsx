import { useState, useCallback } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Bell,
  Check,
  FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DataCard } from '@/components/ui/data-card';
import { Separator } from '@/components/ui/separator';
import { SovraAvatar } from './SovraAvatar';
import {
  useRunDebrief,
  useCreateDebriefTasks,
  useCreateFollowUpReminder,
  type DebriefResult,
  type DebriefActionItem,
} from '@/hooks/useSovraDebrief';
import { useGCalConnection, useGCalEvents } from '@/hooks/useGoogleCalendar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface SovraDebriefProps {
  initialEventId?: string;
  initialCalendarId?: string;
  initialProjectId?: string;
  onSwitchToChat?: (sessionId: string) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-destructive/10 text-destructive border-destructive/20',
  high: 'bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  medium: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  low: 'bg-muted text-muted-foreground border-border',
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Krytyczny',
  high: 'Wysoki',
  medium: 'Średni',
  low: 'Niski',
};

const SENTIMENT_CONFIG = {
  positive: { label: 'Pozytywne', emoji: '😊', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' },
  neutral: { label: 'Neutralne', emoji: '😐', cls: 'bg-muted text-muted-foreground' },
  negative: { label: 'Wymagające uwagi', emoji: '😟', cls: 'bg-destructive/10 text-destructive' },
};

const URGENCY_COLORS: Record<string, string> = {
  high: 'bg-destructive/10 text-destructive',
  medium: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400',
  low: 'bg-muted text-muted-foreground',
};

export function SovraDebrief({
  initialEventId,
  initialCalendarId,
  initialProjectId,
  onSwitchToChat,
}: SovraDebriefProps) {
  // ─── State ──────────────────────────────────────────────────────────
  const [rawText, setRawText] = useState('');
  const [selectedEventId, setSelectedEventId] = useState(initialEventId || '');
  const [selectedCalendarId, setSelectedCalendarId] = useState(initialCalendarId || '');
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId || '');
  const [result, setResult] = useState<DebriefResult | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [createdItems, setCreatedItems] = useState<Set<number>>(new Set());
  const [createdReminders, setCreatedReminders] = useState<Set<number>>(new Set());
  const [showCleanedNote, setShowCleanedNote] = useState(false);

  // ─── Hooks ──────────────────────────────────────────────────────────
  const runDebrief = useRunDebrief();
  const createTasks = useCreateDebriefTasks();
  const createReminder = useCreateFollowUpReminder();
  const { isConnected: gcalConnected } = useGCalConnection();

  // Today's GCal events for selector
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();
  const { data: todayEvents = [] } = useGCalEvents(todayStart, todayEnd, gcalConnected);

  // Active projects for selector
  const { data: projects = [] } = useQuery({
    queryKey: ['active-projects-selector'],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, name')
        .in('status', ['new', 'in_progress', 'analysis'])
        .order('name')
        .limit(20);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Project name for badge
  const selectedProjectName = projects.find(p => p.id === selectedProjectId)?.name;

  // ─── Handlers ───────────────────────────────────────────────────────
  const handleAnalyze = useCallback(async () => {
    const params: Parameters<typeof runDebrief.mutateAsync>[0] = {
      raw_text: rawText,
    };

    if (selectedEventId && selectedCalendarId) {
      params.gcal_event_id = selectedEventId;
      params.gcal_calendar_id = selectedCalendarId;
    }
    if (selectedProjectId) {
      params.project_id = selectedProjectId;
    }

    try {
      const data = await runDebrief.mutateAsync(params);
      setResult(data);
      // Pre-check all action items
      setCheckedItems(new Set(data.action_items.map((_, i) => i)));
    } catch {
      // Error handled by mutation
    }
  }, [rawText, selectedEventId, selectedCalendarId, selectedProjectId, runDebrief]);

  const handleCreateTasks = useCallback(async () => {
    if (!result) return;

    const selectedItems = result.action_items.filter((_, i) => checkedItems.has(i) && !createdItems.has(i));
    if (selectedItems.length === 0) return;

    try {
      await createTasks.mutateAsync({
        items: selectedItems,
        projectId: selectedProjectId || undefined,
        sessionId: result.session_id,
      });

      // Mark as created
      const newCreated = new Set(createdItems);
      result.action_items.forEach((_, i) => {
        if (checkedItems.has(i)) newCreated.add(i);
      });
      setCreatedItems(newCreated);
    } catch {
      // Error handled by mutation
    }
  }, [result, checkedItems, createdItems, selectedProjectId, createTasks]);

  const handleCreateReminder = useCallback(async (followUp: DebriefResult['follow_ups'][number], index: number) => {
    try {
      await createReminder.mutateAsync(followUp);
      setCreatedReminders(prev => new Set(prev).add(index));
    } catch {
      // Error handled by mutation
    }
  }, [createReminder]);

  const handleEventSelect = useCallback((value: string) => {
    if (!value) {
      setSelectedEventId('');
      setSelectedCalendarId('');
      return;
    }
    // value = "eventId|calendarId"
    const [eventId, calendarId] = value.split('|');
    setSelectedEventId(eventId || '');
    setSelectedCalendarId(calendarId || '');
  }, []);

  const handleReset = useCallback(() => {
    setResult(null);
    setRawText('');
    setCheckedItems(new Set());
    setCreatedItems(new Set());
    setCreatedReminders(new Set());
    setShowCleanedNote(false);
  }, []);

  const toggleItem = useCallback((index: number) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  // ─── Render: Results ────────────────────────────────────────────────
  if (result) {
    const sentiment = SENTIMENT_CONFIG[result.meeting_sentiment] || SENTIMENT_CONFIG.neutral;
    const pendingChecked = [...checkedItems].filter(i => !createdItems.has(i)).length;

    return (
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-2xl mx-auto space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <SovraAvatar size="md" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">Analiza Sovry</h2>
            </div>
            <Badge className={cn('ml-auto text-xs', sentiment.cls)}>
              {sentiment.emoji} {sentiment.label}
            </Badge>
          </div>

          {/* Summary */}
          <DataCard title="Podsumowanie">
            <p className="text-sm text-foreground leading-relaxed">{result.summary}</p>
          </DataCard>

          {/* Key points */}
          {result.key_points.length > 0 && (
            <DataCard title="Kluczowe punkty">
              <ul className="space-y-2">
                {result.key_points.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </DataCard>
          )}

          {/* Decisions */}
          {result.decisions.length > 0 && (
            <DataCard title="Decyzje">
              <ul className="space-y-2">
                {result.decisions.map((dec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-primary font-bold shrink-0">→</span>
                    <span className="font-medium">{dec}</span>
                  </li>
                ))}
              </ul>
            </DataCard>
          )}

          {/* Action items */}
          {result.action_items.length > 0 && (
            <DataCard
              title="Proponowane zadania"
              action={
                pendingChecked > 0 ? (
                  <Button
                    size="sm"
                    onClick={handleCreateTasks}
                    disabled={createTasks.isPending}
                    className="gap-1.5"
                  >
                    {createTasks.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    Stwórz zaznaczone ({pendingChecked})
                  </Button>
                ) : null
              }
            >
              <div className="space-y-2">
                {result.action_items.map((item, i) => {
                  const isCreated = createdItems.has(i);

                  return (
                    <div
                      key={i}
                      className={cn(
                        'bg-muted/30 rounded-lg p-3 border',
                        isCreated && 'opacity-60'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <Checkbox
                          checked={checkedItems.has(i)}
                          onCheckedChange={() => toggleItem(i)}
                          disabled={isCreated}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{item.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge variant="outline" className={cn('text-[10px]', PRIORITY_COLORS[item.priority])}>
                              {PRIORITY_LABELS[item.priority] || item.priority}
                            </Badge>
                            {item.suggested_deadline && (
                              <span className="text-xs text-muted-foreground">
                                📅 {item.suggested_deadline}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              👤 {item.suggested_assignee_hint}
                            </span>
                          </div>
                        </div>
                        {isCreated && (
                          <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-0 text-[10px] shrink-0">
                            <Check className="h-3 w-3 mr-0.5" />
                            Utworzono
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </DataCard>
          )}

          {/* Follow-ups */}
          {result.follow_ups.length > 0 && (
            <DataCard title="Follow-upy">
              <div className="space-y-2">
                {result.follow_ups.map((fu, i) => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {fu.contact_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{fu.contact_name}</p>
                      <p className="text-xs text-muted-foreground">{fu.action}</p>
                    </div>
                    <Badge className={cn('text-[10px] shrink-0', URGENCY_COLORS[fu.urgency])}>
                      {fu.urgency === 'high' ? 'Pilne' : fu.urgency === 'medium' ? 'Średnie' : 'Niskie'}
                    </Badge>
                    {createdReminders.has(i) ? (
                      <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-0 text-[10px] shrink-0">
                        <Check className="h-3 w-3 mr-0.5" />
                        Reminder
                      </Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 text-xs shrink-0"
                        onClick={() => handleCreateReminder(fu, i)}
                        disabled={createReminder.isPending}
                      >
                        <Bell className="h-3 w-3" />
                        Reminder
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </DataCard>
          )}

          {/* Cleaned note (collapsible) */}
          <div className="border border-border rounded-lg">
            <button
              onClick={() => setShowCleanedNote(!showCleanedNote)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-primary hover:bg-muted/30 transition-colors"
            >
              <span className="font-medium">
                {showCleanedNote ? 'Ukryj pełną notatkę' : 'Pokaż pełną notatkę'}
              </span>
              {showCleanedNote ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {showCleanedNote && (
              <>
                <Separator />
                <div className="p-4">
                  {selectedProjectName && result.note_saved && (
                    <Badge variant="secondary" className="mb-3 text-xs gap-1">
                      <FolderOpen className="h-3 w-3" />
                      Zapisano w projekcie: {selectedProjectName}
                    </Badge>
                  )}
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground leading-relaxed">
                    {result.raw_note_cleaned}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              📝 Nowy debrief
            </Button>
            {result.session_id && onSwitchToChat && (
              <Button variant="ghost" size="sm" onClick={() => onSwitchToChat(result.session_id!)}>
                💬 Otwórz w chacie
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Input Form ─────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Debrief spotkania</h2>
          <p className="text-sm text-muted-foreground">
            Opisz co się wydarzyło — Sovra wyciągnie kluczowe punkty i zaproponuje zadania.
          </p>
        </div>

        {/* Context selectors */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* GCal event selector */}
          {gcalConnected && todayEvents.length > 0 && (
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Spotkanie z kalendarza
              </label>
              <select
                value={selectedEventId ? `${selectedEventId}|${selectedCalendarId}` : ''}
                onChange={(e) => handleEventSelect(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">— wybierz (opcjonalne) —</option>
                {todayEvents.map((event) => (
                  <option key={event.id} value={`${event.id}|${event.calendar_id || 'primary'}`}>
                    {event.summary} ({event.start?.dateTime?.split('T')[1]?.slice(0, 5) || 'cały dzień'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Project selector */}
          {projects.length > 0 && (
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Projekt
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">— wybierz (opcjonalne) —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Textarea */}
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Spotkaliśmy się z Janem Kowalskim z firmy ABC. Omówiliśmy ofertę na ubezpieczenie majątkowe. Jan jest zainteresowany, ale chce porównanie z obecnym ubezpieczycielem. Deadline na ofertę do piątku..."
          className="w-full min-h-[200px] rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
        />

        {/* Analyze button */}
        <Button
          onClick={handleAnalyze}
          disabled={rawText.length < 10 || runDebrief.isPending}
          className="w-full gap-2"
          size="lg"
        >
          {runDebrief.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sovra analizuje...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Analizuj z Sovra
            </>
          )}
        </Button>

        {rawText.length > 0 && rawText.length < 10 && (
          <p className="text-xs text-muted-foreground text-center">
            Minimum 10 znaków ({rawText.length}/10)
          </p>
        )}
      </div>
    </div>
  );
}
