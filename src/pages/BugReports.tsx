import { useState } from 'react';
import { useBugReports, useBugReportsCount, useUpdateBugReportStatus, useDeleteBugReport, type BugReportsFilters } from '@/hooks/useBugReports';
import { BugReportsHeader } from '@/components/bugs/BugReportsHeader';
import { BugReportCard } from '@/components/bugs/BugReportCard';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Bug } from 'lucide-react';

export default function BugReports() {
  const [filters, setFilters] = useState<BugReportsFilters>({});
  
  const { data: reports, isLoading } = useBugReports(filters);
  const { data: openCount = 0 } = useBugReportsCount();
  const updateStatus = useUpdateBugReportStatus();
  const deleteBugReport = useDeleteBugReport();

  const handleUpdateStatus = (id: string, status: string, notes?: string) => {
    updateStatus.mutate({ id, status, resolutionNotes: notes });
  };

  const handleDelete = (id: string) => {
    deleteBugReport.mutate(id);
  };

  return (
    <div className="space-y-6 h-full overflow-auto">
      <BugReportsHeader
        filters={filters}
        onFiltersChange={setFilters}
        totalCount={reports?.length || 0}
        openCount={openCount}
      />

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : reports && reports.length > 0 ? (
        <div className="space-y-4">
          {reports.map((report) => (
            <BugReportCard
              key={report.id}
              report={report}
              onUpdateStatus={handleUpdateStatus}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Bug}
          title="Brak zgłoszeń"
          description={
            filters.status || filters.priority
              ? 'Brak zgłoszeń pasujących do wybranych filtrów'
              : 'Wszystko działa poprawnie! Kliknij czerwony przycisk w prawym dolnym rogu, aby zgłosić problem.'
          }
        />
      )}
    </div>
  );
}
