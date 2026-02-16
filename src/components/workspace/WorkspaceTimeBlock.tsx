import { useState, useRef, useEffect } from 'react';
import { useProjectTasks, useProjectMembers, useUpdateProject } from '@/hooks/useProjects';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';
import { TaskModal } from '@/components/tasks/TaskModal';
import type { TaskWithDetails } from '@/hooks/useTasks';
import { useCreateTask } from '@/hooks/useTasks';
import { useAssignProjectToDay, useRemoveProjectFromDay } from '@/hooks/useWorkspace';
import { WorkspaceLinkManager } from './WorkspaceLinkManager';
import { WorkspaceTopicsList } from './WorkspaceTopicsList';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

import { CheckSquare, Clock, FolderKanban, Users, X, ExternalLink, MoreVertical, Pencil, CalendarDays, ArrowRightLeft, Unlink, Plus, Loader2 } from 'lucide-react';
import { WorkspaceNotes } from './WorkspaceNotes';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
  color: string;
  description?: string | null;
  status?: string;
  due_date?: string | null;
  start_date?: string | null;
}

interface TimeBlockDef {
  id: number;
  label: string;
  shortLabel: string;
}

interface Props {
  dayOfWeek: number;
  timeBlock: TimeBlockDef;
  project?: Project | null;
  allProjects: Project[];
  occupiedBlocks: number[];
}

const ALL_TIME_BLOCKS = [
  { id: 0, label: '8:00 - 12:00' },
  { id: 1, label: '12:00 - 16:00' },
  { id: 2, label: '16:00 - 20:00' },
];

const STATUS_MAP: Record<string, string> = {
  new: 'Nowy', analysis: 'Analiza', in_progress: 'W toku',
  waiting: 'Oczekuje', done: 'Zakończony', cancelled: 'Anulowany',
};

export function WorkspaceTimeBlock({ dayOfWeek, timeBlock, project, allProjects, occupiedBlocks }: Props) {
  const assign = useAssignProjectToDay();
  const remove = useRemoveProjectFromDay();
  const updateProject = useUpdateProject();
  const navigate = useNavigate();
  const [selectValue, setSelectValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const availableBlocks = ALL_TIME_BLOCKS.filter(b => b.id !== timeBlock.id && !occupiedBlocks.includes(b.id));

  const handleMoveToBlock = async (targetBlockId: number) => {
    if (!project) return;
    await remove.mutateAsync({ dayOfWeek, timeBlock: timeBlock.id });
    await assign.mutateAsync({ dayOfWeek, projectId: project.id, timeBlock: targetBlockId });
  };
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartRename = () => {
    if (!project) return;
    setEditName(project.name);
    setIsEditing(true);
  };

  const handleSaveRename = () => {
    if (!project || !editName.trim()) return;
    if (editName.trim() !== project.name) {
      updateProject.mutate({ id: project.id, data: { name: editName.trim() } });
    }
    setIsEditing(false);
  };

  const handleCancelRename = () => {
    setIsEditing(false);
  };

  const handleSetDueDate = (date: Date | undefined) => {
    if (!project) return;
    updateProject.mutate({ id: project.id, data: { due_date: date ? date.toISOString().split('T')[0] : null } });
    setShowDatePicker(false);
  };

  if (!project) {
    return (
      <div className="flex items-center gap-4 py-6 px-4 rounded-lg border border-dashed border-border/50">
        <div className="flex items-center gap-2 text-muted-foreground min-w-[120px]">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-medium">{timeBlock.label}</span>
        </div>
        <div className="flex gap-2 items-center flex-1">
          <Select value={selectValue} onValueChange={setSelectValue}>
            <SelectTrigger className="w-[240px] h-9"><SelectValue placeholder="Wybierz projekt..." /></SelectTrigger>
            <SelectContent>
              {allProjects.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={!selectValue || assign.isPending}
            onClick={() => assign.mutate({ dayOfWeek, projectId: selectValue, timeBlock: timeBlock.id })}
          >
            Przypisz
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card/50 p-4 border-l-4" style={{ borderLeftColor: project.color }}>
      {/* Time block header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">{timeBlock.label}</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: project.color + '22' }}>
              <FolderKanban className="h-4 w-4" style={{ color: project.color }} />
            </div>
            <div>
              {isEditing ? (
                <Input
                  ref={inputRef}
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveRename(); if (e.key === 'Escape') handleCancelRename(); }}
                  onBlur={handleSaveRename}
                  className="h-7 text-sm font-bold w-[200px]"
                />
              ) : (
                <h3 className="text-sm font-bold text-foreground">{project.name}</h3>
              )}
              {project.description && !isEditing && <p className="text-[11px] text-muted-foreground max-w-md truncate">{project.description}</p>}
            </div>
          </div>
          {project.status && <Badge variant="secondary" className="text-[10px]">{STATUS_MAP[project.status] || project.status}</Badge>}
          {project.due_date && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <CalendarDays className="h-3 w-3" />
              {format(new Date(project.due_date), 'd MMM yyyy', { locale: pl })}
            </Badge>
          )}
        </div>
        <div className="flex gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleStartRename}>
                <Pencil className="h-3.5 w-3.5 mr-2" /> Zmień nazwę
              </DropdownMenuItem>
              <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                <PopoverTrigger asChild>
                  <DropdownMenuItem onSelect={e => { e.preventDefault(); setShowDatePicker(true); }}>
                    <CalendarDays className="h-3.5 w-3.5 mr-2" /> Ustaw termin
                  </DropdownMenuItem>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={project.due_date ? new Date(project.due_date) : undefined}
                    onSelect={handleSetDueDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                  {project.due_date && (
                    <div className="p-2 border-t">
                      <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => handleSetDueDate(undefined)}>
                        Usuń termin
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              <DropdownMenuSeparator />
              {availableBlocks.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <ArrowRightLeft className="h-3.5 w-3.5 mr-2" /> Przenieś do bloku
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {availableBlocks.map(b => (
                      <DropdownMenuItem key={b.id} onClick={() => handleMoveToBlock(b.id)}>
                        {b.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              <DropdownMenuItem onClick={() => remove.mutate({ dayOfWeek, timeBlock: timeBlock.id })}>
                <Unlink className="h-3.5 w-3.5 mr-2" /> Usuń z bloku
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => navigate(`/projects/${project.id}`)}>
            <ExternalLink className="h-3 w-3" /> Otwórz
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => remove.mutate({ dayOfWeek, timeBlock: timeBlock.id })}>
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      </div>


      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-4">
          <WorkspaceLinkManager projectId={project.id} />
          <WorkspaceTopicsList projectId={project.id} />
          <WorkspaceNotes projectId={project.id} />
        </div>
        <div className="lg:col-span-1">
          <ProjectTasksList projectId={project.id} />
        </div>
        <div>
          <ProjectTeam projectId={project.id} />
        </div>
      </div>
    </div>
  );
}

function ProjectTasksList({ projectId }: { projectId: string }) {
  const { data: tasks = [] } = useProjectTasks(projectId);
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const createTask = useCreateTask();

  const pending = tasks.filter((t: any) => t.status !== 'completed' && t.status !== 'cancelled');
  const done = tasks.filter((t: any) => t.status === 'completed');

  const handleTaskClick = (task: any) => {
    setSelectedTask(task as TaskWithDetails);
    setIsDetailOpen(true);
    setIsEditMode(false);
  };

  const handleEditFromDetail = () => {
    setIsDetailOpen(false);
    setIsEditMode(true);
    setIsModalOpen(true);
  };
  const handleAddTask = async () => {
    if (!newTitle.trim()) return;
    try {
      await createTask.mutateAsync({
        task: {
          title: newTitle.trim(),
          status: 'todo',
          priority: 'medium',
          task_type: 'standard',
          project_id: projectId,
        },
      });
      setNewTitle('');
      setIsAdding(false);
    } catch {}
  };

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <CheckSquare className="h-3.5 w-3.5" /> Zadania
          </h3>
          <span className="text-[10px] text-muted-foreground">{pending.length} aktywnych · {done.length} ukończonych</span>
        </div>
        <div className="space-y-1 max-h-[300px] overflow-y-auto">
          {pending.slice(0, 15).map((task: any) => (
            <div
              key={task.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/40 cursor-pointer text-sm"
              onClick={() => handleTaskClick(task)}
            >
              <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                task.priority === 'high' || task.priority === 'urgent' ? 'bg-destructive' :
                task.priority === 'medium' ? 'bg-yellow-500' : 'bg-muted-foreground/30'
              }`} />
              <span className="truncate flex-1">{task.title}</span>
              {task.assignee && (
                <span className="text-[10px] text-muted-foreground">{task.assignee.full_name?.split(' ')[0]}</span>
              )}
            </div>
          ))}
          {pending.length === 0 && !isAdding && <p className="text-xs text-muted-foreground/50 italic px-2">Brak zadań</p>}
          {isAdding ? (
            <div className="space-y-1.5 px-2 py-1.5">
              <Input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Tytuł zadania..."
                autoFocus
                className="h-8 text-sm"
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddTask();
                  if (e.key === 'Escape') { setIsAdding(false); setNewTitle(''); }
                }}
              />
              <div className="flex gap-1.5">
                <Button size="sm" onClick={handleAddTask} disabled={!newTitle.trim() || createTask.isPending} className="h-7 text-xs flex-1">
                  {createTask.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Dodaj'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setIsAdding(false); setNewTitle(''); }} className="h-7 text-xs">
                  Anuluj
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Dodaj zadanie
            </button>
          )}
        </div>
      </div>

      {selectedTask && (
        <TaskDetailSheet
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          task={selectedTask}
          onEdit={handleEditFromDetail}
        />
      )}

      <TaskModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        task={isEditMode ? selectedTask : null}
      />
    </>
  );
}

function ProjectTeam({ projectId }: { projectId: string }) {
  const { data: members = [] } = useProjectMembers(projectId);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
        <Users className="h-3.5 w-3.5" /> Zespół
      </h3>
      <div className="space-y-1">
        {members.map((m: any) => {
          const name = m.director?.full_name || '?';
          const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
          return (
            <div key={m.id} className="flex items-center gap-2 px-2 py-1.5">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{initials}</AvatarFallback>
              </Avatar>
              <span className="text-sm">{name}</span>
              <Badge variant="outline" className="text-[9px] ml-auto">{m.role || 'Członek'}</Badge>
            </div>
          );
        })}
        {members.length === 0 && <p className="text-xs text-muted-foreground/50 italic px-2">Brak członków</p>}
      </div>
    </div>
  );
}
