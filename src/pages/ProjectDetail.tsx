import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  LayoutList,
  Users,
  StickyNote,
  FileText,
  MoreVertical,
  Trash2,
  ArrowLeft,
  Loader2,
  Eye,
  Diamond,
  CalendarDays,
} from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  useProject,
  useUpdateProject,
  useDeleteProject,
  getStatusConfig,
  PROJECT_STATUSES,
} from '@/hooks/useProjects';
import { ProjectOverviewTab } from '@/components/projects/ProjectOverviewTab';
import { ProjectTasksTab } from '@/components/projects/ProjectTasksTab';
import { ProjectContactsTab } from '@/components/projects/ProjectContactsTab';
import { ProjectNotesTab } from '@/components/projects/ProjectNotesTab';
import { ProjectFilesTab } from '@/components/projects/ProjectFilesTab';
import { ProjectMilestones } from '@/components/projects/ProjectMilestones';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const { data: project, isLoading } = useProject(id);
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-[1200px] mx-auto">
        <SkeletonCard height="h-20" />
        <SkeletonCard height="h-96" />
      </div>
    );
  }

  if (!project) {
    return (
      <EmptyState
        icon={Eye}
        title="Projekt nie znaleziony"
        description="Projekt mógł zostać usunięty lub nie masz do niego dostępu."
        action={{ label: 'Wróć do projektów', onClick: () => navigate('/projects') }}
      />
    );
  }

  const statusCfg = getStatusConfig(project.status);

  const handleStatusChange = (newStatus: string) => {
    updateProject.mutate({ id: project.id, data: { status: newStatus as any } });
  };

  const handleDelete = async () => {
    await deleteProject.mutateAsync(project.id);
    navigate('/projects');
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/projects')}
          className="shrink-0 mt-1"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Color dot */}
            <div
              className="h-4 w-4 rounded-full shrink-0"
              style={{ backgroundColor: project.color || '#7C3AED' }}
            />
            <h1 className="text-2xl font-bold text-foreground truncate">
              {project.name}
            </h1>
            <Badge className={`text-xs ${statusCfg.color}`}>
              {statusCfg.label}
            </Badge>
            {((project as any).start_date || (project as any).due_date) && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {(project as any).start_date && format(new Date((project as any).start_date), 'd MMM', { locale: pl })}
                {(project as any).start_date && (project as any).due_date && ' → '}
                {(project as any).due_date && format(new Date((project as any).due_date), 'd MMM yyyy', { locale: pl })}
              </span>
            )}
          </div>
          {project.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {project.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
              Zmień status
            </DropdownMenuItem>
            {PROJECT_STATUSES.map((s) => (
              <DropdownMenuItem
                key={s.value}
                onClick={() => handleStatusChange(s.value)}
                className={project.status === s.value ? 'font-medium' : ''}
              >
                {s.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Anuluj projekt
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview" className="gap-1.5">
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Przegląd</span>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5">
            <LayoutList className="h-4 w-4" />
            <span className="hidden sm:inline">Zadania</span>
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-1.5">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Kontakty</span>
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-1.5">
            <StickyNote className="h-4 w-4" />
            <span className="hidden sm:inline">Notatki</span>
          </TabsTrigger>
          <TabsTrigger value="files" className="gap-1.5">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Pliki</span>
          </TabsTrigger>
          <TabsTrigger value="milestones" className="gap-1.5">
            <Diamond className="h-4 w-4" />
            <span className="hidden sm:inline">Kamienie</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <ProjectOverviewTab project={project} />
        </TabsContent>
        <TabsContent value="tasks" className="mt-4">
          <ProjectTasksTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="contacts" className="mt-4">
          <ProjectContactsTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="notes" className="mt-4">
          <ProjectNotesTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="files" className="mt-4">
          <ProjectFilesTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="milestones" className="mt-4">
          <ProjectMilestones projectId={project.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
