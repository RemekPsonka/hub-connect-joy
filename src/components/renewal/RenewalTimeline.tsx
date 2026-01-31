import { useState, useMemo, useCallback } from 'react';
import { addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Loader2, Calendar } from 'lucide-react';
import { useInsurancePolicies } from '@/hooks/useInsurancePolicies';
import { TimelineToolbar } from './TimelineToolbar';
import { TimelineHeader, getTimelinePeriods } from './TimelineHeader';
import { TimelineLegend } from './TimelineLegend';
import { TimelineRow } from './TimelineRow';
import { AddPolicyModal } from './AddPolicyModal';
import { EditPolicyModal } from './EditPolicyModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  POLICY_TYPE_LABELS, 
  type TimeViewMode, 
  type PolicyType,
  type RenewalChecklist,
  type InsurancePolicy,
} from './types';

interface RenewalTimelineProps {
  companyId: string;
}

export function RenewalTimeline({ companyId }: RenewalTimelineProps) {
  const [viewMode, setViewMode] = useState<TimeViewMode>('months');
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [policyToEdit, setPolicyToEdit] = useState<InsurancePolicy | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState<string | null>(null);

  const {
    policies,
    isLoading,
    createPolicy,
    updatePolicy,
    deletePolicy,
    updateChecklist,
    criticalPolicies,
  } = useInsurancePolicies(companyId);

  // Calculate timeline bounds based on policies
  const { timelineStart, timelineEnd, periods } = useMemo(() => {
    const today = new Date();
    let minDate = subMonths(today, 3);
    let maxDate = addMonths(today, 12);

    if (policies.length > 0) {
      const policyDates = policies.flatMap(p => [
        new Date(p.start_date),
        new Date(p.end_date),
      ]);
      const earliestPolicy = new Date(Math.min(...policyDates.map(d => d.getTime())));
      const latestPolicy = new Date(Math.max(...policyDates.map(d => d.getTime())));
      
      minDate = new Date(Math.min(minDate.getTime(), subMonths(earliestPolicy, 1).getTime()));
      maxDate = new Date(Math.max(maxDate.getTime(), addMonths(latestPolicy, 3).getTime()));
    }

    const start = startOfMonth(minDate);
    const end = endOfMonth(maxDate);
    const periodsList = getTimelinePeriods(start, end, viewMode);

    return { timelineStart: start, timelineEnd: end, periods: periodsList };
  }, [policies, viewMode]);

  const criticalPolicyIds = useMemo(
    () => new Set(criticalPolicies.map(p => p.id)),
    [criticalPolicies]
  );

  // Get unique policy types that have data
  const activePolicyTypes = useMemo(() => {
    const types = new Set(policies.map(p => p.policy_type));
    return (Object.keys(POLICY_TYPE_LABELS) as PolicyType[]).filter(t => types.has(t));
  }, [policies]);

  const handleChecklistChange = useCallback((
    policyId: string,
    key: keyof RenewalChecklist,
    value: boolean
  ) => {
    const policy = policies.find(p => p.id === policyId);
    if (!policy) return;

    const newChecklist = {
      ...policy.renewal_checklist,
      [key]: value,
    };

    updateChecklist.mutate({ policyId, checklist: newChecklist });
  }, [policies, updateChecklist]);

  const handleAddPolicy = useCallback((data: Parameters<typeof createPolicy.mutate>[0]) => {
    createPolicy.mutate(data, {
      onSuccess: () => setAddModalOpen(false),
    });
  }, [createPolicy]);

  const handleEditPolicy = useCallback((policy: InsurancePolicy) => {
    setPolicyToEdit(policy);
    setEditModalOpen(true);
  }, []);

  const handleUpdatePolicy = useCallback((data: Parameters<typeof updatePolicy.mutate>[0]) => {
    updatePolicy.mutate(data, {
      onSuccess: () => {
        setEditModalOpen(false);
        setPolicyToEdit(null);
      },
    });
  }, [updatePolicy]);

  const handleDeletePolicy = useCallback((policyId: string) => {
    setPolicyToDelete(policyId);
    setDeleteConfirmOpen(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (policyToDelete) {
      deletePolicy.mutate(policyToDelete, {
        onSuccess: () => {
          setDeleteConfirmOpen(false);
          setPolicyToDelete(null);
        },
      });
    }
  }, [policyToDelete, deletePolicy]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div 
      className={`rounded-lg border overflow-hidden ${
        darkMode ? 'bg-slate-900 border-slate-700' : 'bg-card'
      }`}
    >
      <TimelineToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showCriticalPath={showCriticalPath}
        onCriticalPathChange={setShowCriticalPath}
        darkMode={darkMode}
        onDarkModeChange={setDarkMode}
        criticalCount={criticalPolicies.length}
        onAddPolicy={() => setAddModalOpen(true)}
      />

      <TimelineLegend darkMode={darkMode} />

      {policies.length === 0 ? (
        <div 
          className={`flex flex-col items-center justify-center py-16 ${
            darkMode ? 'text-slate-400' : 'text-muted-foreground'
          }`}
        >
          <Calendar className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium mb-1">Brak polis do wyświetlenia</p>
          <p className="text-sm">Dodaj pierwszą polisę, aby zobaczyć harmonogram odnowień</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <TimelineHeader
              startDate={timelineStart}
              endDate={timelineEnd}
              viewMode={viewMode}
              darkMode={darkMode}
            />

            {activePolicyTypes.map(policyType => (
              <TimelineRow
                key={policyType}
                policyType={policyType}
                policies={policies}
                timelineStart={timelineStart}
                timelineEnd={timelineEnd}
                periodCount={periods.length}
                darkMode={darkMode}
                criticalPolicyIds={criticalPolicyIds}
                onEditPolicy={handleEditPolicy}
                onDeletePolicy={handleDeletePolicy}
                showCriticalPath={showCriticalPath}
                onChecklistChange={handleChecklistChange}
              />
            ))}
          </div>
        </div>
      )}

      <AddPolicyModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        companyId={companyId}
        onSubmit={handleAddPolicy}
        isLoading={createPolicy.isPending}
      />

      <EditPolicyModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        policy={policyToEdit}
        onSubmit={handleUpdatePolicy}
        isLoading={updatePolicy.isPending}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć polisę?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta operacja jest nieodwracalna. Polisa zostanie trwale usunięta z harmonogramu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletePolicy.isPending}
            >
              {deletePolicy.isPending ? 'Usuwanie...' : 'Usuń polisę'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
