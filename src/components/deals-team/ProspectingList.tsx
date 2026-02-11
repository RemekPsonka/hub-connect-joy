import { useState, useCallback } from 'react';
import { MoreHorizontal, MessageSquare, UserPlus, Trash2, Circle, Sparkles, Loader2 } from 'lucide-react';
import {
  useMeetingProspects,
  useUpdateMeetingProspect,
  useDeleteMeetingProspect,
  useGenerateProspectBrief,
  type ProspectingStatus,
} from '@/hooks/useMeetingProspects';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProspectingConvertDialog } from './ProspectingConvertDialog';
import { ProspectAIBriefDialog } from './ProspectAIBriefDialog';

const PRIORITY_CYCLE: (string | null)[] = [null, 'high', 'medium', 'low'];
const PRIORITY_COLORS: Record<string, string> = {
  high: 'text-red-500 fill-red-500',
  medium: 'text-yellow-500 fill-yellow-500',
  low: 'text-green-500 fill-green-500',
};
const PRIORITY_LABELS: Record<string, string> = {
  high: 'Ważne',
  medium: 'Średnie',
  low: 'Mniej ważne',
};

const PRIORITY_SORT_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

const STATUS_LABELS: Record<ProspectingStatus, string> = {
  new: 'Nowy',
  contacted: 'Skontaktowany',
  interested: 'Zainteresowany',
  not_interested: 'Niezainteresowany',
  converted: 'Skonwertowany',
};

const STATUS_COLORS: Record<ProspectingStatus, string> = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  contacted: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  interested: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  not_interested: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  converted: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
};

interface Props {
  teamId: string;
}

export function ProspectingList({ teamId }: Props) {
  const { data: prospects = [], isLoading } = useMeetingProspects(teamId);
  const updateMutation = useUpdateMeetingProspect();
  const deleteMutation = useDeleteMeetingProspect();
  const briefMutation = useGenerateProspectBrief();
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');
  const [convertProspect, setConvertProspect] = useState<string | null>(null);
  const [briefProspect, setBriefProspect] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const uniqueSources = Array.from(
    new Set(prospects.map((p) => p.source_event).filter(Boolean))
  ) as string[];

  const filtered = prospects
    .filter(
      (p) =>
        (statusFilter === 'all' || p.prospecting_status === statusFilter) &&
        (sourceFilter === 'all' || p.source_event === sourceFilter) &&
        (priorityFilter === 'all' || (priorityFilter === 'none' ? !p.priority : p.priority === priorityFilter))
    )
    .sort((a, b) => {
      const oa = a.priority ? (PRIORITY_SORT_ORDER[a.priority] ?? 3) : 3;
      const ob = b.priority ? (PRIORITY_SORT_ORDER[b.priority] ?? 3) : 3;
      return oa - ob;
    });

  const handlePriorityToggle = useCallback((id: string, currentPriority: string | null) => {
    const idx = PRIORITY_CYCLE.indexOf(currentPriority);
    const next = PRIORITY_CYCLE[(idx + 1) % PRIORITY_CYCLE.length];
    updateMutation.mutate({ id, teamId, priority: next });
  }, [updateMutation, teamId]);

  const handleStatusChange = (id: string, status: ProspectingStatus) => {
    updateMutation.mutate({ id, teamId, prospecting_status: status });
  };

  const handleSaveNotes = (id: string) => {
    updateMutation.mutate(
      { id, teamId, prospecting_notes: notesText || null },
      { onSuccess: () => setEditingNotes(null) }
    );
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id, teamId });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (prospects.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <UserPlus className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p>Brak osób na liście prospecting</p>
        <p className="text-sm">Zaimportuj listę uczestników, aby rozpocząć</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtruj status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie ({prospects.length})</SelectItem>
            {Object.entries(STATUS_LABELS).filter(([k]) => k !== 'converted').map(([key, label]) => {
              const count = prospects.filter((p) => p.prospecting_status === key).length;
              return (
                <SelectItem key={key} value={key}>
                  {label} ({count})
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtruj priorytet" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie priorytety</SelectItem>
            <SelectItem value="high">🔴 Ważne</SelectItem>
            <SelectItem value="medium">🟡 Średnie</SelectItem>
            <SelectItem value="low">🟢 Mniej ważne</SelectItem>
            <SelectItem value="none">⚪ Bez znacznika</SelectItem>
          </SelectContent>
        </Select>

        {uniqueSources.length > 0 && (
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filtruj źródło" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie źródła</SelectItem>
              {uniqueSources.map((src) => {
                const count = prospects.filter((p) => p.source_event === src).length;
                return (
                  <SelectItem key={src} value={src}>
                    {src} ({count})
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map((prospect) => (
          <div
            key={prospect.id}
            className="border rounded-lg p-4 hover:border-primary/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                   <button
                     type="button"
                     title={prospect.priority ? PRIORITY_LABELS[prospect.priority] : 'Ustaw priorytet'}
                     className="shrink-0 cursor-pointer hover:scale-125 transition-transform"
                     onClick={() => handlePriorityToggle(prospect.id, prospect.priority)}
                   >
                     <Circle className={`h-3.5 w-3.5 ${prospect.priority ? PRIORITY_COLORS[prospect.priority] : 'text-muted-foreground/30'}`} />
                   </button>
                   <span className="font-medium">{prospect.full_name}</span>
                  <Badge
                    variant="secondary"
                    className={STATUS_COLORS[prospect.prospecting_status]}
                  >
                    {STATUS_LABELS[prospect.prospecting_status]}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
                  {prospect.company && <span>{prospect.company}</span>}
                  {prospect.position && <span>• {prospect.position}</span>}
                  {prospect.industry && <span>• {prospect.industry}</span>}
                </div>
                {prospect.source_event && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Źródło: {prospect.source_event}
                  </p>
                )}

                {/* Notes */}
                {editingNotes === prospect.id ? (
                  <div className="mt-2 space-y-2">
                    <Textarea
                      value={notesText}
                      onChange={(e) => setNotesText(e.target.value)}
                      placeholder="Notatki..."
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSaveNotes(prospect.id)}>
                        Zapisz
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingNotes(null)}
                      >
                        Anuluj
                      </Button>
                    </div>
                  </div>
                ) : prospect.prospecting_notes ? (
                  <p
                    className="text-sm mt-2 text-muted-foreground bg-muted/50 p-2 rounded cursor-pointer"
                    onClick={() => {
                      setEditingNotes(prospect.id);
                      setNotesText(prospect.prospecting_notes || '');
                    }}
                  >
                    {prospect.prospecting_notes}
                  </p>
                ) : null}

                {/* AI Brief indicator */}
                {prospect.ai_brief && (
                  <button
                    type="button"
                    className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:underline cursor-pointer"
                    onClick={() => setBriefProspect(prospect.id)}
                  >
                    <Sparkles className="h-3 w-3" />
                    Zobacz brief AI
                  </button>
                )}
              </div>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      briefMutation.mutate({ prospectId: prospect.id, teamId });
                    }}
                    disabled={briefMutation.isPending}
                  >
                    {briefMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    {prospect.ai_brief ? 'Odśwież brief AI' : 'Analiza AI'}
                  </DropdownMenuItem>

                  {prospect.ai_brief && (
                    <DropdownMenuItem onClick={() => setBriefProspect(prospect.id)}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Zobacz brief
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() => {
                      setEditingNotes(prospect.id);
                      setNotesText(prospect.prospecting_notes || '');
                    }}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    {prospect.prospecting_notes ? 'Edytuj notatkę' : 'Dodaj notatkę'}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  {(['high', 'medium', 'low'] as const).map((p) => (
                    <DropdownMenuItem
                      key={p}
                      onClick={() => updateMutation.mutate({ id: prospect.id, teamId, priority: prospect.priority === p ? null : p })}
                    >
                      <Circle className={`h-3.5 w-3.5 mr-2 ${PRIORITY_COLORS[p]}`} />
                      {PRIORITY_LABELS[p]} {prospect.priority === p && '✓'}
                    </DropdownMenuItem>
                  ))}

                  <DropdownMenuSeparator />

                  {(['new', 'contacted', 'interested', 'not_interested'] as ProspectingStatus[])
                    .filter((s) => s !== prospect.prospecting_status)
                    .map((status) => (
                      <DropdownMenuItem
                        key={status}
                        onClick={() => handleStatusChange(prospect.id, status)}
                      >
                        → {STATUS_LABELS[status]}
                      </DropdownMenuItem>
                    ))}

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={() => setConvertProspect(prospect.id)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Konwertuj na kontakt
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleDelete(prospect.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Usuń
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>

      {/* Convert Dialog */}
      {convertProspect && (
        <ProspectingConvertDialog
          open={!!convertProspect}
          onOpenChange={(val) => !val && setConvertProspect(null)}
          prospectId={convertProspect}
          teamId={teamId}
          prospect={prospects.find((p) => p.id === convertProspect)!}
        />
      )}

      {/* AI Brief Dialog */}
      {briefProspect && (() => {
        const p = prospects.find((pr) => pr.id === briefProspect);
        if (!p?.ai_brief) return null;
        return (
          <ProspectAIBriefDialog
            open={!!briefProspect}
            onOpenChange={(val) => !val && setBriefProspect(null)}
            prospectName={p.full_name}
            company={p.company}
            brief={p.ai_brief}
            generatedAt={p.ai_brief_generated_at}
            onRegenerate={() => briefMutation.mutate({ prospectId: p.id, teamId })}
            isRegenerating={briefMutation.isPending}
          />
        );
      })()}
    </div>
  );
}
