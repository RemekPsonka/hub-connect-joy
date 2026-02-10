import { Checkbox } from '@/components/ui/checkbox';
import { TaskTypeBadge } from './TaskTypeBadge';
import { TaskPriorityBadge } from './TaskPriorityBadge';
import { TaskStatusBadge } from './TaskStatusBadge';
import { CrossTaskProgressBadge } from './CrossTaskProgressBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { TaskWithDetails } from '@/hooks/useTasks';
import { calculateCrossTaskStatus, calculateCrossTaskProgress } from '@/utils/crossTaskStatus';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { useState } from 'react';

type SortField = 'title' | 'status' | 'priority' | 'due_date' | 'task_type';

interface TasksTableProps {
  tasks: TaskWithDetails[];
  onTaskClick: (task: TaskWithDetails) => void;
  onStatusChange: (taskId: string, completed: boolean) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (taskId: string) => void;
}

const PRIORITY_ORDER: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };

export function TasksTable({ tasks, onTaskClick, onStatusChange, selectedIds, onToggleSelect }: TasksTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (!sortField) return 0;
    const dir = sortAsc ? 1 : -1;
    switch (sortField) {
      case 'title':
        return dir * a.title.localeCompare(b.title);
      case 'status':
        return dir * (a.status || '').localeCompare(b.status || '');
      case 'priority':
        return dir * ((PRIORITY_ORDER[a.priority || 'low'] || 0) - (PRIORITY_ORDER[b.priority || 'low'] || 0));
      case 'due_date':
        return dir * ((a.due_date || '').localeCompare(b.due_date || ''));
      case 'task_type':
        return dir * (a.task_type || '').localeCompare(b.task_type || '');
      default:
        return 0;
    }
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortAsc ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  if (tasks.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground text-center">Brak zadań. Dodaj pierwsze zadanie!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            {onToggleSelect && <TableHead className="w-10" />}
            <TableHead className="w-10" />
            <TableHead className="cursor-pointer select-none" onClick={() => handleSort('title')}>
              <div className="flex items-center">Tytuł <SortIcon field="title" /></div>
            </TableHead>
            <TableHead className="cursor-pointer select-none w-[120px]" onClick={() => handleSort('status')}>
              <div className="flex items-center">Status <SortIcon field="status" /></div>
            </TableHead>
            <TableHead className="cursor-pointer select-none w-[100px]" onClick={() => handleSort('priority')}>
              <div className="flex items-center">Priorytet <SortIcon field="priority" /></div>
            </TableHead>
            <TableHead className="cursor-pointer select-none w-[100px]" onClick={() => handleSort('task_type')}>
              <div className="flex items-center">Typ <SortIcon field="task_type" /></div>
            </TableHead>
            <TableHead className="cursor-pointer select-none w-[110px]" onClick={() => handleSort('due_date')}>
              <div className="flex items-center">Termin <SortIcon field="due_date" /></div>
            </TableHead>
            <TableHead className="w-[120px]">Przypisany</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTasks.map((task) => {
            const crossTask = task.cross_tasks?.[0];
            const isCrossTask = task.task_type === 'cross' && crossTask;
            const effectiveStatus = isCrossTask ? calculateCrossTaskStatus(crossTask) : task.status;
            const isCompleted = effectiveStatus === 'completed';

            return (
              <TableRow
                key={task.id}
                className={`cursor-pointer ${isCompleted ? 'opacity-60' : ''} ${selectedIds?.has(task.id) ? 'bg-primary/5' : ''}`}
                onClick={() => onTaskClick(task)}
              >
                {onToggleSelect && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds?.has(task.id) || false}
                      onCheckedChange={() => onToggleSelect(task.id)}
                    />
                  </TableCell>
                )}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isCompleted}
                    disabled={!!isCrossTask}
                    onCheckedChange={(checked) => {
                      if (!isCrossTask) onStatusChange(task.id, !!checked);
                    }}
                  />
                </TableCell>
                <TableCell>
                  <div>
                    <span className={`font-medium ${isCompleted ? 'line-through' : ''}`}>{task.title}</span>
                    {task.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{task.description}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <TaskStatusBadge status={effectiveStatus} />
                    {isCrossTask && (
                      <CrossTaskProgressBadge completed={calculateCrossTaskProgress(crossTask).completed} total={3} />
                    )}
                  </div>
                </TableCell>
                <TableCell><TaskPriorityBadge priority={task.priority} /></TableCell>
                <TableCell><TaskTypeBadge type={task.task_type} /></TableCell>
                <TableCell>
                  {task.due_date ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(task.due_date), 'd MMM', { locale: pl })}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground">
                    {(task as any).assignee?.full_name || (task as any).owner?.full_name || '—'}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
