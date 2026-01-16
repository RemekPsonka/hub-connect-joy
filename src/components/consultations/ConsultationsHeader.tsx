import { CalendarDays, List, Plus } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';

interface ConsultationsHeaderProps {
  upcomingCount: number;
  view: 'list' | 'calendar';
  onViewChange: (view: 'list' | 'calendar') => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddClick: () => void;
}

export function ConsultationsHeader({
  upcomingCount,
  view,
  onViewChange,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchChange,
  onAddClick,
}: ConsultationsHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Konsultacje</h1>
          {upcomingCount > 0 && (
            <Badge variant="secondary">{upcomingCount} nadchodzących</Badge>
          )}
        </div>
        <Button onClick={onAddClick} className="gap-2">
          <Plus className="h-4 w-4" />
          Nowa konsultacja
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Szukaj po nazwie kontaktu..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              <SelectItem value="scheduled">Zaplanowane</SelectItem>
              <SelectItem value="completed">Zakończone</SelectItem>
              <SelectItem value="cancelled">Anulowane</SelectItem>
              <SelectItem value="no_show">Nieobecność</SelectItem>
            </SelectContent>
          </Select>

          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(value) => value && onViewChange(value as 'list' | 'calendar')}
          >
            <ToggleGroupItem value="list" aria-label="Lista">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="calendar" aria-label="Kalendarz">
              <CalendarDays className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
    </div>
  );
}
