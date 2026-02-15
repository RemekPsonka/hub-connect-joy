import { useState } from 'react';
import { useProjectTasks, useProjectMembers } from '@/hooks/useProjects';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';
import { TaskModal } from '@/components/tasks/TaskModal';
import type { TaskWithDetails } from '@/hooks/useTasks';
import { useAssignProjectToDay, useRemoveProjectFromDay } from '@/hooks/useWorkspace';
import { WorkspaceLinkManager } from './WorkspaceLinkManager';
import { WorkspaceTopicsList } from './WorkspaceTopicsList';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CheckSquare, Clock, FolderKanban, Users, X, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Project {
  id: string;
  name: string;
  color: string;
  description?: string | null;
  status?: string;
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
}

const STATUS_MAP: Record<string, string> = {
  new: 'Nowy', analysis: 'Analiza', in_progress: 'W toku',
  waiting: 'Oczekuje', done: 'Zakończony', cancelled: 'Anulowany',
};

export function WorkspaceTimeBlock({ dayOfWeek, timeBlock, project, allProjects }: Props) {
  const assign = useAssignProjectToDay();
  const remove = useRemoveProjectFromDay();
  const navigate = useNavigate();
  const [selectValue, setSelectValue] = useState('');

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
    <div className="space-y-4 rounded-lg border border-border/40 p-4">
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
              <h3 className="text-sm font-bold text-foreground">{project.name}</h3>
              {project.description && <p className="text-[11px] text-muted-foreground max-w-md truncate">{project.description}</p>}
            </div>
          </div>
          {project.status && <Badge variant="secondary" className="text-[10px]">{STATUS_MAP[project.status] || project.status}</Badge>}
        </div>
        <div className="flex gap-1">
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
          {pending.length === 0 && <p className="text-xs text-muted-foreground/50 italic px-2">Brak zadań</p>}
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
