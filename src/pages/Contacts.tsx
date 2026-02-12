import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useContacts } from '@/hooks/useContacts';
import { useCompaniesWithContacts } from '@/hooks/useCompanies';
import { useContactsTableSettings } from '@/hooks/useContactsTableSettings';
import { useContactsDealTeamsBulk } from '@/hooks/useContactsDealTeamsBulk';
import { ContactsHeader, type ViewMode } from '@/components/contacts/ContactsHeader';
import { ContactsTable } from '@/components/contacts/ContactsTable';
import { CompaniesTable } from '@/components/contacts/CompaniesTable';
import { BulkMergeDomainsModal } from '@/components/contacts/BulkMergeDomainsModal';
import { FindDuplicatesModal } from '@/components/contacts/FindDuplicatesModal';

export default function Contacts() {
  const [searchParams] = useSearchParams();
  const initialView: ViewMode = searchParams.get('view') === 'companies' ? 'companies' : 'people';
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isBulkMergeModalOpen, setIsBulkMergeModalOpen] = useState(false);
  const [isFindDuplicatesModalOpen, setIsFindDuplicatesModalOpen] = useState(false);

  const { settings, updateColumns, updateFilters, updateSort, updatePageSize } = useContactsTableSettings();
  const { filters, columns } = settings;

  // Contacts query (for people view)
  const contactsQuery = useContacts({
    search,
    groupId: filters.groupId,
    companyId: filters.companyId,
    page,
    pageSize: settings.pageSize,
    sortBy: settings.sortBy,
    sortOrder: settings.sortOrder,
  });

  // Companies query (for companies view)
  const [companySortBy, setCompanySortBy] = useState('name');
  const companiesQuery = useCompaniesWithContacts({
    search,
    page,
    pageSize: settings.pageSize,
    sortBy: companySortBy,
    sortOrder: settings.sortOrder,
  });

  // Bulk fetch deal teams for visible contacts
  const contactIds = useMemo(
    () => (contactsQuery.data?.data || []).map((c) => c.id),
    [contactsQuery.data?.data]
  );
  const dealTeamsBulk = useContactsDealTeamsBulk(contactIds);

  // Client-side filtering by deal team / category / AI profile
  const filteredContacts = useMemo(() => {
    let contacts = contactsQuery.data?.data || [];
    const map = dealTeamsBulk.data;

    if (filters.dealTeamId && map) {
      contacts = contacts.filter((c) => {
        const teams = map.get(c.id) || [];
        return teams.some((t) => t.team_id === filters.dealTeamId);
      });
    }

    if (filters.dealCategory && map) {
      contacts = contacts.filter((c) => {
        const teams = map.get(c.id) || [];
        return teams.some((t) => t.category === filters.dealCategory);
      });
    }

    if (filters.aiProfileStatus === 'generated') {
      contacts = contacts.filter((c) => !!c.profile_summary);
    } else if (filters.aiProfileStatus === 'missing') {
      contacts = contacts.filter((c) => !c.profile_summary);
    }

    return contacts;
  }, [contactsQuery.data?.data, dealTeamsBulk.data, filters.dealTeamId, filters.dealCategory, filters.aiProfileStatus]);

  const handleSortChange = (newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    updateSort(newSortBy, newSortOrder);
    setPage(1);
  };

  const handleCompanySortChange = (newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setCompanySortBy(newSortBy);
    updateSort(newSortBy, newSortOrder);
    setPage(1);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    updatePageSize(newPageSize);
    setPage(1);
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    setPage(1);
    setSearch('');
  };

  const currentData = viewMode === 'people' ? contactsQuery.data : companiesQuery.data;

  return (
    <div className="space-y-6">
      <ContactsHeader
        totalCount={currentData?.count || 0}
        search={search}
        onSearchChange={(value: string) => { setSearch(value); setPage(1); }}
        filters={filters}
        onFiltersChange={(f) => { updateFilters(f); setPage(1); }}
        columns={columns}
        onColumnsChange={updateColumns}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onBulkMergeByDomain={() => setIsBulkMergeModalOpen(true)}
        onFindDuplicates={() => setIsFindDuplicatesModalOpen(true)}
      />

      {viewMode === 'people' ? (
        <ContactsTable
          contacts={filteredContacts}
          totalCount={
            filters.dealTeamId || filters.dealCategory || filters.aiProfileStatus
              ? filteredContacts.length
              : contactsQuery.data?.count || 0
          }
          page={page}
          pageSize={settings.pageSize}
          sortBy={settings.sortBy}
          sortOrder={settings.sortOrder}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          onSortChange={handleSortChange}
          isLoading={contactsQuery.isLoading}
          columns={columns}
          dealTeamsMap={dealTeamsBulk.data || new Map()}
        />
      ) : (
        <CompaniesTable
          companies={companiesQuery.data?.data || []}
          totalCount={companiesQuery.data?.count || 0}
          page={page}
          pageSize={settings.pageSize}
          sortBy={companySortBy}
          sortOrder={settings.sortOrder}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          onSortChange={handleCompanySortChange}
          isLoading={companiesQuery.isLoading}
        />
      )}

      <BulkMergeDomainsModal
        open={isBulkMergeModalOpen}
        onOpenChange={setIsBulkMergeModalOpen}
      />

      <FindDuplicatesModal
        open={isFindDuplicatesModalOpen}
        onOpenChange={setIsFindDuplicatesModalOpen}
      />
    </div>
  );
}
