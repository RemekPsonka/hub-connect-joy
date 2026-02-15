import { useState } from 'react';
import { useProjectTasks, useProjectMembers } from '@/hooks/useProjects';
import { useAssignProjectToDay, useRemoveProjectFromDay } from '@/hooks/useWorkspace';
import { WorkspaceLinkManager } from './WorkspaceLinkManager';
import { WorkspaceTopicsList } from './WorkspaceTopicsList';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CheckSquare, FolderKanban, Users, X, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Project {
  id: string;
  name: string;
  color: string;
  description?: string | null;
  status?: string;
}

interface Props {
  dayOfWeek: number;
  dayName: string;
  project?: Project | null;
  allProjects: Project[];
}

const STATUS_MAP: Record<string, string> = {
  new: 'Nowy', analysis: 'Analiza', in_progress: 'W toku',
  waiting: 'Oczekuje', done: 'Zakończony', cancelled: 'Anulowany',
};

export function WorkspaceDayDashboard({ dayOfWeek, dayName, project, allProjects }: Props) {
  const assign = useAssignProjectToDay();
  const remove = useRemoveProjectFromDay();
  const navigate = useNavigate();
  const [selectValue, setSelectValue] = useState('');

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <FolderKanban className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-muted-foreground text-sm">{dayName} — brak przypisanego projektu</p>
        <div className="flex gap-2 items-center">
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
            onClick={() => assign.mutate({ dayOfWeek, projectId: selectValue })}
          >
            Przypisz
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: project.color + '22' }}>
            <FolderKanban className="h-5 w-5" style={{ color: project.color }} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">{project.name}</h2>
            {project.description && <p className="text-xs text-muted-foreground mt-0.5 max-w-md truncate">{project.description}</p>}
          </div>
          {project.status && <Badge variant="secondary" className="text-[10px]">{STATUS_MAP[project.status] || project.status}</Badge>}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => navigate(`/projects/${project.id}`)}>
            <ExternalLink className="h-3 w-3" /> Otwórz projekt
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => remove.mutate(dayOfWeek)}>
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Links + Topics */}
        <div className="space-y-6">
          <WorkspaceLinkManager projectId={project.id} />
          <WorkspaceTopicsList projectId={project.id} />
        </div>

        {/* Center: Tasks */}
        <div className="lg:col-span-1">
          <ProjectTasksList projectId={project.id} />
        </div>

        {/* Right: Team */}
        <div>
          <ProjectTeam projectId={project.id} />
        </div>
      </div>
    </div>
  );
}

function ProjectTasksList({ projectId }: { projectId: string }) {
  const { data: tasks = [] } = useProjectTasks(projectId);
  const navigate = useNavigate();

  const pending = tasks.filter((t: any) => t.status !== 'completed' && t.status !== 'cancelled');
  const done = tasks.filter((t: any) => t.status === 'completed');

  return (
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
            onClick={() => navigate(`/tasks?taskId=${task.id}`)}
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
