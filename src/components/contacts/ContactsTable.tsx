import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpDown, Trash2, FolderOpen, Users } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { GroupBadge } from './GroupBadge';
import { RelationshipStrengthBar } from './RelationshipStrengthBar';
import { useContactGroups, useBulkUpdateContacts, useBulkDeleteContacts, type ContactWithGroup } from '@/hooks/useContacts';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

interface ContactsTableProps {
  contacts: ContactWithGroup[];
  totalCount: number;
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onPageChange: (page: number) => void;
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  isLoading: boolean;
}

export function ContactsTable({
  contacts,
  totalCount,
  page,
  pageSize,
  sortBy,
  sortOrder,
  onPageChange,
  onSortChange,
  isLoading,
}: ContactsTableProps) {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { data: groups = [] } = useContactGroups();
  const bulkUpdate = useBulkUpdateContacts();
  const bulkDelete = useBulkDeleteContacts();

  const totalPages = Math.ceil(totalCount / pageSize);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      onSortChange(column, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(column, 'asc');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(contacts.map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    }
  };

  const handleBulkAssignGroup = async (groupId: string) => {
    await bulkUpdate.mutateAsync({
      ids: selectedIds,
      updates: { primary_group_id: groupId === 'none' ? null : groupId },
    });
    setSelectedIds([]);
  };

  const handleBulkDelete = async () => {
    await bulkDelete.mutateAsync(selectedIds);
    setSelectedIds([]);
  };

  const formatLastContact = (date: string | null) => {
    if (!date) return 'Brak';
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: pl });
  };

  if (!isLoading && contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Users className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Brak kontaktów</h3>
        <p className="text-muted-foreground">Dodaj pierwszy kontakt, aby rozpocząć!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
          <span className="text-sm text-muted-foreground">
            Zaznaczono {selectedIds.length} kontaktów
          </span>
          <Select onValueChange={handleBulkAssignGroup}>
            <SelectTrigger className="w-[180px]">
              <FolderOpen className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Przypisz do grupy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Brak grupy</SelectItem>
              {groups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Usuń zaznaczone
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Usunąć zaznaczone kontakty?</AlertDialogTitle>
                <AlertDialogDescription>
                  Czy na pewno chcesz usunąć {selectedIds.length} kontaktów? Ta operacja jest nieodwracalna.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                <AlertDialogAction onClick={handleBulkDelete}>Usuń</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectedIds.length === contacts.length && contacts.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 -ml-3"
                  onClick={() => handleSort('full_name')}
                >
                  Imię i nazwisko
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Firma</TableHead>
              <TableHead>Stanowisko</TableHead>
              <TableHead>Grupa</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 -ml-3"
                  onClick={() => handleSort('last_contact_date')}
                >
                  Ostatni kontakt
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-[120px]">Siła relacji</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => (
              <TableRow
                key={contact.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => navigate(`/contacts/${contact.id}`)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.includes(contact.id)}
                    onCheckedChange={(checked) => handleSelectOne(contact.id, checked as boolean)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                        {getInitials(contact.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{contact.full_name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{contact.company || '-'}</TableCell>
                <TableCell className="text-muted-foreground">{contact.position || '-'}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <GroupBadge group={contact.contact_groups} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatLastContact(contact.last_contact_date)}
                </TableCell>
                <TableCell>
                  <RelationshipStrengthBar value={contact.relationship_strength || 5} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => page > 1 && onPageChange(page - 1)}
                className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    onClick={() => onPageChange(pageNum)}
                    isActive={page === pageNum}
                    className="cursor-pointer"
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            <PaginationItem>
              <PaginationNext
                onClick={() => page < totalPages && onPageChange(page + 1)}
                className={page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
