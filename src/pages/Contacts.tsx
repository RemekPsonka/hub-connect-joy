import { useState } from 'react';
import { useContacts } from '@/hooks/useContacts';
import { ContactsHeader } from '@/components/contacts/ContactsHeader';
import { ContactsTable } from '@/components/contacts/ContactsTable';
import { ContactModal } from '@/components/contacts/ContactModal';

export default function Contacts() {
  const [search, setSearch] = useState('');
  const [groupId, setGroupId] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('full_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data, isLoading } = useContacts({
    search,
    groupId: groupId === 'all' ? '' : groupId,
    page,
    pageSize: 20,
    sortBy,
    sortOrder,
  });

  const handleSortChange = (newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <ContactsHeader
        totalCount={data?.count || 0}
        search={search}
        onSearchChange={(value) => { setSearch(value); setPage(1); }}
        groupId={groupId}
        onGroupChange={(value) => { setGroupId(value); setPage(1); }}
        onAddContact={() => setIsModalOpen(true)}
      />

      <ContactsTable
        contacts={data?.data || []}
        totalCount={data?.count || 0}
        page={page}
        pageSize={20}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onPageChange={setPage}
        onSortChange={handleSortChange}
        isLoading={isLoading}
      />

      <ContactModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
