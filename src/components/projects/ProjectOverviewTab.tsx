import { DataCard } from '@/components/ui/data-card';
import { useProjectMembers, useProjectTasks, useProjectContacts, type ProjectWithOwner } from '@/hooks/useProjects';
import { Badge } from '@/components/ui/badge';
import { Users, CheckSquare, StickyNote, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface ProjectOverviewTabProps {
  project: ProjectWithOwner;
}

export function ProjectOverviewTab({ project }: ProjectOverviewTabProps) {
  const { data: members } = useProjectMembers(project.id);
  const { data: tasks } = useProjectTasks(project.id);
  const { data: contacts } = useProjectContacts(project.id);

  const completedTasks = tasks?.filter(t => t.status === 'done').length || 0;
  const totalTasks = tasks?.length || 0;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Stats */}
      <DataCard title="Statystyki projektu">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <CheckSquare className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-xl font-bold">{completedTasks}/{totalTasks}</p>
            <p className="text-xs text-muted-foreground">Zadania</p>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <Users className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-xl font-bold">{members?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Członkowie</p>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <StickyNote className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-xl font-bold">{contacts?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Kontakty</p>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <Calendar className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-xl font-bold">{progressPercent}%</p>
            <p className="text-xs text-muted-foreground">Postęp</p>
          </div>
        </div>

        {/* Progress bar */}
        {totalTasks > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Postęp zadań</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </DataCard>

      {/* Details */}
      <DataCard title="Szczegóły">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Właściciel</span>
            <span className="text-sm font-medium">{project.owner?.full_name || '—'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Utworzono</span>
            <span className="text-sm">{format(new Date(project.created_at), 'd MMM yyyy', { locale: pl })}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Ostatnia aktualizacja</span>
            <span className="text-sm">{format(new Date(project.updated_at), 'd MMM yyyy HH:mm', { locale: pl })}</span>
          </div>
          {project.description && (
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground mb-1">Opis</p>
              <p className="text-sm">{project.description}</p>
            </div>
          )}
        </div>
      </DataCard>

      {/* Members list */}
      {members && members.length > 0 && (
        <DataCard title="Członkowie zespołu" className="md:col-span-2">
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <Badge key={m.id} variant="outline" className="text-sm py-1.5 px-3">
                {(m as any).director?.full_name || 'Nieznany'}
                <span className="text-xs text-muted-foreground ml-1.5">({m.role})</span>
              </Badge>
            ))}
          </div>
        </DataCard>
      )}
    </div>
  );
}
