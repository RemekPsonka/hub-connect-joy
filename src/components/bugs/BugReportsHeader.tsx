import { Bug } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { BugReportsFilters } from '@/hooks/useBugReports';

interface BugReportsHeaderProps {
  filters: BugReportsFilters;
  onFiltersChange: (filters: BugReportsFilters) => void;
  totalCount: number;
  openCount: number;
}

export function BugReportsHeader({
  filters,
  onFiltersChange,
  totalCount,
  openCount,
}: BugReportsHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Bug className="h-6 w-6 text-destructive" />
        <h1 className="text-2xl font-bold">Zgłoszenia do naprawy</h1>
        {openCount > 0 && (
          <Badge variant="destructive">
            {openCount} otwart{openCount === 1 ? 'e' : 'ych'}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Select
          value={filters.status || 'all'}
          onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie</SelectItem>
            <SelectItem value="new">🆕 Nowe</SelectItem>
            <SelectItem value="in_progress">🔧 W trakcie</SelectItem>
            <SelectItem value="testing">🧪 Testowanie</SelectItem>
            <SelectItem value="resolved">✅ Rozwiązane</SelectItem>
            <SelectItem value="cancelled">❌ Anulowane</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.priority || 'all'}
          onValueChange={(value) => onFiltersChange({ ...filters, priority: value })}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Priorytet" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie</SelectItem>
            <SelectItem value="critical">🔴 Krytyczny</SelectItem>
            <SelectItem value="high">🟠 Wysoki</SelectItem>
            <SelectItem value="medium">🟡 Średni</SelectItem>
            <SelectItem value="low">🟢 Niski</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground">
          {totalCount} zgłosze{totalCount === 1 ? 'nie' : 'ń'}
        </span>
      </div>
    </div>
  );
}
