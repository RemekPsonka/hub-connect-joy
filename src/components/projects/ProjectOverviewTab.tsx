import { useState } from 'react';
import { DataCard } from '@/components/ui/data-card';
import { ProjectDashboardCharts } from '@/components/projects/ProjectDashboardCharts';
import {
  useProjectMembers,
  useProjectTasks,
  useProjectContacts,
  useAddProjectMember,
  useRemoveProjectMember,
  useUpdateProject,
  type ProjectWithOwner,
} from '@/hooks/useProjects';
import { useDirectors } from '@/hooks/useDirectors';
import { useDealTeams } from '@/hooks/useDealTeams';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Users, CheckSquare, StickyNote, Calendar, Plus, Trash2, CalendarDays } from 'lucide-react';
import type { TaskWithDetails } from '@/hooks/useTasks';
import { format, differenceInDays, isBefore, isAfter } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';

interface ProjectOverviewTabProps {
  project: ProjectWithOwner;
}

export function ProjectOverviewTab({ project }: ProjectOverviewTabProps) {
  const { data: members } = useProjectMembers(project.id);
  const { data: tasks } = useProjectTasks(project.id);
  const { data: contacts } = useProjectContacts(project.id);
  const { data: directors } = useDirectors();
  const { data: teams } = useDealTeams();
  const addMember = useAddProjectMember();
  const removeMember = useRemoveProjectMember();
  const updateProject = useUpdateProject();

  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedDirectorId, setSelectedDirectorId] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');

  const completedTasks = tasks?.filter(t => t.status === 'done').length || 0;
  const totalTasks = tasks?.length || 0;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Exclude already-added members + owner from the director list
  const existingMemberIds = members?.map((m) => (m as any).director?.id).filter(Boolean) || [];
  const availableDirectors = directors?.filter(
    (d) => !existingMemberIds.includes(d.id) && d.id !== project.owner_id
  ) || [];

  const handleAddMember = () => {
    if (!selectedDirectorId) return;
    addMember.mutate(
      { projectId: project.id, directorId: selectedDirectorId, role: selectedRole },
      {
        onSuccess: () => {
          setIsAddMemberOpen(false);
          setSelectedDirectorId('');
          setSelectedRole('member');
        },
      }
    );
  };

  const handleTeamChange = (value: string) => {
    updateProject.mutate({
      id: project.id,
      data: { team_id: value === 'none' ? null : value },
    });
  };

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

          {/* Team selector */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Zespół</span>
            <Select
              value={(project as any).team_id || 'none'}
              onValueChange={handleTeamChange}
            >
              <SelectTrigger className="w-[180px] h-8 text-sm">
                <SelectValue placeholder="Wybierz zespół" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Brak zespołu</SelectItem>
                {teams?.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: t.color }}
                      />
                      {t.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {project.description && (
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground mb-1">Opis</p>
              <p className="text-sm">{project.description}</p>
            </div>
          )}
        </div>
      </DataCard>

      {/* Members section */}
      <DataCard
        title="Zespół projektowy"
        className="md:col-span-2"
        action={
          <Button size="sm" variant="outline" onClick={() => setIsAddMemberOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Dodaj członka
          </Button>
        }
      >
        <div className="space-y-2">
          {/* Owner - always first, cannot be removed */}
          {project.owner && (
            <div className="flex items-center gap-3 py-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {project.owner.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{project.owner.full_name}</p>
              </div>
              <Badge variant="default" className="text-xs shrink-0">
                Właściciel
              </Badge>
            </div>
          )}

          {/* Other members */}
          {members?.map((m) => {
            const director = (m as any).director;
            if (!director || director.id === project.owner_id) return null;

            const initials = director.full_name
              ?.split(' ')
              .map((n: string) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase() || '?';

            return (
              <div key={m.id} className="flex items-center gap-3 py-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{director.full_name}</p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">
                  {m.role === 'owner' ? 'Właściciel' : m.role === 'observer' ? 'Obserwator' : 'Członek'}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeMember.mutate({ memberId: m.id, projectId: project.id })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}

          {(!members || members.filter((m) => (m as any).director?.id !== project.owner_id).length === 0) && (
            <p className="text-sm text-muted-foreground py-2">
              Brak dodatkowych członków — dodaj dyrektorów do zespołu projektowego.
            </p>
          )}
        </div>
      </DataCard>

      {/* Schedule / Dates */}
      <DataCard title="Harmonogram" className="md:col-span-2">
        <div className="flex flex-wrap gap-6 items-start">
          {/* Start date */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Data rozpoczęcia</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-[160px] justify-start text-left font-normal">
                  <CalendarDays className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  {(project as any).start_date
                    ? format(new Date((project as any).start_date), 'd MMM yyyy', { locale: pl })
                    : 'Ustaw datę'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarPicker
                  mode="single"
                  selected={(project as any).start_date ? new Date((project as any).start_date) : undefined}
                  onSelect={(d) =>
                    updateProject.mutate({
                      id: project.id,
                      data: { start_date: d ? format(d, 'yyyy-MM-dd') : null } as any,
                    })
                  }
                  locale={pl}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Due date */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Termin</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-[160px] justify-start text-left font-normal">
                  <CalendarDays className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  {(project as any).due_date
                    ? format(new Date((project as any).due_date), 'd MMM yyyy', { locale: pl })
                    : 'Ustaw termin'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarPicker
                  mode="single"
                  selected={(project as any).due_date ? new Date((project as any).due_date) : undefined}
                  onSelect={(d) =>
                    updateProject.mutate({
                      id: project.id,
                      data: { due_date: d ? format(d, 'yyyy-MM-dd') : null } as any,
                    })
                  }
                  locale={pl}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time progress */}
          {(project as any).start_date && (project as any).due_date && (() => {
            const start = new Date((project as any).start_date);
            const end = new Date((project as any).due_date);
            const totalDays = differenceInDays(end, start);
            const elapsed = differenceInDays(new Date(), start);
            const pct = totalDays > 0 ? Math.min(100, Math.max(0, Math.round((elapsed / totalDays) * 100))) : 0;
            const isOverdue = isAfter(new Date(), end) && project.status !== 'done';
            const daysLeft = differenceInDays(end, new Date());
            return (
              <div className="flex-1 min-w-[200px] space-y-1">
                <Label className="text-xs text-muted-foreground">Postęp czasowy</Label>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isOverdue ? 'bg-destructive' : pct > 80 ? 'bg-warning' : 'bg-primary'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {isOverdue
                    ? `Przekroczony termin o ${Math.abs(daysLeft)} dni`
                    : `${daysLeft} dni do terminu (${pct}%)`}
                </p>
              </div>
            );
          })()}
        </div>
      </DataCard>

      {/* Dashboard Charts */}
      <div className="md:col-span-2">
        <ProjectDashboardCharts tasks={(tasks || []) as TaskWithDetails[]} />
      </div>

      {/* Add member dialog */}
      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dodaj członka projektu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Dyrektor</Label>
              <Select value={selectedDirectorId} onValueChange={setSelectedDirectorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz dyrektora..." />
                </SelectTrigger>
                <SelectContent>
                  {availableDirectors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rola</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Członek</SelectItem>
                  <SelectItem value="observer">Obserwator</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMemberOpen(false)}>
              Anuluj
            </Button>
            <Button
              onClick={handleAddMember}
              disabled={!selectedDirectorId || addMember.isPending}
            >
              Dodaj członka
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
