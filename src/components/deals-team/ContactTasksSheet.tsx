import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  ExternalLink, Plus, CheckSquare, User, Building2, StickyNote,
  Mail, Phone, MapPin, Calendar as CalendarIcon, Target, BarChart3, History, Loader2,
  AlertCircle, CheckCircle2, ChevronRight, PhoneCall, FileText, Send, Trash2,
} from 'lucide-react';
import { NextActionDialog } from './NextActionDialog';
import { SnoozeDialog } from './SnoozeDialog';
import { ConvertToClientDialog } from './ConvertToClientDialog';
import { ContactActionButtons } from './ContactActionButtons';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { UnifiedTaskRow } from '@/components/tasks/UnifiedTaskRow';
import { ContactKnowledgeTimeline } from '@/components/contacts/ContactKnowledgeTimeline';
import { WeeklyStatusForm } from '@/components/deals-team/WeeklyStatusForm';
import { useDealContactAllTasks } from '@/hooks/useDealsTeamAssignments';
import { useUpdateTask, useCreateTask } from '@/hooks/useTasks';
import { toast } from 'sonner';
import { useUpdateTeamContact, useRemoveContactFromTeam } from '@/hooks/useDealsTeamContacts';
import { useTeamContactWeeklyStatuses } from '@/hooks/useTeamContactWeeklyStatuses';
import { useTeamMembers } from '@/hooks/useDealsTeamMembers';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { DealTeamContact } from '@/types/dealTeam';
import type { TaskWithDetails } from '@/hooks/useTasks';

interface ContactTasksSheetProps {
  contact: DealTeamContact | null;
  teamId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskOpen?: (task: TaskWithDetails) => void;
}

const categoryLabels: Record<string, string> = {
  hot: 'Hot', top: 'Top', lead: 'Lead', '10x': '10x', cold: 'Cold',
  offering: 'Oferta', client: 'Klient', lost: 'Lost', audit: 'Audyt',
};

const statusLabels: Record<string, string> = {
  active: 'Aktywny', on_hold: 'Wstrzymany', won: 'Wygrany', lost: 'Przegrany', disqualified: 'Zdyskwalifikowany',
};

const priorityLabels: Record<string, string> = {
  low: 'Niski', medium: 'Średni', high: 'Wysoki', urgent: 'Pilny',
};

const subStageLabels: Record<string, string> = {
  handshake: 'Handshake', power_of_attorney: 'Pełnomocnictwo', preparation: 'Przygotowanie',
  negotiation: 'Negocjacje', accepted: 'Zaakceptowano', lost: 'Przegrano',
  audit_plan: 'Do zaplanowania', audit_scheduled: 'Zaplanowany', audit_done: 'Odbyty',
  meeting_plan: 'Zaplanować spotkanie', meeting_scheduled: 'Spotkanie umówione', meeting_done: 'Spotkanie odbyte',
};

const CATEGORIES_WITH_SUBSTAGES = new Set(['offering', 'audit', 'hot', 'top']);

function InfoRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="truncate">{value}</span>
    </div>
  );
}

export function ContactTasksSheet({ contact, teamId, open, onOpenChange, onTaskOpen }: ContactTasksSheetProps) {
  const { data: tasks = [], isLoading } = useDealContactAllTasks(contact?.contact_id, contact?.id);
  const { data: weeklyStatuses = [], isLoading: statusesLoading } = useTeamContactWeeklyStatuses(contact?.id);
  const { data: teamMembers = [] } = useTeamMembers(teamId);
  const { director } = useAuth();
  const updateTask = useUpdateTask();
  const updateContact = useUpdateTeamContact();
  const removeFromTeam = useRemoveContactFromTeam();
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const createTask = useCreateTask();
  const [showCompleted, setShowCompleted] = useState(false);
  const [notesValue, setNotesValue] = useState<string | null>(null);
  const [showStatusForm, setShowStatusForm] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const customInputRef = useRef<HTMLInputElement>(null);
  const [assignTo, setAssignTo] = useState<string>(director?.id || '');
  const [taskDueDate, setTaskDueDate] = useState<Date | undefined>(undefined);

  // Workflow dialog states
  const [nextActionOpen, setNextActionOpen] = useState(false);
  const [pendingCompleteTaskId, setPendingCompleteTaskId] = useState<string | null>(null);
  const [pendingCompleteTaskTitle, setPendingCompleteTaskTitle] = useState<string>('');
  const [showSnooze, setShowSnooze] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  // Reset assignTo when director changes
  useEffect(() => {
    if (director?.id && !assignTo) setAssignTo(director.id);
  }, [director?.id]);

  const openTasks = useMemo(() => tasks.filter((t: any) => t.status !== 'completed' && t.status !== 'cancelled'), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((t: any) => t.status === 'completed' || t.status === 'cancelled'), [tasks]);

  // Reset notes when contact changes
  const currentNotes = notesValue ?? contact?.notes ?? '';

  // Every task completion in the pipeline opens NextActionDialog (continuous loop)
  const handleTaskStatusChange = useCallback((taskId: string, newStatus: string) => {
    if (newStatus === 'completed' && contact) {
      const task = tasks.find((t: any) => t.id === taskId);
      if (task) {
        // Don't actually mark as completed yet — NextActionDialog will recycle it
        setPendingCompleteTaskId(taskId);
        setPendingCompleteTaskTitle(task.title);
        setNextActionOpen(true);
        return;
      }
    }
    updateTask.mutate({ id: taskId, status: newStatus });
  }, [contact, tasks, updateTask]);

  if (!contact || !contact.contact) return null;

  const c = contact.contact;

  const handleNotesBlur = () => {
    const newVal = notesValue ?? '';
    if (newVal !== (contact.notes ?? '')) {
      updateContact.mutate({ id: contact.id, teamId, notes: newVal || null });
    }
  };

  const handleTaskClick = (taskId: string) => {
    const t = tasks.find((x: any) => x.id === taskId);
    if (t && onTaskOpen) {
      onOpenChange(false);
      setTimeout(() => onTaskOpen(t), 150);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-3 border-b">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <SheetTitle className="text-lg truncate">{c.full_name}</SheetTitle>
                <SheetDescription asChild>
                  <div>
                    {c.company && <span className="block text-sm truncate">{c.company}</span>}
                    {c.position && <span className="block text-xs text-muted-foreground truncate">{c.position}</span>}
                    <Link
                      to={`/contacts/${contact.contact_id}`}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                      onClick={() => onOpenChange(false)}
                    >
                      <ExternalLink className="h-3 w-3" />
                      Otwórz profil CRM
                    </Link>
                  </div>
                </SheetDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => setShowRemoveConfirm(true)}
                title="Usuń z lejka"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </SheetHeader>

          <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
            <div className="px-6 pt-2">
              <TabsList className="w-full">
                <TabsTrigger value="overview" className="flex-1 text-xs gap-1">
                  <User className="h-3 w-3" /> Przegląd
                </TabsTrigger>
                <TabsTrigger value="tasks" className="flex-1 text-xs gap-1">
                  <CheckSquare className="h-3 w-3" /> Zadania
                  {openTasks.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 ml-0.5">{openTasks.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="history" className="flex-1 text-xs gap-1">
                  <History className="h-3 w-3" /> Historia
                </TabsTrigger>
                <TabsTrigger value="statuses" className="flex-1 text-xs gap-1">
                  <BarChart3 className="h-3 w-3" /> Statusy
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ===== TAB: OVERVIEW ===== */}
            <TabsContent value="overview" className="flex-1 min-h-0 mt-0">
              <ScrollArea className="h-full">
                <div className="px-6 py-4 space-y-5">
                  {/* Akcje — zawsze widoczne, niezależnie od zadań */}
                  <section>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5" /> Akcje
                    </h4>
                    <ContactActionButtons
                      contact={contact}
                      teamId={teamId}
                      onSnooze={() => setShowSnooze(true)}
                      onConvertToClient={() => setShowConvert(true)}
                    />
                  </section>

                  {/* Osoba */}
                  <section>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" /> Osoba
                    </h4>
                    <div className="space-y-1.5">
                      <InfoRow icon={Mail} label="Email" value={c.email} />
                      <InfoRow icon={Phone} label="Telefon" value={c.phone} />
                      <InfoRow icon={MapPin} label="Miasto" value={c.city} />
                    </div>
                  </section>

                  {/* Firma */}
                  {c.company && (
                    <section>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" /> Firma
                      </h4>
                      <div className="text-sm">
                        {c.company_id ? (
                          <Link
                            to={`/companies/${c.company_id}`}
                            className="text-primary hover:underline"
                            onClick={() => onOpenChange(false)}
                          >
                            {c.company}
                          </Link>
                        ) : (
                          c.company
                        )}
                      </div>
                    </section>
                  )}

                  {/* Status w lejku */}
                  <section>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5" /> Status w lejku
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline">{categoryLabels[contact.category] || contact.category}</Badge>
                      <Badge variant="secondary">{statusLabels[contact.status] || contact.status}</Badge>
                      <Badge variant="secondary">{priorityLabels[contact.priority] || contact.priority}</Badge>
                      {contact.offering_stage && CATEGORIES_WITH_SUBSTAGES.has(contact.category) && (
                        <Badge variant="secondary">{subStageLabels[contact.offering_stage] || contact.offering_stage}</Badge>
                      )}
                    </div>
                    {contact.estimated_value != null && contact.estimated_value > 0 && (
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Wartość: {contact.estimated_value.toLocaleString('pl-PL')} {contact.value_currency}
                      </p>
                    )}
                    {contact.assigned_director && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Opiekun: {contact.assigned_director.full_name}
                      </p>
                    )}
                  </section>

                  {/* Uwagi */}
                  <section>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
                      <StickyNote className="h-3.5 w-3.5" /> Uwagi
                    </h4>
                    <Textarea
                      className="text-sm min-h-[80px] resize-none"
                      placeholder="Dodaj notatki..."
                      value={currentNotes}
                      onChange={(e) => setNotesValue(e.target.value)}
                      onBlur={handleNotesBlur}
                    />
                  </section>

                  {/* Następna akcja */}
                  {(contact.next_action || contact.next_action_date) && (
                    <section>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
                        <Target className="h-3.5 w-3.5" /> Następna akcja
                      </h4>
                      {contact.next_action && <p className="text-sm">{contact.next_action}</p>}
                      {contact.next_action_date && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Termin: {(() => { try { return format(new Date(contact.next_action_date), 'd MMM yyyy', { locale: pl }); } catch { return contact.next_action_date; } })()}
                        </p>
                      )}
                    </section>
                  )}

                  {/* Następne spotkanie */}
                  {contact.next_meeting_date && (
                    <section>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
                        <CalendarIcon className="h-3.5 w-3.5" /> Następne spotkanie
                      </h4>
                      <p className="text-sm">
                        {(() => { try { return format(new Date(contact.next_meeting_date), 'd MMM yyyy', { locale: pl }); } catch { return contact.next_meeting_date; } })()}
                      </p>
                    </section>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ===== TAB: TASKS ===== */}
            <TabsContent value="tasks" className="flex-1 min-h-0 mt-0">
              <ScrollArea className="h-full">
                <div className="px-6 py-4">
                  <div className="mb-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                        <CheckSquare className="h-3.5 w-3.5" />
                        Zadania
                        {openTasks.length > 0 && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0 ml-1">{openTasks.length}</Badge>
                        )}
                      </h4>
                    </div>
                    {/* Assignee + Due date controls */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Select value={assignTo} onValueChange={setAssignTo}>
                        <SelectTrigger className="h-7 w-[160px] text-xs">
                          <User className="h-3 w-3 mr-1 shrink-0" />
                          <SelectValue placeholder="Przypisz do..." />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {teamMembers.map((m) => (
                            <SelectItem key={m.director_id} value={m.director_id} className="text-xs">
                              {m.director?.full_name || 'Nieznany'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn("h-7 px-2 text-xs gap-1 font-normal", !taskDueDate && "text-muted-foreground border-destructive/50")}
                          >
                            <CalendarIcon className="h-3 w-3" />
                            {taskDueDate ? format(taskDueDate, 'd MMM', { locale: pl }) : 'Termin'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-50" align="start">
                          <Calendar
                            mode="single"
                            selected={taskDueDate}
                            onSelect={setTaskDueDate}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                      {taskDueDate && (
                        <Button variant="ghost" size="sm" className="h-7 px-1.5 text-xs text-muted-foreground" onClick={() => setTaskDueDate(undefined)}>
                          ✕
                        </Button>
                      )}
                    </div>
                    {openTasks.length > 0 ? (
                      <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                        Zakończ bieżące zadanie, aby dodać następne działanie.
                      </p>
                    ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { icon: CalendarIcon, label: 'Umów spotkanie', title: `Umówić spotkanie z ${c.full_name}` },
                        { icon: PhoneCall, label: 'Zadzwoń', title: `Zadzwonić do ${c.full_name}` },
                        { icon: FileText, label: 'Wyślij ofertę', title: `Wysłać ofertę do ${c.full_name}` },
                        { icon: Send, label: 'Wyślij mail', title: `Wysłać maila do ${c.full_name}` },
                      ].map((tpl) => (
                        <Button
                          key={tpl.label}
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs gap-1"
                          disabled={!taskDueDate || createTask.isPending}
                          onClick={async () => {
                            if (!taskDueDate) { toast.error('Ustaw termin zadania'); return; }
                            try {
                              await createTask.mutateAsync({
                                task: {
                                  title: tpl.title,
                                  status: 'todo',
                                  ...(taskDueDate ? { due_date: taskDueDate.toISOString().split('T')[0] } : {}),
                                },
                                contactId: contact.contact_id,
                                dealTeamId: teamId,
                                dealTeamContactId: contact.id,
                                assignedTo: assignTo || undefined,
                              });
                              // Auto-update offering_stage for "Umów spotkanie" on HOT/TOP contacts
                              if (tpl.label === 'Umów spotkanie' && ['hot', 'top'].includes(contact.category)) {
                                await updateContact.mutateAsync({
                                  id: contact.id,
                                  teamId,
                                  offeringStage: 'meeting_plan',
                                });
                              }
                              toast.success(`Zadanie dodane: ${tpl.title}`);
                            } catch {
                              toast.error('Nie udało się utworzyć zadania');
                            }
                          }}
                        >
                          <tpl.icon className="h-3 w-3" />
                          {tpl.label}
                        </Button>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs gap-1"
                        disabled={!taskDueDate || createTask.isPending}
                        onClick={() => {
                          setShowCustomInput(true);
                          setTimeout(() => customInputRef.current?.focus(), 50);
                        }}
                      >
                        <Plus className="h-3 w-3" />
                        Inne
                      </Button>
                    </div>
                    )}
                    {showCustomInput && (
                      <form
                        className="flex gap-1.5"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const title = customTitle.trim();
                          if (!title) return;
                          if (!taskDueDate) { toast.error('Ustaw termin zadania'); return; }
                          try {
                            await createTask.mutateAsync({
                              task: {
                                title,
                                status: 'todo',
                                ...(taskDueDate ? { due_date: taskDueDate.toISOString().split('T')[0] } : {}),
                              },
                              contactId: contact.contact_id,
                              dealTeamId: teamId,
                              dealTeamContactId: contact.id,
                              assignedTo: assignTo || undefined,
                            });
                            toast.success(`Zadanie dodane: ${title}`);
                            setCustomTitle('');
                            setShowCustomInput(false);
                          } catch {
                            toast.error('Nie udało się utworzyć zadania');
                          }
                        }}
                      >
                        <input
                          ref={customInputRef}
                          className="flex-1 h-7 px-2 text-xs rounded-md border border-input bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          placeholder="Tytuł zadania..."
                          value={customTitle}
                          onChange={(e) => setCustomTitle(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Escape') { setShowCustomInput(false); setCustomTitle(''); } }}
                        />
                        <Button type="submit" size="sm" className="h-7 px-2 text-xs" disabled={!taskDueDate || createTask.isPending || !customTitle.trim()}>
                          {createTask.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Dodaj'}
                        </Button>
                      </form>
                    )}
                  </div>

                  {isLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}
                    </div>
                  ) : openTasks.length === 0 && completedTasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-8 text-center">Brak zadań dla tego kontaktu</p>
                  ) : (
                    <div className="border rounded-md overflow-hidden">
                      {openTasks.map((task: any) => (
                        <UnifiedTaskRow
                          key={task.id}
                          task={task}
                          compact
                          showSubtasks={false}
                          onStatusChange={(taskId, newStatus) => handleTaskStatusChange(taskId, newStatus)}
                          onClick={handleTaskClick}
                        />
                      ))}
                      {completedTasks.length > 0 && (
                        <Collapsible open={showCompleted} onOpenChange={setShowCompleted}>
                          <CollapsibleTrigger asChild>
                            <button className="text-xs text-muted-foreground hover:text-foreground w-full text-left px-3 py-1.5 border-t bg-muted/30 hover:bg-muted/50 transition-colors">
                              Zamknięte ({completedTasks.length})
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            {completedTasks.map((task: any) => (
                              <UnifiedTaskRow
                                key={task.id}
                                task={task}
                                compact
                                showSubtasks={false}
                                onStatusChange={(taskId, newStatus) => handleTaskStatusChange(taskId, newStatus)}
                                onClick={handleTaskClick}
                              />
                            ))}
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ===== TAB: HISTORY ===== */}
            <TabsContent value="history" className="flex-1 min-h-0 mt-0">
              <ScrollArea className="h-full">
                <div className="px-6 py-4">
                  <ContactKnowledgeTimeline contactId={contact.contact_id} />
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ===== TAB: STATUSES ===== */}
            <TabsContent value="statuses" className="flex-1 min-h-0 mt-0">
              <ScrollArea className="h-full">
                <div className="px-6 py-4 space-y-4">
                  {/* Status overdue / add status */}
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                      <BarChart3 className="h-3.5 w-3.5" /> Statusy tygodniowe
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2.5 text-xs gap-1"
                      onClick={() => setShowStatusForm(true)}
                    >
                      <Plus className="h-3 w-3" />
                      Dodaj status
                    </Button>
                  </div>

                  {/* Overdue indicator */}
                  {contact.status_overdue && (
                    <div className="flex items-center gap-2 p-3 rounded-lg border bg-destructive/5 border-destructive/20">
                      <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">Wymaga statusu</p>
                        <p className="text-xs text-muted-foreground">
                          {contact.last_status_update
                            ? `${Math.floor((Date.now() - new Date(contact.last_status_update).getTime()) / (1000 * 60 * 60 * 24))} dni bez statusu`
                            : 'Brak statusów'}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-xs"
                        onClick={() => setShowStatusForm(true)}
                      >
                        Dodaj status
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  )}

                  {/* Submitted statuses */}
                  {statusesLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
                    </div>
                  ) : weeklyStatuses.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-8 text-center">Brak statusów tygodniowych</p>
                  ) : (
                    <div className="space-y-2">
                      {weeklyStatuses.map((ws) => (
                        <div key={ws.id} className="p-3 rounded-lg border bg-muted/30 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                            <span className="text-xs font-medium">
                              {(() => { try { return format(new Date(ws.week_start), 'd MMM yyyy', { locale: pl }); } catch { return ws.week_start; } })()}
                            </span>
                            {ws.category_recommendation && (
                              <Badge variant="outline" className="text-[10px]">{ws.category_recommendation}</Badge>
                            )}
                          </div>
                          <p className="text-sm">"{ws.status_summary}"</p>
                          {ws.next_steps && (
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium">Następne kroki:</span> {ws.next_steps}
                            </p>
                          )}
                          {ws.blockers && (
                            <p className="text-xs text-destructive">
                              <span className="font-medium">Blokery:</span> {ws.blockers}
                            </p>
                          )}
                          {ws.reporter && (
                            <p className="text-xs text-muted-foreground">
                              — {ws.reporter.full_name}
                              {ws.created_at && `, ${format(new Date(ws.created_at), 'd MMM HH:mm', { locale: pl })}`}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Weekly Status Form */}
      {contact && (
        <WeeklyStatusForm
          teamContactId={contact.id}
          teamId={teamId}
          contactId={contact.contact_id}
          contactName={c.full_name}
          contactCompany={c.company}
          currentCategory={contact.category}
          open={showStatusForm}
          onClose={() => setShowStatusForm(false)}
        />
      )}

      {/* Next Action Dialog (continuous loop) */}
      {contact && pendingCompleteTaskId && (
        <NextActionDialog
          open={nextActionOpen}
          onOpenChange={(v) => {
            setNextActionOpen(v);
            if (!v) { setPendingCompleteTaskId(null); setPendingCompleteTaskTitle(''); }
          }}
          contactName={c.full_name}
          contactId={contact.contact_id}
          teamContactId={contact.id}
          teamId={teamId}
          existingTaskId={pendingCompleteTaskId}
          existingTaskTitle={pendingCompleteTaskTitle}
          onConfirm={() => { setPendingCompleteTaskId(null); setPendingCompleteTaskTitle(''); }}
          onSnooze={() => setShowSnooze(true)}
          onConvertToClient={() => setShowConvert(true)}
        />
      )}

      {/* Snooze Dialog */}
      {contact && (
        <SnoozeDialog
          open={showSnooze}
          onOpenChange={setShowSnooze}
          contactName={c.full_name}
          isPending={updateContact.isPending || updateTask.isPending}
          onSnooze={async (until, reason) => {
            try {
              // Mark task as completed
              if (pendingCompleteTaskId) {
                await updateTask.mutateAsync({ id: pendingCompleteTaskId, status: 'completed' });
              }
              // Snooze the contact
              await updateContact.mutateAsync({
                id: contact.id,
                teamId,
                category: '10x' as any,
                snoozedUntil: until,
                snoozeReason: reason || null,
                snoozedFromCategory: contact.category,
              });
              toast.success(`Kontakt odłożony do ${until}`);
              setShowSnooze(false);
              setPendingCompleteTaskId(null);
              setPendingCompleteTaskTitle('');
            } catch {
              toast.error('Nie udało się odłożyć kontaktu');
            }
          }}
        />
      )}

      {/* Convert to Client Dialog */}
      {contact && (
        <ConvertToClientDialog
          open={showConvert}
          onOpenChange={(v) => {
            setShowConvert(v);
            if (!v) { setPendingCompleteTaskId(null); setPendingCompleteTaskTitle(''); }
          }}
          teamContactId={contact.id}
          teamId={teamId}
          contactName={c.full_name}
        />
      )}

      <AlertDialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń z lejka</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć <span className="font-medium">{c.full_name}</span> z lejka?
              Kontakt pozostanie w CRM, ale zostanie usunięty z tego lejka sprzedażowego.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await removeFromTeam.mutateAsync({ contactId: contact.id, teamId });
                setShowRemoveConfirm(false);
                onOpenChange(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeFromTeam.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Usuń z lejka
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
