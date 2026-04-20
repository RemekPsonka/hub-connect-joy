import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useSGUClientsPortfolio } from '@/hooks/useSGUClientsPortfolio';
import { ClientsKPI } from './clients/ClientsKPI';
import { ClientPortfolioTab } from './clients/ClientPortfolioTab';
import { ClientPaymentsTab } from './clients/ClientPaymentsTab';
import { ClientRenewalsTab } from './clients/ClientRenewalsTab';
import { ClientObszaryTab } from './clients/ClientObszaryTab';
import { ClientReferralsTab } from './clients/ClientReferralsTab';
import { ClientCommissionsTab } from './clients/ClientCommissionsTab';

interface Props {
  teamId: string;
}

const TAB_KEY = 'sgu-clients-tab';
type Tab = 'portfolio' | 'payments' | 'obszary' | 'referrals' | 'renewals' | 'commissions';

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
          <TabsTrigger value="obszary">Obszary</TabsTrigger>
          <TabsTrigger value="referrals">Polecenia</TabsTrigger>
          <TabsTrigger value="renewals">Odnowienia</TabsTrigger>
          <TabsTrigger value="commissions">Prowizje</TabsTrigger>
        </TabsList>
        <TabsContent value="portfolio" className="mt-4">
          <ClientPortfolioTab rows={rows} isLoading={isLoading} />
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          <ClientPaymentsTab rows={rows} teamId={teamId} />
        </TabsContent>
        <TabsContent value="obszary" className="mt-4">
          <ClientObszaryTab rows={rows} teamId={teamId} />
        </TabsContent>
        <TabsContent value="referrals" className="mt-4">
          <ClientReferralsTab rows={rows} teamId={teamId} />
        </TabsContent>
        <TabsContent value="renewals" className="mt-4">
          <ClientRenewalsTab rows={rows} teamId={teamId} />
        </TabsContent>
        <TabsContent value="commissions" className="mt-4">
          <ClientCommissionsTab teamId={teamId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
