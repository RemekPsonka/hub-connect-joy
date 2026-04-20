import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useSGUClientsPortfolio } from '@/hooks/useSGUClientsPortfolio';
import { ClientsHeader } from './headers/ClientsHeader';
import { ClientPortfolioTab } from './clients/ClientPortfolioTab';
import { ClientPaymentsTab } from './clients/ClientPaymentsTab';
import { ClientRenewalsTab } from './clients/ClientRenewalsTab';
import { ClientObszaryTab } from './clients/ClientObszaryTab';
import { ClientReferralsTab } from './clients/ClientReferralsTab';
import { ClientCommissionsTab } from './clients/ClientCommissionsTab';

interface Props {
  teamId: string;
}

type Tab = 'portfolio' | 'payments' | 'obszary' | 'referrals' | 'renewals' | 'commissions';

const VALID_TABS: Tab[] = ['portfolio', 'payments', 'obszary', 'referrals', 'renewals', 'commissions'];

export function SGUClientsView({ teamId }: Props) {
  const { data, isLoading } = useSGUClientsPortfolio(teamId);
  const [searchParams, setSearchParams] = useSearchParams();

  const rawTab = searchParams.get('tab') as Tab | null;
  const tab: Tab = rawTab && VALID_TABS.includes(rawTab) ? rawTab : 'portfolio';
  const selectedClientId = searchParams.get('clientId');

  const updateParams = (next: { tab?: Tab; clientId?: string | null }) => {
    const params = new URLSearchParams(searchParams);
    if (next.tab) params.set('tab', next.tab);
    if (next.clientId === null) params.delete('clientId');
    else if (next.clientId) params.set('clientId', next.clientId);
    setSearchParams(params, { replace: true });
  };

  const onTabChange = (v: string) => {
    updateParams({ tab: v as Tab, clientId: null });
  };

  const onSelectClient = (id: string) => {
    updateParams({ tab: 'obszary', clientId: id });
  };

  const onHeaderCardClick = (key: string) => {
    const map: Record<string, Tab> = {
      active: 'portfolio',
      portfolio: 'portfolio',
      ambassadors: 'portfolio',
      complex: 'obszary',
      renewals: 'renewals',
      overdue: 'payments',
      commission: 'commissions',
    };
    const target = map[key];
    if (target) updateParams({ tab: target, clientId: null });
  };

  const rows = data?.rows ?? [];

  return (
    <div className="space-y-6">
      <ClientsHeader data={data} isLoading={isLoading} onCardClick={onHeaderCardClick} />

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
          <ClientPortfolioTab rows={rows} isLoading={isLoading} teamId={teamId} onSelectClient={onSelectClient} />
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          <ClientPaymentsTab rows={rows} teamId={teamId} />
        </TabsContent>
        <TabsContent value="obszary" className="mt-4">
          <ClientObszaryTab rows={rows} teamId={teamId} selectedClientId={selectedClientId} />
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
