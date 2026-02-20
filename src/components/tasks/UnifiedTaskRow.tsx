import { useState } from 'react';
import { format, isPast, isToday } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  Circle, Clock, CheckCircle2, XCircle, AlertTriangle,
  MoreHorizontal, Edit, ListChecks,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSubtasks } from '@/hooks/useTasks';

// ─── Shared config ────────────────────────────────────────

export const STATUS_CONFIG: Record<string, { label: string; icon: typeof Circle; color: string }> = {
  todo: { label: 'Do zrobienia', icon: Circle, color: 'text-muted-foreground' },
  in_progress: { label: 'W trakcie', icon: Clock, color: 'text-blue-500' },
  completed: { label: 'Zakończone', icon: CheckCircle2, color: 'text-green-600' },
  cancelled: { label: 'Anulowane', icon: XCircle, color: 'text-muted-foreground' },
};

export const PRIORITY_CONFIG: Record<string, { label: string; dot: string; badgeClass: string }> = {
  urgent: { label: 'Pilne', dot: 'bg-red-500', badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  high: { label: 'Wysoki', dot: 'bg-orange-500', badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
  medium: { label: 'Średni', dot: 'bg-blue-500', badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  low: { label: 'Niski', dot: 'bg-slate-400', badgeClass: 'bg-slate-100 text-slate-800 dark:bg-slate-800/40 dark:text-slate-300' },
};

export const STATUS_CYCLE = ['todo', 'in_progress', 'completed'] as const;

// ─── Subtask indicator ────────────────────────────────────────

function SubtaskIndicator({ taskId }: { taskId: string }) {
  const { data: subtasks = [] } = useSubtasks(taskId);
  if (subtasks.length === 0) return null;
  const done = subtasks.filter((s: any) => s.status === 'completed').length;
  const total = subtasks.length;
  const pct = Math.round((done / total) * 100);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <ListChecks className="h-3 w-3" />
          <span>{done}/{total}</span>
          <div className="w-8 h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {done} z {total} subtasków ukończonych ({pct}%)
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Props ────────────────────────────────────────

export interface UnifiedTaskRowProps {
  task: {
    id: string;
    title: string;
    description?: string | null;
    status: string | null;
    priority: string | null;
    due_date: string | null;
    assigned_to?: string | null;
    completed_at?: string | null;
    deal_team?: {
      id: string;
      name: string;
      color: string;
    } | null;
  };
  members?: Array<{
    director_id: string;
    director?: { full_name: string } | null;
  }>;
  contactName?: string;
  companyName?: string;
  onStatusChange: (taskId: string, newStatus: string) => void;
  onPriorityChange?: (taskId: string, newPriority: string) => void;
  onAssigneeChange?: (taskId: string, newAssigneeId: string) => void;
  onTitleChange?: (taskId: string, newTitle: string) => void;
  onClick?: (taskId: string) => void;
  compact?: boolean;
  showSubtasks?: boolean;
  showAssignee?: boolean;
  className?: string;
}

// ─── Component ────────────────────────────────────────

export function UnifiedTaskRow({
  task,
  members,
  contactName,
  companyName,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onTitleChange,
  onClick,
  compact = false,
  showSubtasks = true,
  showAssignee = false,
  className,
}: UnifiedTaskRowProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(task.title);

  const status = task.status || 'todo';
  const st = STATUS_CONFIG[status] || STATUS_CONFIG.todo;
  const StatusIcon = st.icon;
  const pri = PRIORITY_CONFIG[task.priority || 'medium'] || PRIORITY_CONFIG.medium;
  const isDone = status === 'completed' || status === 'cancelled';
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && !isDone;

  const handleStatusCycle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIdx = STATUS_CYCLE.indexOf(status as any);
    const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];
    onStatusChange(task.id, nextStatus);
  };

  const handleTitleSave = () => {
    if (titleValue.trim() && titleValue !== task.title && onTitleChange) {
      onTitleChange(task.id, titleValue.trim());
    }
    setEditingTitle(false);
  };

  const assignedMember = members?.find(m => m.director_id === task.assigned_to);
  const initials = assignedMember?.director?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?';

  const getDueDateDisplay = () => {
    if (!task.due_date) return null;
    const d = new Date(task.due_date);
    const colorClass = isPast(d) && !isToday(d) && !isDone
      ? 'text-destructive'
      : isToday(d) ? 'text-amber-600' : 'text-muted-foreground';
    return (
      <span className={cn('text-xs flex items-center gap-1 whitespace-nowrap', colorClass)}>
        {isPast(d) && !isToday(d) && !isDone ? (
          <AlertTriangle className="h-2.5 w-2.5" />
        ) : (
          <Clock className="h-2.5 w-2.5" />
        )}
        {format(d, 'dd MMM', { locale: pl })}
      </span>
    );
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 hover:bg-muted/40 transition-colors group cursor-pointer border-b last:border-b-0',
        compact ? 'px-2 py-1.5' : 'px-3 py-2.5',
        isDone && 'opacity-50',
        isOverdue && 'bg-destructive/5',
        className,
      )}
      onClick={() => onClick?.(task.id)}
    >
      {/* Status icon - click cycles */}
      <button
        onClick={handleStatusCycle}
        className="shrink-0 hover:scale-110 transition-transform"
        title={`${st.label} (kliknij aby zmienić)`}
      >
        <StatusIcon className={cn(compact ? 'h-4 w-4' : 'h-[18px] w-[18px]', st.color)} />
      </button>

      {/* Deal team badge */}
      {task.deal_team && (
        <Badge
          variant="outline"
          className="text-[10px] px-1.5 py-0 h-4 border-none shrink-0 font-medium"
          style={{ backgroundColor: `${task.deal_team.color}20`, color: task.deal_team.color }}
        >
          {task.deal_team.name}
        </Badge>
      )}

      {/* Title + description */}
      <div className="flex-1 min-w-0">
        {editingTitle && onTitleChange ? (
          <Input
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTitleSave();
              if (e.key === 'Escape') { setTitleValue(task.title); setEditingTitle(false); }
            }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'border-0 bg-transparent shadow-none focus-visible:ring-1 px-0 py-0',
              compact ? 'h-5 text-xs' : 'h-6 text-sm',
            )}
            autoFocus
          />
        ) : (
          <p
            className={cn(
              'truncate',
              compact ? 'text-xs' : 'text-sm',
              isDone && 'line-through',
            )}
            onDoubleClick={(e) => {
              if (onTitleChange) {
                e.stopPropagation();
                setTitleValue(task.title);
                setEditingTitle(true);
              }
            }}
            title={onTitleChange ? 'Kliknij podwójnie, aby edytować tytuł' : task.title}
          >
            {task.title}
            {(contactName || companyName) && (
              <span className="text-muted-foreground font-normal ml-1.5">
                {contactName && <>– {contactName}</>}
                {contactName && companyName && <span className="mx-1">·</span>}
                {companyName && <span className="text-muted-foreground/70">{companyName}</span>}
              </span>
            )}
          </p>
        )}
        {!compact && task.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-md">{task.description}</p>
        )}
      </div>

      {/* Metadata chips */}
      <div className={cn('flex items-center shrink-0', compact ? 'gap-1.5' : 'gap-2')}>
        {/* Subtasks */}
        {showSubtasks && <SubtaskIndicator taskId={task.id} />}

        {/* Due date */}
        {getDueDateDisplay()}

        {/* Priority dropdown */}
        {onPriorityChange ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button className="shrink-0">
                <div className={cn('w-2 h-2 rounded-full', pri.dot)} title={pri.label} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32 bg-popover z-50">
              {Object.entries(PRIORITY_CONFIG).map(([key, val]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => onPriorityChange(task.id, key)}
                  className={task.priority === key ? 'bg-accent' : ''}
                >
                  <div className={cn('w-2 h-2 rounded-full mr-2', val.dot)} />
                  {val.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className={cn('w-2 h-2 rounded-full shrink-0', pri.dot)} title={pri.label} />
        )}

        {/* Status badge (non-compact only) */}
        {!compact && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {st.label}
          </Badge>
        )}

        {/* Assignee avatar */}
        {showAssignee && members && members.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              {onAssigneeChange ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <button className="shrink-0">
                      <Avatar className={cn(compact ? 'h-5 w-5' : 'h-6 w-6', 'cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all')}>
                        <AvatarFallback className={cn(compact ? 'text-[8px]' : 'text-[10px]', 'bg-primary/10 text-primary')}>
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44 bg-popover z-50">
                    {members.map((m) => (
                      <DropdownMenuItem
                        key={m.director_id}
                        onClick={() => onAssigneeChange(task.id, m.director_id)}
                        className={task.assigned_to === m.director_id ? 'bg-accent' : ''}
                      >
                        <Avatar className="h-5 w-5 mr-2">
                          <AvatarFallback className="text-[9px]">
                            {m.director?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        {m.director?.full_name || 'Nieznany'}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Avatar className={cn(compact ? 'h-5 w-5' : 'h-6 w-6')}>
                  <AvatarFallback className={cn(compact ? 'text-[8px]' : 'text-[10px]', 'bg-primary/10 text-primary')}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
              )}
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {assignedMember?.director?.full_name || 'Nieprzypisany'}
            </TooltipContent>
          </Tooltip>
        )}

        {/* More menu (non-compact) */}
        {!compact && onClick && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 bg-popover z-50">
              <DropdownMenuItem onClick={() => onClick(task.id)}>
                <Edit className="h-3.5 w-3.5 mr-2" />Szczegóły / Edycja
              </DropdownMenuItem>
              {onTitleChange && (
                <DropdownMenuItem onClick={() => { setTitleValue(task.title); setEditingTitle(true); }}>
                  <Edit className="h-3.5 w-3.5 mr-2" />Edytuj tytuł
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
