import { isPast, isToday, addDays, startOfDay } from 'date-fns';
import type { DealTeamAssignment } from '@/hooks/useDealsTeamAssignments';

export type SGUBucket = 'today' | 'overdue' | 'upcoming' | 'rest';

export function bucketOfTask(task: DealTeamAssignment): SGUBucket {
  const isDone = task.status === 'completed' || task.status === 'cancelled';
  if (!task.due_date) return 'rest';
  const d = new Date(task.due_date);
  if (isToday(d)) return 'today';
  if (isPast(d) && !isDone) return 'overdue';
  const tomorrow = startOfDay(addDays(new Date(), 1));
  const in7d = startOfDay(addDays(new Date(), 8));
  if (d >= tomorrow && d < in7d) return 'upcoming';
  return 'rest';
}