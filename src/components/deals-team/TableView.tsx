import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { utils, writeFile } from 'xlsx';
import { ArrowUp, ArrowDown, Download, Filter, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useTeamContacts } from '@/hooks/useDealsTeamContacts';
import { useTeamMembers } from '@/hooks/useDealsTeamMembers';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import type { DealTeamContact, DealCategory, DealContactStatus, DealPriority } from '@/types/dealTeam';

interface TableViewProps {
  teamId: string;
}

type SortConfig = {
  column: string;
  direction: 'asc' | 'desc' | null;
};

interface Filters {
  category: DealCategory | '';
  status: DealContactStatus | '';
  assignedTo: string;
  priority: DealPriority | '';
  overdueOnly: boolean;
}

const categoryConfig: Record<DealCategory, { label: string; color: string; icon: string }> = {
  hot: { label: 'HOT', color: 'bg-red-100 text-red-800 border-red-200', icon: '🔥' },
  top: { label: 'TOP', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: '⭐' },
  lead: { label: 'LEAD', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: '📋' },
  cold: { label: 'COLD', color: 'bg-slate-100 text-slate-800 border-slate-200', icon: '❄️' },
  client: { label: 'KLIENT', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: '✅' },
};

const priorityConfig: Record<DealPriority, { label: string; color: string }> = {
  urgent: { label: 'Pilny', color: 'bg-red-100 text-red-800 border-red-200' },
  high: { label: 'Wysoki', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  medium: { label: 'Średni', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  low: { label: 'Niski', color: 'bg-gray-100 text-gray-800 border-gray-200' },
};

const statusConfig: Record<DealContactStatus, string> = {
  active: 'Aktywny',
  on_hold: 'Wstrzymany',
  won: 'Wygrany',
  lost: 'Przegrany',
  disqualified: 'Zdyskwalifikowany',
};

export function TableView({ teamId }: TableViewProps) {
  const { data: contacts = [], isLoading } = useTeamContacts(teamId, undefined, true);
  const { data: members = [] } = useTeamMembers(teamId);

  // Build member lookup map
  const memberMap = useMemo(
    () => new Map(members.map((m) => [m.director_id, m.director?.full_name || 'Nieznany'])),
    [members]
  );

  // Filters - use 'all' display value but empty string for actual filtering
  const [filters, setFilters] = useState<Filters>({
    category: '',
    status: '',
    assignedTo: '',
    priority: '',
    overdueOnly: false,
  });

  // Sort
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    column: 'priority',
    direction: 'desc',
  });

  // Handle sort click
  const handleSort = (column: string) => {
    setSortConfig((prev) => {
      if (prev.column !== column) return { column, direction: 'asc' };
      if (prev.direction === 'asc') return { column, direction: 'desc' };
      if (prev.direction === 'desc') return { column: '', direction: null };
      return { column, direction: 'asc' };
    });
  };

  // Filter contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      if (filters.category && c.category !== filters.category) return false;
      if (filters.status && c.status !== filters.status) return false;
      if (filters.assignedTo && c.assigned_to !== filters.assignedTo) return false;
      if (filters.priority && c.priority !== filters.priority) return false;
      if (filters.overdueOnly && !c.status_overdue) return false;
      return true;
    });
  }, [contacts, filters]);

  // Sort contacts
  const sortedContacts = useMemo(() => {
    if (!sortConfig.column || !sortConfig.direction) return filteredContacts;

    const sorted = [...filteredContacts].sort((a, b) => {
      let aVal: string | number | null = null;
      let bVal: string | number | null = null;

      switch (sortConfig.column) {
        case 'name':
          aVal = a.contact?.full_name || '';
          bVal = b.contact?.full_name || '';
          break;
        case 'company':
          aVal = a.contact?.company || '';
          bVal = b.contact?.company || '';
          break;
        case 'category':
          const categoryOrder: Record<string, number> = { hot: 4, top: 3, lead: 2, cold: 1 };
          aVal = categoryOrder[a.category] ?? 0;
          bVal = categoryOrder[b.category] ?? 0;
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          aVal = priorityOrder[a.priority];
          bVal = priorityOrder[b.priority];
          break;
        case 'assignedTo':
          aVal = a.assigned_to ? memberMap.get(a.assigned_to) || '' : '';
          bVal = b.assigned_to ? memberMap.get(b.assigned_to) || '' : '';
          break;
        case 'nextMeeting':
          aVal = a.next_meeting_date || '';
          bVal = b.next_meeting_date || '';
          break;
        case 'value':
          aVal = a.estimated_value || 0;
          bVal = b.estimated_value || 0;
          break;
        case 'lastStatus':
          aVal = a.last_status_update || '';
          bVal = b.last_status_update || '';
          break;
        default:
          return 0;
      }

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === '') return 1;
      if (bVal === null || bVal === '') return -1;

      const comparison = aVal < bVal ? -1 : 1;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [filteredContacts, sortConfig, memberMap]);

  // Calculate overdue count
  const overdueCount = useMemo(
    () => contacts.filter((c) => c.status_overdue).length,
    [contacts]
  );

  // Export to XLSX
  const exportToXlsx = () => {
    const data = sortedContacts.map((c) => ({
      Kontakt: c.contact?.full_name || '',
      Firma: c.contact?.company || '',
      Kategoria: c.category.toUpperCase(),
      Status: statusConfig[c.status] || c.status,
      Priorytet: priorityConfig[c.priority]?.label || c.priority,
      Odpowiedzialny: c.assigned_to ? memberMap.get(c.assigned_to) || '' : '',
      'Nast. akcja': c.next_action || '',
      'Nast. spotkanie': c.next_meeting_date
        ? format(new Date(c.next_meeting_date), 'dd.MM.yyyy')
        : '',
      Wartość: c.estimated_value || '',
      Waluta: c.value_currency,
      'Ostatni status': c.last_status_update
        ? format(new Date(c.last_status_update), 'dd.MM.yyyy')
        : 'Brak',
    }));

    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Deals Team');
    writeFile(wb, `deals-team-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Wyeksportowano do XLSX');
  };

  // Render sort indicator
  const SortIndicator = ({ column }: { column: string }) => {
    if (sortConfig.column !== column) return null;
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1" />
    );
  };

  // Sortable header
  const SortableHeader = ({
    column,
    children,
  }: {
    column: string;
    children: React.ReactNode;
  }) => (
    <TableHead
      className="cursor-pointer select-none hover:bg-muted/50"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center">
        {children}
        <SortIndicator column={column} />
      </div>
    </TableHead>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-lg border">
        <Filter className="h-4 w-4 text-muted-foreground" />

        {/* Category filter */}
        <Select
          value={filters.category || 'all'}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, category: v === 'all' ? '' : v as DealCategory }))
          }
        >
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder="Kategoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie</SelectItem>
            <SelectItem value="hot">🔥 HOT</SelectItem>
            <SelectItem value="top">⭐ TOP</SelectItem>
            <SelectItem value="lead">📋 LEAD</SelectItem>
            <SelectItem value="cold">❄️ COLD</SelectItem>
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select
          value={filters.status || 'all'}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, status: v === 'all' ? '' : v as DealContactStatus }))
          }
        >
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie</SelectItem>
            <SelectItem value="active">Aktywny</SelectItem>
            <SelectItem value="on_hold">Wstrzymany</SelectItem>
            <SelectItem value="won">Wygrany</SelectItem>
            <SelectItem value="lost">Przegrany</SelectItem>
          </SelectContent>
        </Select>

        {/* Assigned to filter */}
        <Select
          value={filters.assignedTo || 'all'}
          onValueChange={(v) => setFilters((f) => ({ ...f, assignedTo: v === 'all' ? '' : v }))}
        >
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Odpowiedzialny" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszyscy</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.director_id} value={m.director_id}>
                {m.director?.full_name || 'Nieznany'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priority filter */}
        <Select
          value={filters.priority || 'all'}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, priority: v === 'all' ? '' : v as DealPriority }))
          }
        >
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder="Priorytet" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie</SelectItem>
            <SelectItem value="urgent">Pilny</SelectItem>
            <SelectItem value="high">Wysoki</SelectItem>
            <SelectItem value="medium">Średni</SelectItem>
            <SelectItem value="low">Niski</SelectItem>
          </SelectContent>
        </Select>

        {/* Overdue toggle */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="overdue-only"
            checked={filters.overdueOnly}
            onCheckedChange={(checked) =>
              setFilters((f) => ({ ...f, overdueOnly: !!checked }))
            }
          />
          <label
            htmlFor="overdue-only"
            className="text-sm cursor-pointer flex items-center gap-1"
          >
            <AlertTriangle className="h-3 w-3 text-destructive" />
            Przeterminowane ({overdueCount})
          </label>
        </div>

        <div className="flex-1" />

        {/* Export button */}
        <Button variant="outline" size="sm" onClick={exportToXlsx} className="gap-2">
          <Download className="h-4 w-4" />
          Eksport XLSX
        </Button>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Pokazuję {sortedContacts.length} z {contacts.length} kontaktów
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader column="name">Kontakt</SortableHeader>
              <SortableHeader column="company">Firma</SortableHeader>
              <SortableHeader column="category">Kategoria</SortableHeader>
              <SortableHeader column="status">Status</SortableHeader>
              <SortableHeader column="priority">Priorytet</SortableHeader>
              <SortableHeader column="assignedTo">Odpowiedzialny</SortableHeader>
              <TableHead>Nast. akcja</TableHead>
              <SortableHeader column="nextMeeting">Nast. spotkanie</SortableHeader>
              <SortableHeader column="value">Wartość</SortableHeader>
              <SortableHeader column="lastStatus">Ostatni status</SortableHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedContacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                  {filters.overdueOnly ||
                  filters.category ||
                  filters.status ||
                  filters.assignedTo ||
                  filters.priority
                    ? 'Brak kontaktów spełniających kryteria filtrów'
                    : 'Brak kontaktów w zespole'}
                </TableCell>
              </TableRow>
            ) : (
              sortedContacts.map((contact) => (
                <TableRow key={contact.id}>
                  {/* Name */}
                  <TableCell>
                    <Link
                      to={`/contacts/${contact.contact_id}`}
                      className="font-medium hover:underline"
                    >
                      {contact.contact?.full_name || 'Nieznany'}
                    </Link>
                  </TableCell>

                  {/* Company */}
                  <TableCell className="text-muted-foreground">
                    {contact.contact?.company || '—'}
                  </TableCell>

                  {/* Category */}
                  <TableCell>
                    <Badge className={`text-xs ${categoryConfig[contact.category].color}`}>
                      {categoryConfig[contact.category].icon}{' '}
                      {categoryConfig[contact.category].label}
                    </Badge>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Badge
                      variant={contact.status === 'active' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {statusConfig[contact.status] || contact.status}
                    </Badge>
                  </TableCell>

                  {/* Priority */}
                  <TableCell>
                    <Badge className={`text-xs ${priorityConfig[contact.priority].color}`}>
                      {priorityConfig[contact.priority].label}
                    </Badge>
                  </TableCell>

                  {/* Assigned to */}
                  <TableCell className="text-muted-foreground">
                    {contact.assigned_to ? memberMap.get(contact.assigned_to) || '—' : '—'}
                  </TableCell>

                  {/* Next action */}
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                    {contact.next_action || '—'}
                  </TableCell>

                  {/* Next meeting */}
                  <TableCell>
                    {contact.next_meeting_date
                      ? format(new Date(contact.next_meeting_date), 'dd.MM.yyyy')
                      : '—'}
                  </TableCell>

                  {/* Value */}
                  <TableCell>
                    {contact.estimated_value ? (
                      <span className="font-medium">
                        {contact.estimated_value.toLocaleString('pl-PL')}{' '}
                        {contact.value_currency}
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>

                  {/* Last status */}
                  <TableCell>
                    {contact.last_status_update ? (
                      contact.status_overdue ? (
                        <span className="text-destructive font-medium flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {formatDistanceToNow(new Date(contact.last_status_update), {
                            locale: pl,
                            addSuffix: true,
                          })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {formatDistanceToNow(new Date(contact.last_status_update), {
                            locale: pl,
                            addSuffix: true,
                          })}
                        </span>
                      )
                    ) : (
                      <span className="text-muted-foreground">Brak</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
