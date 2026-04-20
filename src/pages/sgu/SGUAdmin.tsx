import { useMemo, useState } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { CommissionsHeader } from '@/components/sgu/headers/CommissionsHeader';
import { useSGUTeamId } from '@/hooks/useSGUTeamId';
import { useSGUAccess } from '@/hooks/useSGUAccess';
import { useAuth } from '@/contexts/AuthContext';
import { TeamAdminTab } from '@/components/sgu/admin/TeamAdminTab';
import { ProductsAdminTab } from '@/components/sgu/admin/ProductsAdminTab';
import { CommissionsSplitTab } from '@/components/sgu/admin/CommissionsSplitTab';
import { PipelineConfigTab } from '@/components/sgu/admin/PipelineConfigTab';
import { SGUSettingsTab } from '@/components/sgu/admin/SGUSettingsTab';

interface SGUAdminProps {
  section?: 'team' | 'products' | 'commissions' | 'representatives' | 'assignments' | 'case-d';
}

const SECTION_TO_TAB: Record<string, string> = {
  team: 'zespol',
  products: 'produkty',
  commissions: 'prowizje',
  pipeline: 'pipeline',
  settings: 'ustawienia',
  ustawienia: 'ustawienia',
};

const VALID_TABS = ['zespol', 'produkty', 'prowizje', 'pipeline', 'ustawienia'] as const;
type AdminTab = typeof VALID_TABS[number];

export default function SGUAdmin({ section }: SGUAdminProps = {}) {
  const params = useParams<{ section?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isPartner, isLoading: accessLoading } = useSGUAccess();
  const { director, loading: authLoading } = useAuth();
  const { sguTeamId, tenantId, isLoading: teamLoading } = useSGUTeamId();

  const initialTab = useMemo<AdminTab>(() => {
    const fromQuery = searchParams.get('tab');
    const fromRoute = section ?? params.section;
    const candidate = fromQuery ?? (fromRoute ? SECTION_TO_TAB[fromRoute] ?? fromRoute : null);
    return (VALID_TABS as readonly string[]).includes(candidate ?? '') ? (candidate as AdminTab) : 'zespol';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [tab, setTab] = useState<AdminTab>(initialTab);

  const handleTabChange = (next: string) => {
    const v = (VALID_TABS as readonly string[]).includes(next) ? (next as AdminTab) : 'zespol';
    setTab(v);
    const sp = new URLSearchParams(searchParams);
    sp.set('tab', v);
    setSearchParams(sp, { replace: true });
  };

  if (accessLoading || authLoading || teamLoading) {
    return <Skeleton className="h-96 w-full max-w-6xl mx-auto" />;
  }

  const allowed = isPartner || !!director;
  if (!allowed) return <Navigate to="/sgu" replace />;

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <CommissionsHeader teamId={sguTeamId ?? undefined} />
      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
          <TabsTrigger value="zespol">Zespół</TabsTrigger>
          <TabsTrigger value="produkty">Produkty</TabsTrigger>
          <TabsTrigger value="prowizje">Prowizje</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="ustawienia">Ustawienia</TabsTrigger>
        </TabsList>
        <TabsContent value="zespol" className="mt-4"><TeamAdminTab teamId={sguTeamId} /></TabsContent>
        <TabsContent value="produkty" className="mt-4"><ProductsAdminTab teamId={sguTeamId} /></TabsContent>
        <TabsContent value="prowizje" className="mt-4"><CommissionsSplitTab /></TabsContent>
        <TabsContent value="pipeline" className="mt-4"><PipelineConfigTab teamId={sguTeamId} tenantId={tenantId} /></TabsContent>
        <TabsContent value="ustawienia" className="mt-4"><SGUSettingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
