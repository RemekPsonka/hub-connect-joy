import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PolicyKPICards } from './PolicyKPICards';
import { PolicyTimelineView } from './PolicyTimelineView';
import { PolicyFunnelView } from './PolicyFunnelView';
import { PolicyFinancialReports } from './PolicyFinancialReports';
import { ProductionDashboard } from './ProductionDashboard';
import { useAllPolicies } from '@/hooks/useAllPolicies';
import { Skeleton } from '@/components/ui/skeleton';
import type { RenewalChecklist } from '@/components/renewal/types';
import type { Json } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function PolicyPipelineDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { policies, stats, isLoading, toggleOurPolicy } = useAllPolicies();
  const queryClient = useQueryClient();

  const handleChecklistChange = async (policyId: string, checklist: RenewalChecklist) => {
    try {
      const { error } = await supabase
        .from('insurance_policies')
        .update({ renewal_checklist: checklist as unknown as Json })
        .eq('id', policyId);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['all-policies'] });
    } catch (error) {
      console.error('Error updating checklist:', error);
      toast.error('Nie udało się zaktualizować checklisty');
    }
  };

  const handleToggleOurPolicy = (policyId: string, isOurs: boolean) => {
    toggleOurPolicy.mutate({ policyId, isOurs });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        Brak danych do wyświetlenia
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PolicyKPICards stats={stats} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="planning">Planowanie</TabsTrigger>
          <TabsTrigger value="reports">Raporty finansowe</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Timeline - lewy panel */}
            <div className="lg:col-span-1 h-[600px] border rounded-lg p-4 bg-card">
              <h3 className="text-sm font-semibold mb-4">Harmonogram wygasania</h3>
              <PolicyTimelineView policies={policies} />
            </div>

            {/* Funnel - prawy panel */}
            <div className="lg:col-span-3">
              <PolicyFunnelView
                stats={stats}
                onChecklistChange={handleChecklistChange}
                onToggleOurPolicy={handleToggleOurPolicy}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          <div className="h-[700px] border rounded-lg p-6 bg-card">
            <PolicyTimelineView policies={policies} />
          </div>
        </TabsContent>

        <TabsContent value="planning" className="mt-6">
          <ProductionDashboard />
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <PolicyFinancialReports stats={stats} yearlyGoal={5000000} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
