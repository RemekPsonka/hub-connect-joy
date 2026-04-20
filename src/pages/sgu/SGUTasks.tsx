import { TasksHeader } from '@/components/sgu/headers/TasksHeader';
import { MyTeamTasksView } from '@/components/deals-team/MyTeamTasksView';
import { useSGUTeamId } from '@/hooks/useSGUTeamId';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SGUTasks() {
  const { sguTeamId, isLoading } = useSGUTeamId();

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Dziennik</h1>
        <p className="text-sm text-muted-foreground">Twoje zadania pogrupowane wg terminu.</p>
      </div>

      <TasksHeader />

      {isLoading ? null : !sguTeamId ? (
        <Alert>
          <AlertDescription>Brak skonfigurowanego zespołu SGU.</AlertDescription>
        </Alert>
      ) : (
        <MyTeamTasksView teamId={sguTeamId} />
      )}
    </div>
  );
}
