import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowUpDown, Trash2, FolderOpen, Users, Phone, Mail, Sparkles, Loader2, Check } from 'lucide-react';
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
  PaginationEllipsis,
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
import { useContactGroups, useBulkUpdateContacts, useBulkDeleteContacts, useGenerateContactProfile, type ContactWithGroup } from '@/hooks/useContacts';

const ROW_HEIGHT = 56;

interface ContactsTableProps {
  contacts: ContactWithGroup[];
  totalCount: number;
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
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
  onPageSizeChange,
  onSortChange,
  isLoading,
}: ContactsTableProps) {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const { data: groups = [] } = useContactGroups();
  const bulkUpdate = useBulkUpdateContacts();
  const bulkDelete = useBulkDeleteContacts();
  const generateProfile = useGenerateContactProfile();

  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: contacts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

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

  const handleGenerateProfile = async (e: React.MouseEvent, contactId: string) => {
    e.stopPropagation();
    setGeneratingId(contactId);
    try {
      await generateProfile.mutateAsync(contactId);
    } finally {
      setGeneratingId(null);
    }
  };

  // Windowed pagination logic
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    const delta = 2;

    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Always show first page
    pages.push(1);

    // Ellipsis after first page if needed
    if (page > 3 + delta) {
      pages.push('ellipsis');
    }

    // Pages around current
    const start = Math.max(2, page - delta);
    const end = Math.min(totalPages - 1, page + delta);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    // Ellipsis before last page if needed
    if (page < totalPages - 2 - delta) {
      pages.push('ellipsis');
    }

    // Always show last page
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
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
      <div className="border rounded-lg overflow-hidden">
        {/* Sticky Header */}
        <div className="bg-background border-b">
          <table className="table-fixed w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[50px]">
                  <Checkbox
                    checked={selectedIds.length === contacts.length && contacts.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[200px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 -ml-3"
                    onClick={() => handleSort('full_name')}
                  >
                    Imię i nazwisko
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[150px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 -ml-3"
                    onClick={() => handleSort('company')}
                  >
                    Firma
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[120px]">Stanowisko</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[130px]">Telefon prywatny</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[180px]">Email</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[100px]">Grupa</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[140px]">Profil AI</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[120px]">Siła relacji</th>
              </tr>
            </thead>
          </table>
        </div>

        {/* Virtualized Body */}
        <div
          ref={parentRef}
          className="overflow-auto"
          style={{ maxHeight: 'calc(100vh - 350px)' }}
        >
          <table className="table-fixed w-full text-sm">
            <tbody>
              <tr style={{ height: virtualizer.getTotalSize() }}>
                <td colSpan={9} className="p-0 relative">
                  {virtualizer.getVirtualItems().map((virtualItem) => {
                    const contact = contacts[virtualItem.index];
                    return (
                      <div
                        key={contact.id}
                        className="cursor-pointer hover:bg-muted/50 absolute w-full flex items-center border-b transition-colors"
                        style={{
                          height: ROW_HEIGHT,
                          transform: `translateY(${virtualItem.start}px)`,
                        }}
                        onClick={() => navigate(`/contacts/${contact.id}`)}
                      >
                        <div className="p-4 w-[50px] flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.includes(contact.id)}
                            onCheckedChange={(checked) => handleSelectOne(contact.id, checked as boolean)}
                          />
                        </div>
                        <div className="p-4 w-[200px] flex-shrink-0">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                {getInitials(contact.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium truncate">{contact.full_name}</span>
                          </div>
                        </div>
                        <div className="p-4 w-[150px] flex-shrink-0 text-muted-foreground truncate">{contact.company || '-'}</div>
                        <div className="p-4 w-[120px] flex-shrink-0 text-muted-foreground truncate">{contact.position || '-'}</div>
                        <div className="p-4 w-[130px] flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          {contact.phone ? (
                            <a
                              href={`tel:${contact.phone}`}
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              <Phone className="h-3 w-3" />
                              <span className="truncate">{contact.phone}</span>
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                        <div className="p-4 w-[180px] flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          {contact.email ? (
                            <a
                              href={`mailto:${contact.email}`}
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{contact.email}</span>
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                        <div className="p-4 w-[100px] flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <GroupBadge group={contact.contact_groups} />
                        </div>
                        <div className="p-4 w-[140px] flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          {contact.profile_summary ? (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Check className="h-3 w-3 text-green-600" />
                              Wygenerowano
                            </span>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={generatingId === contact.id}
                              onClick={(e) => handleGenerateProfile(e, contact.id)}
                              className="gap-1"
                            >
                              {generatingId === contact.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Sparkles className="h-3 w-3" />
                              )}
                              Generuj AI
                            </Button>
                          )}
                        </div>
                        <div className="p-4 w-[120px] flex-shrink-0">
                          <RelationshipStrengthBar value={contact.relationship_strength || 5} />
                        </div>
                      </div>
                    );
                  })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Na stronie:</span>
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground ml-4">
            Łącznie: {totalCount} kontaktów
          </span>
        </div>

        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => page > 1 && onPageChange(page - 1)}
                  className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              {getPageNumbers().map((pageNum, index) =>
                pageNum === 'ellipsis' ? (
                  <PaginationItem key={`ellipsis-${index}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => onPageChange(pageNum)}
                      isActive={page === pageNum}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}
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
    </div>
  );
}
