import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TeamMeeting {
  id: string;
  team_id: string;
  tenant_id: string;
  meeting_at: string;
  created_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface MeetingProgress {
  total: number;
  done: number;
  by_column: Record<string, { total: number; done: number }>;
}

export function useLastTeamMeeting(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team-meeting-last', teamId],
    enabled: !!teamId,
    queryFn: async (): Promise<TeamMeeting | null> => {
      const { data, error } = await supabase
        .from('team_meetings')
        .select('*')
        .eq('team_id', teamId!)
        .order('meeting_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as TeamMeeting | null;
    },
  });
}

export function useMeetingProgress(meetingId: string | undefined) {
  return useQuery({
    queryKey: ['team-meeting-progress', meetingId],
    enabled: !!meetingId,
    queryFn: async (): Promise<MeetingProgress> => {
      const { data, error } = await supabase
        .from('team_meeting_task_snapshot')
        .select('column_key, task_id, tasks!inner(status)')
        .eq('meeting_id', meetingId!);
      if (error) throw error;

      const byColumn: Record<string, { total: number; done: number }> = {};
      let total = 0;
      let done = 0;
      for (const row of (data ?? []) as Array<{ column_key: string; tasks: { status: string } | { status: string }[] }>) {
        total += 1;
        const taskRel = Array.isArray(row.tasks) ? row.tasks[0] : row.tasks;
        const isDone = taskRel?.status === 'completed';
        if (isDone) done += 1;
        if (!byColumn[row.column_key]) byColumn[row.column_key] = { total: 0, done: 0 };
        byColumn[row.column_key].total += 1;
        if (isDone) byColumn[row.column_key].done += 1;
      }
      return { total, done, by_column: byColumn };
    },
  });
}

interface SaveMeetingArgs {
  teamId: string;
  notes: string;
  snapshot: Array<{
    task_id: string;
    team_contact_id: string;
    column_key: string;
    task_status_at_snapshot: string;
  }>;
}

export function useSaveTeamMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ teamId, notes, snapshot }: SaveMeetingArgs) => {
      const { data, error } = await supabase.rpc('create_team_meeting', {
        p_team_id: teamId,
        p_notes: notes || undefined,
        p_snapshot: snapshot as unknown as never,
      });
      if (error) throw error;
      return { meetingId: data as unknown as string, teamId };
    },
    onSuccess: ({ teamId }) => {
      queryClient.invalidateQueries({ queryKey: ['team-meeting-last', teamId] });
      queryClient.invalidateQueries({ queryKey: ['team-meeting-progress'] });
      queryClient.invalidateQueries({ queryKey: ['team-meeting-streak', teamId] });
      toast.success('Odprawa zapisana');
    },
    onError: (err: Error) => toast.error(`Błąd zapisu odprawy: ${err.message}`),
  });
}

export function useTeamMeetingStreak(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team-meeting-streak', teamId],
    enabled: !!teamId,
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase.rpc('get_team_meeting_streak', { p_team_id: teamId! });
      if (error) throw error;
      return (data as unknown as number) ?? 0;
    },
  });
}

export function useTeamMeetingsHistory(teamId: string | undefined, limit = 20) {
  return useQuery({
    queryKey: ['team-meetings-history', teamId, limit],
    enabled: !!teamId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_meetings')
        .select('*')
        .eq('team_id', teamId!)
        .order('meeting_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as TeamMeeting[];
    },
  });
}

export function useOpenTasksSnapshot(teamId: string | undefined) {
  return useQuery({
    queryKey: ['open-tasks-snapshot', teamId],
    enabled: !!teamId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, status, deal_team_contact_id')
        .eq('deal_team_id', teamId!)
        .in('status', ['todo', 'pending', 'in_progress'])
        .not('deal_team_contact_id', 'is', null);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; status: string; deal_team_contact_id: string }>;
    },
  });
}
