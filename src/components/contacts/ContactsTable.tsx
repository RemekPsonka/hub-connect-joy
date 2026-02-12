import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowUpDown, Trash2, FolderOpen, Users, Phone, Mail, Sparkles, Loader2, Check, GitMerge } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
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
import { BulkMergeContactModal } from './BulkMergeContactModal';
import { DealFunnelBadges } from './DealFunnelBadges';
import { useContactGroups, useBulkUpdateContacts, useBulkDeleteContacts, useGenerateContactProfile, type ContactWithGroup } from '@/hooks/useContacts';
import type { ContactsTableColumns } from '@/hooks/useContactsTableSettings';
import type { BulkContactDealTeam } from '@/hooks/useContactsDealTeamsBulk';

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
  columns: ContactsTableColumns;
  dealTeamsMap: Map<string, BulkContactDealTeam[]>;
}

// Column width definitions
const COL_WIDTHS = {
  checkbox: 50,
  name: 220,
  company: 180,
  funnels: 200,
  phone: 150,
  email: 180,
  group: 100,
  aiProfile: 140,
  relationshipStrength: 130,
};

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
  columns,
  dealTeamsMap,
}: ContactsTableProps) {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [isMergeOpen, setIsMergeOpen] = useState(false);
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

  // Compute dynamic min width based on visible columns
  const minWidth = COL_WIDTHS.checkbox + COL_WIDTHS.name
    + (columns.company ? COL_WIDTHS.company : 0)
    + (columns.funnels ? COL_WIDTHS.funnels : 0)
    + (columns.phone ? COL_WIDTHS.phone : 0)
    + (columns.email ? COL_WIDTHS.email : 0)
    + (columns.group ? COL_WIDTHS.group : 0)
    + (columns.aiProfile ? COL_WIDTHS.aiProfile : 0)
    + (columns.relationshipStrength ? COL_WIDTHS.relationshipStrength : 0);

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

  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    const delta = 2;

    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    pages.push(1);

    if (page > 3 + delta) {
      pages.push('ellipsis');
    }

    const start = Math.max(2, page - delta);
    const end = Math.min(totalPages - 1, page + delta);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (page < totalPages - 2 - delta) {
      pages.push('ellipsis');
    }

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
          {selectedIds.length === 2 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setIsMergeOpen(true)}
            >
              <GitMerge className="h-4 w-4" />
              Scal zaznaczone
            </Button>
          )}
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
        <div className="overflow-x-auto">
          <div style={{ minWidth }}>
            {/* Header */}
            <div className="flex items-center border-b bg-muted/50 h-12 text-sm font-medium text-muted-foreground">
              <div className="px-4 flex-shrink-0" style={{ width: COL_WIDTHS.checkbox }}>
                <Checkbox
                  checked={selectedIds.length === contacts.length && contacts.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </div>
              <div className="px-4 flex-shrink-0" style={{ width: COL_WIDTHS.name }}>
                <Button variant="ghost" size="sm" className="gap-1 -ml-3" onClick={() => handleSort('full_name')}>
                  Imię i nazwisko
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </div>
              {columns.company && (
                <div className="px-4 flex-shrink-0" style={{ width: COL_WIDTHS.company }}>
                  <Button variant="ghost" size="sm" className="gap-1 -ml-3" onClick={() => handleSort('company')}>
                    Firma
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {columns.funnels && (
                <div className="px-4 flex-shrink-0" style={{ width: COL_WIDTHS.funnels }}>Lejki</div>
              )}
              {columns.phone && (
                <div className="px-4 flex-shrink-0" style={{ width: COL_WIDTHS.phone }}>Telefon prywatny</div>
              )}
              {columns.email && (
                <div className="px-4 flex-shrink-0" style={{ width: COL_WIDTHS.email }}>Email</div>
              )}
              {columns.group && (
                <div className="px-4 flex-shrink-0" style={{ width: COL_WIDTHS.group }}>Grupa</div>
              )}
              {columns.aiProfile && (
                <div className="px-4 flex-shrink-0" style={{ width: COL_WIDTHS.aiProfile }}>Profil AI</div>
              )}
              {columns.relationshipStrength && (
                <div className="px-4 flex-shrink-0" style={{ width: COL_WIDTHS.relationshipStrength }}>Siła relacji</div>
              )}
            </div>

            {/* Virtualized Body */}
            <div
              ref={parentRef}
              className="overflow-y-auto"
              style={{ maxHeight: 'calc(100vh - 350px)' }}
            >
              <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                {virtualizer.getVirtualItems().map((virtualItem) => {
                  const contact = contacts[virtualItem.index];
                  const contactDealTeams = dealTeamsMap.get(contact.id) || [];
                  return (
                    <div
                      key={contact.id}
                      className="flex items-center border-b cursor-pointer hover:bg-muted/50 absolute w-full transition-colors"
                      style={{
                        height: ROW_HEIGHT,
                        transform: `translateY(${virtualItem.start}px)`,
                      }}
                      onClick={() => navigate(`/contacts/${contact.id}`)}
                    >
                      <div className="px-4 flex-shrink-0" style={{ width: COL_WIDTHS.checkbox }} onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.includes(contact.id)}
                          onCheckedChange={(checked) => handleSelectOne(contact.id, checked as boolean)}
                        />
                      </div>
                      <div className="px-4 flex-shrink-0" style={{ width: COL_WIDTHS.name }}>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                              {getInitials(contact.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium truncate">{contact.full_name}</span>
                        </div>
                      </div>
                      {columns.company && (
                        <div className="px-4 flex-shrink-0 text-muted-foreground" style={{ width: COL_WIDTHS.company }}>
                          <div className="flex items-center gap-2">
                            {contact.company && <CompanyLogo companyName={contact.company} size="sm" />}
                            <span className="truncate">{contact.company || '-'}</span>
                          </div>
                        </div>
                      )}
                      {columns.funnels && (
                        <div className="px-4 flex-shrink-0" style={{ width: COL_WIDTHS.funnels }} onClick={(e) => e.stopPropagation()}>
                          <DealFunnelBadges contactId={contact.id} dealTeams={contactDealTeams} />
                        </div>
                      )}
                      {columns.phone && (
                        <div className="px-4 flex-shrink-0" style={{ width: COL_WIDTHS.phone }} onClick={(e) => e.stopPropagation()}>
                          {contact.phone ? (
                            <a href={`tel:${contact.phone}`} className="text-primary hover:underline flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <span className="truncate">{contact.phone}</span>
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      )}
                      {columns.email && (
                        <div className="px-4 flex-shrink-0" style={{ width: COL_WIDTHS.email }} onClick={(e) => e.stopPropagation()}>
                          {contact.email ? (
                            <a href={`mailto:${contact.email}`} className="text-primary hover:underline flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{contact.email}</span>
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      )}
                      {columns.group && (
                        <div className="px-4 flex-shrink-0" style={{ width: COL_WIDTHS.group }} onClick={(e) => e.stopPropagation()}>
                          <GroupBadge group={contact.contact_groups} compact />
                        </div>
                      )}
                      {columns.aiProfile && (
                        <div className="px-4 flex-shrink-0" style={{ width: COL_WIDTHS.aiProfile }} onClick={(e) => e.stopPropagation()}>
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
                      )}
                      {columns.relationshipStrength && (
                        <div className="px-4 flex-shrink-0" style={{ width: COL_WIDTHS.relationshipStrength }}>
                          <RelationshipStrengthBar value={contact.relationship_strength || 5} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
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
      {selectedIds.length === 2 && (
        <BulkMergeContactModal
          open={isMergeOpen}
          onOpenChange={setIsMergeOpen}
          contactIds={[selectedIds[0], selectedIds[1]]}
          onSuccess={() => setSelectedIds([])}
        />
      )}
    </div>
  );
}
