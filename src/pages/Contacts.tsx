import { useState } from 'react';
import { useContacts } from '@/hooks/useContacts';
import { useCompaniesWithContacts } from '@/hooks/useCompanies';
import { ContactsHeader, type ViewMode } from '@/components/contacts/ContactsHeader';
import { ContactsTable } from '@/components/contacts/ContactsTable';
import { CompaniesTable } from '@/components/contacts/CompaniesTable';
import { ContactModal } from '@/components/contacts/ContactModal';
import { BulkMergeDomainsModal } from '@/components/contacts/BulkMergeDomainsModal';

export default function Contacts() {
  const [viewMode, setViewMode] = useState<ViewMode>('people');
  const [search, setSearch] = useState('');
  const [groupId, setGroupId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState('full_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [companySortBy, setCompanySortBy] = useState('name');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkMergeModalOpen, setIsBulkMergeModalOpen] = useState(false);

  // Contacts query (for people view)
  const contactsQuery = useContacts({
    search,
    groupId: groupId === 'all' ? '' : groupId,
    companyId: companyId === 'all' ? '' : companyId,
    page,
    pageSize,
    sortBy,
    sortOrder,
  });

  // Companies query (for companies view)
  const companiesQuery = useCompaniesWithContacts({
    search,
    page,
    pageSize,
    sortBy: companySortBy,
    sortOrder,
  });

  const handleSortChange = (newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setPage(1);
  };

  const handleCompanySortChange = (newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setCompanySortBy(newSortBy);
    setSortOrder(newSortOrder);
    setPage(1);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    setPage(1);
    setSearch('');
  };

  const currentData = viewMode === 'people' ? contactsQuery.data : companiesQuery.data;
  const isLoading = viewMode === 'people' ? contactsQuery.isLoading : companiesQuery.isLoading;

  return (
    <div className="space-y-6">
      <ContactsHeader
        totalCount={currentData?.count || 0}
        search={search}
        onSearchChange={(value) => { setSearch(value); setPage(1); }}
        groupId={groupId}
        onGroupChange={(value) => { setGroupId(value); setPage(1); }}
        companyId={companyId}
        onCompanyChange={(value) => { setCompanyId(value); setPage(1); }}
        onAddContact={() => setIsModalOpen(true)}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onBulkMergeByDomain={() => setIsBulkMergeModalOpen(true)}
      />

      {viewMode === 'people' ? (
        <ContactsTable
          contacts={contactsQuery.data?.data || []}
          totalCount={contactsQuery.data?.count || 0}
          page={page}
          pageSize={pageSize}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          onSortChange={handleSortChange}
          isLoading={contactsQuery.isLoading}
        />
      ) : (
        <CompaniesTable
          companies={companiesQuery.data?.data || []}
          totalCount={companiesQuery.data?.count || 0}
          page={page}
          pageSize={pageSize}
          sortBy={companySortBy}
          sortOrder={sortOrder}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          onSortChange={handleCompanySortChange}
          isLoading={companiesQuery.isLoading}
        />
      )}

      <ContactModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <BulkMergeDomainsModal
        open={isBulkMergeModalOpen}
        onOpenChange={setIsBulkMergeModalOpen}
      />
    </div>
  );
}
