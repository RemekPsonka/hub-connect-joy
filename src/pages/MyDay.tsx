import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow, startOfMonth, endOfMonth } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  CheckCircle,
  Plus,
  UserPlus,
  FolderPlus,
  Bot,
  Activity,
  MessageSquare,
  Phone,
  FolderOpen,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMyDayData, useCalendarTaskDates } from '@/hooks/useMyDayData';
import { useUpdateTask, type TaskWithDetails } from '@/hooks/useTasks';
import { DataCard } from '@/components/ui/data-card';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { TaskModal } from '@/components/tasks/TaskModal';
import { NewProjectDialog } from '@/components/projects/NewProjectDialog';
import { MiniCalendar } from '@/components/my-day/MiniCalendar';

// Priority dot colors
const priorityColors: Record<string, string> = {
  urgent: 'bg-red-500',
  critical: 'bg-red-500',
  high: 'bg-amber-500',
  medium: 'bg-blue-500',
  low: 'bg-muted-foreground/40',
};

function TaskRow({
  task,
  onToggle,
  showOverdueDate,
}: {
  task: TaskWithDetails;
  onToggle: (task: TaskWithDetails) => void;
  showOverdueDate?: boolean;
}) {
  const isDone = task.status === 'done';
  const projectName = task.project_id ? (task as any).projects?.name : null;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      <Checkbox
        checked={isDone}
        onCheckedChange={() => onToggle(task)}
        className="shrink-0"
      />
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${priorityColors[task.priority || 'low'] || priorityColors.low}`}
      />
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${
            isDone ? 'line-through text-muted-foreground' : 'text-foreground'
          }`}
        >
          {task.title}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {projectName && (
          <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full hidden sm:inline">
            {projectName}
          </span>
        )}
        {showOverdueDate && task.due_date && (
          <span className="text-xs text-destructive">
            {formatDistanceToNow(new Date(task.due_date), { locale: pl, addSuffix: true })}
          </span>
        )}
        {!showOverdueDate && task.due_date && (
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {format(new Date(task.due_date), 'HH:mm', { locale: pl })}
          </span>
        )}
      </div>
    </div>
  );
}

function getActivityIcon(type: string) {
  switch (type) {
    case 'created':
      return <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />;
    case 'note_added':
      return <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />;
    case 'call':
      return <Phone className="h-4 w-4 text-muted-foreground shrink-0" />;
    default:
      return <Activity className="h-4 w-4 text-muted-foreground shrink-0" />;
  }
}

export default function MyDay() {
  const navigate = useNavigate();
  const { director } = useAuth();
  const {
    tasksToday,
    tasksOverdue,
    tasksDoneTodayCount,
    recentActivity,
    activeProjects,
    isLoading,
  } = useMyDayData();
  const updateTask = useUpdateTask();

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);

  // Calendar state
  const now = new Date();
  const [calMonthStart, setCalMonthStart] = useState(
    format(startOfMonth(now), 'yyyy-MM-dd')
  );
  const [calMonthEnd, setCalMonthEnd] = useState(
    format(endOfMonth(now), 'yyyy-MM-dd')
  );
  const { data: calendarTaskDates } = useCalendarTaskDates(calMonthStart, calMonthEnd);

  const firstName = director?.full_name?.split(' ')[0] || '';
  const formattedDate = new Date().toLocaleDateString('pl-PL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleToggleTask = (task: TaskWithDetails) => {
    updateTask.mutate({
      id: task.id,
      status: task.status === 'done' ? 'pending' : 'done',
    });
  };

  const handleMonthChange = (start: string, end: string) => {
    setCalMonthStart(start);
    setCalMonthEnd(end);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column skeletons */}
        <div className="lg:col-span-8 space-y-6">
          {/* Greeting skeleton */}
          <div className="space-y-2">
            <div className="h-8 w-64 bg-muted animate-pulse rounded-md" />
            <div className="h-4 w-48 bg-muted animate-pulse rounded-md" />
            <div className="flex gap-3 mt-3">
              <div className="h-8 w-24 bg-muted animate-pulse rounded-full" />
              <div className="h-8 w-24 bg-muted animate-pulse rounded-full" />
              <div className="h-8 w-24 bg-muted animate-pulse rounded-full" />
            </div>
          </div>
          <SkeletonCard variant="list" lines={5} />
          <SkeletonCard variant="list" lines={5} />
        </div>
        {/* Right column skeletons */}
        <div className="lg:col-span-4 space-y-6">
          <SkeletonCard variant="data" lines={6} />
          <SkeletonCard variant="list" lines={3} />
          <SkeletonCard variant="list" lines={3} />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ────── LEFT COLUMN ────── */}
        <div className="lg:col-span-8 space-y-6">
          {/* Greeting */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Dzień dobry, {firstName}!
            </h1>
            <p className="text-sm text-muted-foreground capitalize">{formattedDate}</p>
            {/* Mini stat badges */}
            <div className="flex flex-wrap gap-3 mt-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
                Na dziś: {tasksToday.length}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                  tasksOverdue.length > 0
                    ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                Zaległe: {tasksOverdue.length}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                Ukończone: {tasksDoneTodayCount}
              </span>
            </div>
          </div>

          {/* Tasks today */}
          <DataCard
            title="Zadania na dziś"
            action={
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1"
                onClick={() => navigate('/tasks')}
              >
                Wszystkie zadania
                <ArrowRight className="h-3 w-3" />
              </Button>
            }
          >
            {tasksToday.length === 0 ? (
              <EmptyState
                icon={CheckCircle}
                title="Wszystko zrobione!"
                description="Brak zadań na dziś. Czas na nowe wyzwania."
              />
            ) : (
              <div>
                {tasksToday.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={handleToggleTask}
                  />
                ))}
              </div>
            )}
          </DataCard>

          {/* Overdue — conditional */}
          {tasksOverdue.length > 0 && (
            <DataCard
              title="Zaległe"
              className="border-l-4 border-l-destructive/30"
              action={
                <span className="bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400 rounded-full px-2 py-0.5 text-xs font-medium">
                  {tasksOverdue.length}
                </span>
              }
            >
              <div>
                {tasksOverdue.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={handleToggleTask}
                    showOverdueDate
                  />
                ))}
              </div>
            </DataCard>
          )}

          {/* Recent activity */}
          <DataCard title="Ostatnia aktywność">
            {recentActivity.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="Brak aktywności"
                description="Aktywność pojawi się tu automatycznie."
              />
            ) : (
              <div>
                {recentActivity.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 py-2 border-b border-border last:border-0"
                  >
                    {getActivityIcon(entry.activity_type)}
                    <p className="text-sm text-foreground flex-1 min-w-0">
                      <span className="truncate block">
                        {entry.description || `Aktywność: ${entry.activity_type}`}
                      </span>
                      {entry.contacts?.full_name && (
                        <span className="text-xs text-muted-foreground">
                          {entry.contacts.full_name}
                        </span>
                      )}
                    </p>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(entry.created_at), {
                        locale: pl,
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </DataCard>
        </div>

        {/* ────── RIGHT COLUMN ────── */}
        <div className="lg:col-span-4 space-y-6">
          {/* Mini Calendar */}
          <DataCard>
            <MiniCalendar
              taskDates={calendarTaskDates || []}
              onMonthChange={handleMonthChange}
            />
          </DataCard>

          {/* Active projects */}
          <DataCard
            title="Moje projekty"
            footer={
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs gap-1"
                onClick={() => navigate('/projects')}
              >
                Wszystkie projekty
                <ArrowRight className="h-3 w-3" />
              </Button>
            }
          >
            {activeProjects.length === 0 ? (
              <EmptyState
                icon={FolderOpen}
                title="Brak projektów"
                description="Utwórz swój pierwszy projekt."
                actionLabel="Utwórz projekt"
                onAction={() => setProjectDialogOpen(true)}
              />
            ) : (
              <div>
                {activeProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="flex items-center gap-2 py-2 w-full text-left border-b border-border last:border-0 hover:bg-muted/30 rounded-md px-1 transition-colors"
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: project.color || '#7C3AED' }}
                    />
                    <span className="text-sm font-medium truncate flex-1">
                      {project.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </DataCard>

          {/* Quick actions */}
          <DataCard title="Szybkie akcje">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 justify-start text-xs h-9"
                onClick={() => setTaskModalOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Nowe zadanie
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 justify-start text-xs h-9"
                onClick={() => navigate('/contacts')}
              >
                <UserPlus className="h-3.5 w-3.5" />
                Nowy kontakt
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 justify-start text-xs h-9"
                onClick={() => setProjectDialogOpen(true)}
              >
                <FolderPlus className="h-3.5 w-3.5" />
                Nowy projekt
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 justify-start text-xs h-9 border-primary/30 text-primary hover:bg-primary/5"
                onClick={() => navigate('/ai')}
              >
                <Bot className="h-3.5 w-3.5" />
                AI Chat
              </Button>
            </div>
          </DataCard>
        </div>
      </div>

      {/* Modals */}
      <TaskModal open={taskModalOpen} onOpenChange={setTaskModalOpen} />
      <NewProjectDialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen} />
    </>
  );
}
