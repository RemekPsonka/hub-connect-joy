import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useSGUClientsPortfolio } from '@/hooks/useSGUClientsPortfolio';
import { ClientsKPI } from './clients/ClientsKPI';
import { ClientPortfolioTab } from './clients/ClientPortfolioTab';
import { ClientPaymentsTab } from './clients/ClientPaymentsTab';
import { ClientRenewalsTab } from './clients/ClientRenewalsTab';
import { ClientCrossSellTab } from './clients/ClientCrossSellTab';

interface Props {
  teamId: string;
}

const TAB_KEY = 'sgu-clients-tab';
type Tab = 'portfolio' | 'payments' | 'renewals' | 'crosssell';

export function SGUClientsView({ teamId }: Props) {
  const { data, isLoading } = useSGUClientsPortfolio(teamId);
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window === 'undefined') return 'portfolio';
    return (window.localStorage.getItem(TAB_KEY) as Tab) || 'portfolio';
  });

  const onTabChange = (v: string) => {
    const next = v as Tab;
    setTab(next);
    if (typeof window !== 'undefined') window.localStorage.setItem(TAB_KEY, next);
  };

  const rows = data?.rows ?? [];

  return (
    <div className="space-y-6">
      <ClientsKPI data={data} isLoading={isLoading} />

      <Tabs value={tab} onValueChange={onTabChange}>
        <TabsList>
          <TabsTrigger value="portfolio">Portfel</TabsTrigger>
          <TabsTrigger value="payments">Raty</TabsTrigger>
          <TabsTrigger value="renewals">Odnowienia</TabsTrigger>
          <TabsTrigger value="crosssell">Cross-sell</TabsTrigger>
        </TabsList>
        <TabsContent value="portfolio" className="mt-4">
          <ClientPortfolioTab rows={rows} isLoading={isLoading} />
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          <ClientPaymentsTab rows={rows} teamId={teamId} />
        </TabsContent>
        <TabsContent value="renewals" className="mt-4">
          <ClientRenewalsTab rows={rows} teamId={teamId} />
        </TabsContent>
        <TabsContent value="crosssell" className="mt-4">
          <ClientCrossSellTab rows={rows} teamId={teamId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
