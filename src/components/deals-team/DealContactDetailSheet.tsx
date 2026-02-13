import { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { pl } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  ExternalLink, Trash2, Calendar, CheckSquare, Plus,
  Clock, AlertTriangle, MessageSquare, History, ChevronDown,
  Sparkles, RefreshCw, ArrowLeftRight, Loader2, ArrowRight, UserCheck, Moon
} from 'lucide-react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useChangeContactStatus, useRemoveContactFromTeam, useUpdateTeamContact, useGenerateDealContactBrief, useRevertToProspecting } from '@/hooks/useDealsTeamContacts';
import { useConvertToClient } from '@/hooks/useTeamClients';
import { ClientProductsPanel } from './ClientProductsPanel';
import { useContactActivityLog } from '@/hooks/useContactActivityLog';
import { useTeamContactWeeklyStatuses } from '@/hooks/useTeamContactWeeklyStatuses';
import { useContactTasksWithCross, useUpdateTask } from '@/hooks/useTasks';
import { WeeklyStatusForm } from './WeeklyStatusForm';
import { ProspectAIBriefDialog } from './ProspectAIBriefDialog';
import { PromoteDialog } from './PromoteDialog';
import { SnoozeDialog } from './SnoozeDialog';
import { ConvertToClientDialog } from './ConvertToClientDialog';
import { TaskModal } from '@/components/tasks/TaskModal';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';
import type { DealTeamContact, DealContactStatus, DealCategory } from '@/types/dealTeam';
import type { TaskWithDetails } from '@/hooks/useTasks';
import { isPast, isToday } from 'date-fns';

interface DealContactDetailSheetProps {
  contact: DealTeamContact | null;
  teamId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categoryConfig: Record<string, { label: string; icon: string; color: string }> = {
  hot: { label: 'HOT', icon: '🔥', color: 'bg-red-100 text-red-800' },
  top: { label: 'TOP', icon: '⭐', color: 'bg-amber-100 text-amber-800' },
  lead: { label: 'LEAD', icon: '📋', color: 'bg-blue-100 text-blue-800' },
  cold: { label: 'COLD', icon: '❄️', color: 'bg-slate-100 text-slate-800' },
  client: { label: 'KLIENT', icon: '✅', color: 'bg-emerald-100 text-emerald-800' },
};

const statusLabels: Record<DealContactStatus, string> = {
  active: 'Aktywny',
  on_hold: 'Wstrzymany',
  won: 'Wygrany',
  lost: 'Przegrany',
  disqualified: 'Zdyskwalifikowany',
};

const actionLabels: Record<string, string> = {
  category_changed: 'Zmiana kategorii',
  status_changed: 'Zmiana statusu',
  assigned: 'Przypisanie',
  meeting_scheduled: 'Spotkanie zaplanowane',
  weekly_status: 'Status tygodniowy',
  note_added: 'Dodano notatkę',
  assignment_created: 'Zadanie utworzone',
  assignment_completed: 'Zadanie wykonane',
  contact_added: 'Dodano kontakt',
  contact_removed: 'Usunięto kontakt',
  prospect_converted: 'Konwersja prospekta',
  prospect_created: 'Prospekt utworzony',
};

export function DealContactDetailSheet({ contact, teamId, open, onOpenChange }: DealContactDetailSheetProps) {
  const changeStatus = useChangeContactStatus();
  const removeContact = useRemoveContactFromTeam();
  const updateContact = useUpdateTeamContact();
  const updateTask = useUpdateTask();
  const generateBrief = useGenerateDealContactBrief();
  const revertToProspecting = useRevertToProspecting();
  const convertToClient = useConvertToClient();

  const { data: activityLog = [] } = useContactActivityLog(contact?.id);
  const { data: weeklyStatuses = [] } = useTeamContactWeeklyStatuses(contact?.id);
  const { data: tasks = [] } = useContactTasksWithCross(contact?.contact_id);

  const [notes, setNotes] = useState('');
  const [showWeeklyForm, setShowWeeklyForm] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [briefDialogOpen, setBriefDialogOpen] = useState(false);
  const [promoteTarget, setPromoteTarget] = useState<'lead' | 'top' | 'hot' | null>(null);
  const [snoozeDialogOpen, setSnoozeDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync notes from contact
  useEffect(() => {
    setNotes(contact?.notes || '');
  }, [contact?.id, contact?.notes]);

  const handleNotesChange = useCallback(
    (value: string) => {
      setNotes(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (contact) {
          // Save to deal_team_contacts (legacy)
          updateContact.mutate({
            id: contact.id,
            teamId,
            notes: value || null,
          });
          // Also sync to contacts.notes (single source of truth for AI)
          if (contact.contact_id) {
            supabase
              .from('contacts')
              .update({ notes: value || null })
              .eq('id', contact.contact_id)
              .then(({ error }) => {
                if (error) console.error('Failed to sync notes to contacts:', error);
              });
          }
        }
      }, 1000);
    },
    [contact, teamId, updateContact]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if (!contact || !contact.contact) return null;

  const cat = categoryConfig[contact.category] || categoryConfig.lead;
  const openTasks = tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled');
  const completedTasks = tasks.filter((t) => t.status === 'completed' || t.status === 'cancelled');
  const visibleActivity = showAllActivity ? activityLog : activityLog.slice(0, 5);

  const handleStatusChange = (newStatus: string) => {
    changeStatus.mutate({
      id: contact.id,
      teamId,
      status: newStatus as DealContactStatus,
    });
  };

  const handleRemove = () => {
    removeContact.mutate({ contactId: contact.id, teamId });
    onOpenChange(false);
  };

  const handleRevert = () => {
    revertToProspecting.mutate({ dealContactId: contact.id, teamId, contactId: contact.contact_id });
    onOpenChange(false);
  };

  const handleGenerateBrief = () => {
    generateBrief.mutate({ dealContactId: contact.id, teamId });
  };

  const handleToggleTask = (taskId: string, currentStatus: string) => {
    updateTask.mutate({
      id: taskId,
      status: currentStatus === 'completed' ? 'pending' : 'completed',
    });
  };

  const getDueDateClass = (dueDate: string | null) => {
    if (!dueDate) return '';
    const date = new Date(dueDate);
    if (isPast(date) && !isToday(date)) return 'text-destructive';
    if (isToday(date)) return 'text-amber-600';
    return 'text-muted-foreground';
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-lg truncate">
                  {contact.contact.full_name}
                </SheetTitle>
                <SheetDescription className="mt-0.5">
                  {contact.contact.company && (
                    <span className="block text-sm truncate">{contact.contact.company}</span>
                  )}
                  {contact.contact.position && (
                    <span className="block text-xs truncate">{contact.contact.position}</span>
                  )}
                </SheetDescription>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge className={cn('text-xs', cat.color)}>
                  {cat.icon} {cat.label}
                </Badge>
              </div>
            </div>
            <Link
              to={`/contacts/${contact.contact_id}`}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
              onClick={() => onOpenChange(false)}
            >
              <ExternalLink className="h-3 w-3" />
              Otwórz profil CRM
            </Link>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="px-6 py-4 space-y-5">
              {/* Status change */}
              <section>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Status</h4>
                <Select value={contact.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </section>

              <Separator />

              {/* Category change - hidden for clients */}
              {contact.category !== 'client' && (
                <>
                  <section>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
                      <ArrowRight className="h-3.5 w-3.5" />
                      Kategoria
                    </h4>
                    <div className="flex gap-1.5">
                      {(['hot', 'top', 'lead', 'cold'] as const).map((cat) => {
                        const cfg = categoryConfig[cat];
                        const isCurrent = contact.category === cat;
                        return (
                          <Button
                            key={cat}
                            variant={isCurrent ? 'default' : 'outline'}
                            size="sm"
                            className={cn('flex-1 text-xs h-8', isCurrent && 'pointer-events-none')}
                            disabled={isCurrent}
                            onClick={() => {
                              if (cat === 'top' || cat === 'hot') {
                                setPromoteTarget(cat);
                              } else {
                                updateContact.mutate({
                                  id: contact.id,
                                  teamId,
                                  category: cat as DealCategory,
                                });
                              }
                            }}
                          >
                            {cfg.icon} {cfg.label}
                          </Button>
                        );
                      })}
                    </div>
                  </section>

                  <Separator />
                </>
              )}

              {/* Notes */}
              <section>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Notatki
                </h4>
                <Textarea
                  value={notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  placeholder="Dodaj notatki..."
                  className="min-h-[80px] text-sm resize-none"
                />
              </section>

              <Separator />

              {/* Brief AI */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Brief AI
                  </h4>
                  {contact.ai_brief ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={handleGenerateBrief}
                      disabled={generateBrief.isPending}
                    >
                      <RefreshCw className={cn('h-3 w-3 mr-1', generateBrief.isPending && 'animate-spin')} />
                      Odśwież
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={handleGenerateBrief}
                      disabled={generateBrief.isPending}
                    >
                      {generateBrief.isPending ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3 mr-1" />
                      )}
                      {generateBrief.isPending ? 'Generuję...' : 'Generuj'}
                    </Button>
                  )}
                </div>
                {contact.ai_brief ? (
                  <div
                    className="bg-muted/50 rounded p-3 text-xs cursor-pointer hover:bg-muted/70 transition-colors"
                    onClick={() => setBriefDialogOpen(true)}
                  >
                    <p className="line-clamp-4 whitespace-pre-wrap">{contact.ai_brief.substring(0, 300)}...</p>
                    {contact.ai_brief_generated_at && (
                      <p className="text-muted-foreground mt-1.5 text-[10px]">
                        Wygenerowano: {format(new Date(contact.ai_brief_generated_at), 'd MMM yyyy, HH:mm', { locale: pl })}
                      </p>
                    )}
                    <p className="text-primary mt-1 text-[10px]">Kliknij aby otworzyć pełny brief →</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {generateBrief.isPending
                      ? 'Trwa generowanie briefu AI...'
                      : 'Brak briefu. Kliknij "Generuj" aby przygotować brief do rozmowy.'}
                  </p>
                )}
              </section>

              <Separator />

              {contact.category === 'client' ? (
                /* Rozliczenie section for clients */
                <section>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Rozliczenie
                  </h4>
                  <div className="flex gap-1.5">
                    {([
                      { value: 'monthly', label: 'Miesięczne' },
                      { value: 'quarterly', label: 'Kwartalne' },
                      { value: 'semi_annual', label: 'Półroczne' },
                      { value: 'annual', label: 'Roczne' },
                    ] as const).map((opt) => {
                      const isCurrent = (contact.review_frequency || 'quarterly') === opt.value;
                      return (
                        <Button
                          key={opt.value}
                          variant={isCurrent ? 'default' : 'outline'}
                          size="sm"
                          className={cn('flex-1 text-xs h-8', isCurrent && 'pointer-events-none')}
                          disabled={isCurrent}
                          onClick={() => {
                            updateContact.mutate({
                              id: contact.id,
                              teamId,
                              reviewFrequency: opt.value,
                            });
                          }}
                        >
                          {opt.label}
                        </Button>
                      );
                    })}
                  </div>
                </section>
              ) : (
                /* Weekly Status for non-clients */
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      Statusy tygodniowe
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setShowWeeklyForm(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Dodaj
                    </Button>
                  </div>
                  {contact.status_overdue && (
                    <div className="flex items-center gap-1.5 text-xs text-destructive mb-2 bg-destructive/10 rounded p-2">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Status przeterminowany
                    </div>
                  )}
                  {weeklyStatuses.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Brak statusów</p>
                  ) : (
                    <div className="space-y-2">
                      {weeklyStatuses.slice(0, 5).map((ws) => (
                        <div key={ws.id} className="bg-muted/50 rounded p-2.5 text-xs space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">
                              Tydzień {format(new Date(ws.week_start), 'dd.MM', { locale: pl })}
                            </span>
                            <span className="text-muted-foreground">
                              {ws.reporter?.full_name}
                            </span>
                          </div>
                          <p>{ws.status_summary}</p>
                          {ws.next_steps && (
                            <p className="text-muted-foreground">→ {ws.next_steps}</p>
                          )}
                          {ws.blockers && (
                            <p className="text-destructive">⚠ {ws.blockers}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              <Separator />

              {/* Tasks */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                    <CheckSquare className="h-3.5 w-3.5" />
                    Zadania
                    {openTasks.length > 0 && (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0 ml-1">
                        {openTasks.length}
                      </Badge>
                    )}
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setTaskModalOpen(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Nowe
                  </Button>
                </div>
                {openTasks.length === 0 && completedTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Brak zadań</p>
                ) : (
                  <div className="space-y-1">
                    {openTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-start gap-2 py-1 cursor-pointer hover:bg-muted/50 rounded px-1.5 -mx-1"
                        onClick={() => {
                          setSelectedTask(task);
                          setTaskDetailOpen(true);
                        }}
                      >
                        <Checkbox
                          checked={false}
                          onCheckedChange={() => handleToggleTask(task.id, task.status)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-0.5 h-3.5 w-3.5"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{task.title}</p>
                          {task.due_date && (
                            <div className={cn('flex items-center gap-1 text-xs', getDueDateClass(task.due_date))}>
                              <Clock className="h-2.5 w-2.5" />
                              <span>{format(new Date(task.due_date), 'dd MMM', { locale: pl })}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {completedTasks.length > 0 && (
                      <Collapsible open={showCompletedTasks} onOpenChange={setShowCompletedTasks}>
                        <CollapsibleTrigger asChild>
                          <button className="text-xs text-muted-foreground hover:text-foreground w-full text-left pt-1.5 border-t mt-1.5">
                            Zamknięte ({completedTasks.length})
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-1 mt-1">
                          {completedTasks.map((task) => (
                            <div
                              key={task.id}
                              className="flex items-start gap-2 py-1 opacity-60 cursor-pointer hover:opacity-80 rounded px-1.5 -mx-1"
                              onClick={() => {
                                setSelectedTask(task);
                                setTaskDetailOpen(true);
                              }}
                            >
                              <Checkbox
                                checked={true}
                                onCheckedChange={() => handleToggleTask(task.id, task.status)}
                                onClick={(e) => e.stopPropagation()}
                                className="mt-0.5 h-3.5 w-3.5"
                              />
                              <p className="text-xs line-through truncate">{task.title}</p>
                            </div>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                )}
              </section>

              <Separator />

              {/* Activity log */}
              <section>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5" />
                  Historia aktywności
                </h4>
                {activityLog.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Brak wpisów</p>
                ) : (
                  <div className="space-y-2">
                    {visibleActivity.map((entry) => (
                      <div key={entry.id} className="text-xs flex gap-2">
                        <div className="w-1 bg-muted-foreground/20 rounded-full shrink-0 mt-1" style={{ minHeight: 16 }} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">
                              {actionLabels[entry.action] || entry.action}
                            </span>
                            <span className="text-muted-foreground">
                              {entry.created_at &&
                                formatDistanceToNow(new Date(entry.created_at), {
                                  addSuffix: true,
                                  locale: pl,
                                })}
                            </span>
                          </div>
                          {entry.note && (
                            <p className="text-muted-foreground truncate">{entry.note}</p>
                          )}
                          <p className="text-muted-foreground">{entry.actor?.full_name}</p>
                        </div>
                      </div>
                    ))}
                    {activityLog.length > 5 && !showAllActivity && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-full text-xs"
                        onClick={() => setShowAllActivity(true)}
                      >
                        <ChevronDown className="h-3 w-3 mr-1" />
                        Pokaż więcej ({activityLog.length - 5})
                      </Button>
                    )}
                  </div>
                )}
              </section>

              <Separator />

              {/* Products / Deals */}
              <ClientProductsPanel
                teamContactId={contact.id}
                teamId={teamId}
                category={contact.category}
              />

              <Separator />

              {/* Actions */}
              <section className="pb-4 space-y-2">
                {/* Snooze */}
                {contact.category !== 'client' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setSnoozeDialogOpen(true)}
                  >
                    <Moon className="h-3.5 w-3.5 mr-1.5" />
                    {contact.snoozed_until ? `Odłożony do ${contact.snoozed_until}` : 'Odłóż kontakt'}
                  </Button>
                )}
              {/* Convert to Client */}
                {contact.category !== 'client' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => setConvertDialogOpen(true)}
                    disabled={convertToClient.isPending}
                  >
                    <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                    Konwertuj do klienta
                  </Button>
                )}
                {/* Revert to Prospecting */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full text-xs">
                      <ArrowLeftRight className="h-3.5 w-3.5 mr-1.5" />
                      Cofnij na listę Prospecting
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cofnij na listę Prospecting</AlertDialogTitle>
                      <AlertDialogDescription>
                        Czy na pewno chcesz cofnąć {contact.contact.full_name} na listę prospecting?
                        Kontakt zostanie usunięty z tablicy Kanban i utworzony jako nowy prospekt.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Anuluj</AlertDialogCancel>
                      <AlertDialogAction onClick={handleRevert}>
                        Cofnij
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Remove from team */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 text-xs">
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      Usuń z zespołu
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Usuń kontakt z zespołu</AlertDialogTitle>
                      <AlertDialogDescription>
                        Czy na pewno chcesz usunąć {contact.contact.full_name} z tego zespołu? Kontakt
                        pozostanie w CRM, ale zostanie usunięty z tablicy Kanban wraz z historią statusów.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Anuluj</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleRemove}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Usuń
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </section>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Weekly Status Form */}
      <WeeklyStatusForm
        teamContactId={contact.id}
        teamId={teamId}
        contactName={contact.contact.full_name}
        contactCompany={contact.contact.company}
        currentCategory={contact.category}
        open={showWeeklyForm}
        onClose={() => setShowWeeklyForm(false)}
      />

      {/* Convert to Client Dialog */}
      <ConvertToClientDialog
        open={convertDialogOpen}
        onOpenChange={setConvertDialogOpen}
        teamContactId={contact.id}
        teamId={teamId}
        contactName={contact.contact.full_name}
      />

      {/* Task Modal */}
      <TaskModal
        open={taskModalOpen}
        onOpenChange={setTaskModalOpen}
        preselectedContactId={contact.contact_id}
      />

      {/* Task Detail */}
      {selectedTask && (
        <TaskDetailSheet
          open={taskDetailOpen}
          onOpenChange={setTaskDetailOpen}
          task={selectedTask}
          onEdit={() => {
            setTaskDetailOpen(false);
            setTaskModalOpen(true);
          }}
        />
      )}

      {/* Brief AI Dialog */}
      {contact.ai_brief && (
        <ProspectAIBriefDialog
          open={briefDialogOpen}
          onOpenChange={setBriefDialogOpen}
          prospectName={contact.contact.full_name}
          company={contact.contact.company}
          brief={contact.ai_brief}
          generatedAt={contact.ai_brief_generated_at}
          onRegenerate={handleGenerateBrief}
          isRegenerating={generateBrief.isPending}
        />
      )}

      {/* Promote Dialog for category change */}
      {promoteTarget && (
        <PromoteDialog
          contact={contact}
          targetCategory={promoteTarget}
          teamId={teamId}
          open={!!promoteTarget}
          onClose={() => setPromoteTarget(null)}
        />
      )}

      {/* Snooze Dialog */}
      <SnoozeDialog
        open={snoozeDialogOpen}
        onOpenChange={setSnoozeDialogOpen}
        contactName={contact.contact.full_name}
        onSnooze={async (until, reason) => {
          const { error } = await supabase
            .from('deal_team_contacts')
            .update({
              snoozed_until: until,
              snooze_reason: reason || null,
              snoozed_from_category: contact.category,
            } as any)
            .eq('id', contact.id);
          if (error) {
            toast.error('Błąd odkładania kontaktu');
          } else {
            toast.success('Kontakt odłożony');
            onOpenChange(false);
          }
          setSnoozeDialogOpen(false);
        }}
      />
    </>
  );
}
