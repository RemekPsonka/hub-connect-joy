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
import { TaskModal } from '@/components/tasks/TaskModal';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';
import { UnifiedTaskRow } from '@/components/tasks/UnifiedTaskRow';
import { NewProjectDialog } from '@/components/projects/NewProjectDialog';
import { MiniCalendar } from '@/components/my-day/MiniCalendar';
import { GCalTodayEvents } from '@/components/my-day/GCalTodayEvents';
import { SovraRemindersCard } from '@/components/sovra/SovraRemindersCard';

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
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

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
      status: task.status === 'completed' ? 'todo' : 'completed',
    });
  };

  const handleTaskClick = (task: TaskWithDetails) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
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
                  <UnifiedTaskRow
                    key={task.id}
                    task={task}
                    contactName={task.task_contacts?.[0]?.contacts?.full_name}
                    onStatusChange={(taskId, newStatus) => updateTask.mutate({ id: taskId, status: newStatus })}
                    onClick={() => handleTaskClick(task)}
                    compact
                    showSubtasks
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
                  <UnifiedTaskRow
                    key={task.id}
                    task={task}
                    contactName={task.task_contacts?.[0]?.contacts?.full_name}
                    onStatusChange={(taskId, newStatus) => updateTask.mutate({ id: taskId, status: newStatus })}
                    onClick={() => handleTaskClick(task)}
                    compact
                    showSubtasks
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

          {/* Google Calendar events */}
          <GCalTodayEvents />

          {/* Sovra reminders */}
          <SovraRemindersCard />

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
      {selectedTask && (
        <TaskDetailSheet
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          task={selectedTask}
          onEdit={() => {}}
        />
      )}
    </>
  );
}
