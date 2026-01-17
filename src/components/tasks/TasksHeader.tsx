import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Plus, Search, List, Columns, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { TasksFilters } from '@/hooks/useTasks';
import { TaskContactFilter } from './TaskContactFilter';

interface TasksHeaderProps {
  filters: TasksFilters;
  onFiltersChange: (filters: TasksFilters) => void;
  view: 'list' | 'kanban';
  onViewChange: (view: 'list' | 'kanban') => void;
  onNewTask: () => void;
  pendingCount?: number;
}

export function TasksHeader({
  filters,
  onFiltersChange,
  view,
  onViewChange,
  onNewTask,
  pendingCount = 0,
}: TasksHeaderProps) {
  const hasActiveFilters = 
    (filters.status && filters.status !== 'all') ||
    (filters.taskType && filters.taskType !== 'all') ||
    (filters.priority && filters.priority !== 'all') ||
    (filters.crossProgress && filters.crossProgress !== 'all') ||
    filters.contactId ||
    filters.search;

  const clearFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            Zadania
            {pendingCount > 0 && (
              <span className="text-sm font-normal px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                {pendingCount} oczekujących
              </span>
            )}
          </h1>
          <p className="text-muted-foreground">Zarządzaj swoimi zadaniami i połączeniami</p>
        </div>
        <Button onClick={onNewTask}>
          <Plus className="h-4 w-4 mr-2" />
          Nowe zadanie
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj zadań..."
            className="pl-9"
            value={filters.search || ''}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          />
        </div>

        <Select
          value={filters.status || 'all'}
          onValueChange={(value) => onFiltersChange({ ...filters, status: value as TasksFilters['status'] })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie</SelectItem>
            <SelectItem value="pending">Oczekujące</SelectItem>
            <SelectItem value="in_progress">W trakcie</SelectItem>
            <SelectItem value="completed">Zakończone</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.taskType || 'all'}
          onValueChange={(value) => onFiltersChange({ ...filters, taskType: value as TasksFilters['taskType'] })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Typ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie</SelectItem>
            <SelectItem value="standard">Standardowe</SelectItem>
            <SelectItem value="cross">Krosowe</SelectItem>
            <SelectItem value="group">Grupowe</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.priority || 'all'}
          onValueChange={(value) => onFiltersChange({ ...filters, priority: value as TasksFilters['priority'] })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Priorytet" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie</SelectItem>
            <SelectItem value="low">Niski</SelectItem>
            <SelectItem value="medium">Średni</SelectItem>
            <SelectItem value="high">Wysoki</SelectItem>
            <SelectItem value="urgent">Pilny</SelectItem>
          </SelectContent>
        </Select>

        {/* Cross-task progress filter - only visible when taskType is 'cross' */}
        {filters.taskType === 'cross' && (
          <Select
            value={filters.crossProgress || 'all'}
            onValueChange={(value) => onFiltersChange({ 
              ...filters, 
              crossProgress: value as TasksFilters['crossProgress'] 
            })}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Postęp" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Każdy postęp</SelectItem>
              <SelectItem value="0">0/3 - Nowe</SelectItem>
              <SelectItem value="1">1/3 - Rozpoczęte</SelectItem>
              <SelectItem value="2">2/3 - Prawie gotowe</SelectItem>
              <SelectItem value="3">3/3 - Ukończone</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Contact filter */}
        <TaskContactFilter
          value={filters.contactId}
          onChange={(contactId) => onFiltersChange({ 
            ...filters, 
            contactId 
          })}
        />

        {/* Sorting Controls */}
        <div className="flex items-center gap-1 border-l pl-4 ml-2">
          <Select
            value={filters.sortBy || 'created_at'}
            onValueChange={(value) => onFiltersChange({ 
              ...filters, 
              sortBy: value as TasksFilters['sortBy'] 
            })}
          >
            <SelectTrigger className="w-[150px]">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sortuj" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Data utworzenia</SelectItem>
              <SelectItem value="due_date">Termin</SelectItem>
              <SelectItem value="priority">Priorytet</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => onFiltersChange({ 
              ...filters, 
              sortDirection: filters.sortDirection === 'asc' ? 'desc' : 'asc' 
            })}
            title={filters.sortDirection === 'asc' ? 'Rosnąco' : 'Malejąco'}
          >
            {filters.sortDirection === 'asc' 
              ? <ArrowUp className="h-4 w-4" /> 
              : <ArrowDown className="h-4 w-4" />
            }
          </Button>
        </div>

        {/* Clear filters button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Wyczyść
          </Button>
        )}

        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => v && onViewChange(v as 'list' | 'kanban')}
        >
          <ToggleGroupItem value="list" aria-label="Widok listy">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="kanban" aria-label="Widok kanban">
            <Columns className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}
