import { useState, useMemo } from 'react';
import { useConsultations } from '@/hooks/useConsultations';
import { ConsultationsHeader } from '@/components/consultations/ConsultationsHeader';
import { ConsultationsList } from '@/components/consultations/ConsultationsList';
import { ConsultationsCalendar } from '@/components/consultations/ConsultationsCalendar';
import { ConsultationModal } from '@/components/consultations/ConsultationModal';

export default function Consultations() {
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filters = useMemo(
    () => ({
      status: statusFilter as 'all' | 'scheduled' | 'completed' | 'cancelled' | 'no_show',
      search: searchQuery || undefined,
      pageSize: 50,
    }),
    [statusFilter, searchQuery]
  );

  const { data, isLoading } = useConsultations(filters);

  const consultations = data?.consultations || [];
  const upcomingCount = consultations.filter(
    (c) => new Date(c.scheduled_at) >= new Date() && c.status === 'scheduled'
  ).length;

  return (
    <div className="space-y-6">
      <ConsultationsHeader
        upcomingCount={upcomingCount}
        view={view}
        onViewChange={setView}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddClick={() => setIsModalOpen(true)}
      />

      {view === 'list' ? (
        <ConsultationsList consultations={consultations} isLoading={isLoading} />
      ) : (
        <ConsultationsCalendar consultations={consultations} />
      )}

      <ConsultationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
