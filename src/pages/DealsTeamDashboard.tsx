import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Users, Plus } from 'lucide-react';
import { useMyDealTeams } from '@/hooks/useDealTeams';
import { useTeamContactStats } from '@/hooks/useDealsTeamContacts';
import {
  TeamSelector,
  KanbanBoard,
  CreateTeamDialog,
  WeeklyStatusPanel,
  TableView,
  TeamSettings,
  ProspectingTab,
  ClientsTab,
  CommissionsTab,
  MyTeamTasksView,
  SnoozedTeamView,
  OfferingTab,
  SalesFunnelDashboard,
} from '@/components/deals-team';
import { CommissionsTable } from '@/components/sgu/CommissionsTable';
import { SGUClientsView } from '@/components/sgu/SGUClientsView';
import { useLayoutMode } from '@/store/layoutMode';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

type ViewMode = 'kanban' | 'table' | 'prospecting' | 'clients' | 'commissions' | 'entries' | 'tasks' | 'snoozed' | 'offering' | 'dashboard';

const STORAGE_KEY = 'deals-team-selected';
const VALID_VIEWS: ViewMode[] = ['kanban', 'table', 'prospecting', 'clients', 'commissions', 'entries', 'tasks', 'snoozed', 'offering', 'dashboard'];

interface DealsTeamDashboardProps {
  /** When set, locks the dashboard to this team and hides team-management UI (used by SGU pipeline route). */
  forcedTeamId?: string;
}

export default function DealsTeamDashboard({ forcedTeamId }: DealsTeamDashboardProps = {}) {
  const { data: teams = [], isLoading: teamsLoading } = useMyDealTeams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [selectedTeamIdState, setSelectedTeamId] = useState<string>(() => {
    if (forcedTeamId) return forcedTeamId;
    return localStorage.getItem(STORAGE_KEY) || '';
  });
  const selectedTeamId = forcedTeamId ?? selectedTeamIdState;

  const currentView = searchParams.get('view') as ViewMode;
  const viewMode: ViewMode = VALID_VIEWS.includes(currentView) ? currentView : 'kanban';

  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showWeeklyStatus, setShowWeeklyStatus] = useState(false);
  const [showTeamSettings, setShowTeamSettings] = useState(false);
  const [commissionsTab, setCommissionsTab] = useState<'entries' | 'goals'>(() => {
    if (typeof window === 'undefined') return 'entries';
    return (window.localStorage.getItem('sgu-commissions-tab') as 'entries' | 'goals') || 'entries';
  });

  const contactStats = useTeamContactStats(selectedTeamId || undefined);

  // SGU-REFACTOR-IA: redirect old ?view= URLs to /sgu/* (only when NOT in forced/SGU embed mode)
  useEffect(() => {
    if (forcedTeamId) return;
    const view = searchParams.get('view');
    if (!view) return;
    const map: Record<string, string> = {
      dashboard: '/sgu',
      kanban: '/sgu/sprzedaz',
      table: '/sgu/sprzedaz',
      prospecting: '/sgu/sprzedaz',
      offering: '/sgu/sprzedaz',
      snoozed: '/sgu/sprzedaz',
      clients: '/sgu/klienci',
      commissions: '/sgu/klienci',
      entries: '/sgu/klienci',
      tasks: '/sgu/zadania',
    };
    const target = map[view];
    if (target) {
      toast.info('Ten widok jest teraz w SGU', { description: `Przekierowuje do ${target}` });
      navigate(target, { replace: true });
    }
  }, [searchParams, navigate, forcedTeamId]);

  useEffect(() => {
    if (forcedTeamId) return;
    if (!teamsLoading && teams.length > 0 && !selectedTeamId) {
      const firstTeamId = teams[0].id;
      setSelectedTeamId(firstTeamId);
      localStorage.setItem(STORAGE_KEY, firstTeamId);
    }
  }, [teams, teamsLoading, selectedTeamId, forcedTeamId]);

  useEffect(() => {
    if (forcedTeamId) return;
    if (selectedTeamId) {
      localStorage.setItem(STORAGE_KEY, selectedTeamId);
    }
  }, [selectedTeamId, forcedTeamId]);

  const handleTeamChange = (teamId: string) => setSelectedTeamId(teamId);
  const handleTeamCreated = (teamId: string) => setSelectedTeamId(teamId);
  const handleSettingsClick = () => setShowTeamSettings(true);

  const handleNavigate = (view: string) => {
    setSearchParams({ view });
  };

  if (teamsLoading && !forcedTeamId) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-10 w-64 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-96 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!forcedTeamId && teams.length === 0) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Brak zespołów dealowych</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Utwórz pierwszy zespół, aby zarządzać kontaktami dealowymi w widoku Kanban
          </p>
          <Button onClick={() => setShowCreateTeam(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Utwórz pierwszy zespół
          </Button>
        </div>
        <CreateTeamDialog
          open={showCreateTeam}
          onOpenChange={setShowCreateTeam}
          onTeamCreated={handleTeamCreated}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header — hidden in forced (SGU) mode */}
      {!forcedTeamId && (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <TeamSelector
            selectedTeamId={selectedTeamId}
            onTeamChange={handleTeamChange}
            teams={teams}
            contactStats={contactStats}
            onSettingsClick={handleSettingsClick}
          />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setShowCreateTeam(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* TeamStats removed in SGU-REFACTOR-IA-2 — replaced by context-aware headers per route */}

      {/* Content */}
      {selectedTeamId && viewMode === 'dashboard' && (
        <SalesFunnelDashboard teamId={selectedTeamId} onNavigate={handleNavigate} />
      )}
      {selectedTeamId && viewMode === 'kanban' && <KanbanBoard teamId={selectedTeamId} />}
      {selectedTeamId && viewMode === 'table' && <TableView teamId={selectedTeamId} />}
      {selectedTeamId && viewMode === 'prospecting' && <ProspectingTab teamId={selectedTeamId} />}
      {selectedTeamId && viewMode === 'clients' && (
        forcedTeamId ? (
          <SGUClientsView teamId={selectedTeamId} />
        ) : (
          <ClientsTab teamId={selectedTeamId} />
        )
      )}
      {selectedTeamId && viewMode === 'tasks' && <MyTeamTasksView teamId={selectedTeamId} />}
      {selectedTeamId && viewMode === 'commissions' && forcedTeamId && (
        <Tabs
          value={commissionsTab}
          onValueChange={(v) => {
            const next = v as 'entries' | 'goals';
            setCommissionsTab(next);
            if (typeof window !== 'undefined') {
              window.localStorage.setItem('sgu-commissions-tab', next);
            }
          }}
        >
          <TabsList>
            <TabsTrigger value="entries">Wpisy</TabsTrigger>
            <TabsTrigger value="goals">Cele</TabsTrigger>
          </TabsList>
          <TabsContent value="entries" className="mt-4">
            <CommissionsTable teamId={selectedTeamId} />
          </TabsContent>
          <TabsContent value="goals" className="mt-4">
            <CommissionsTab teamId={selectedTeamId} />
          </TabsContent>
        </Tabs>
      )}
      {selectedTeamId && viewMode === 'commissions' && !forcedTeamId && <CommissionsTab teamId={selectedTeamId} />}
      {selectedTeamId && viewMode === 'entries' && <CommissionsTable teamId={selectedTeamId} />}
      {selectedTeamId && viewMode === 'snoozed' && <SnoozedTeamView teamId={selectedTeamId} />}
      {selectedTeamId && viewMode === 'offering' && <OfferingTab teamId={selectedTeamId} />}

      <CreateTeamDialog open={showCreateTeam} onOpenChange={setShowCreateTeam} onTeamCreated={handleTeamCreated} />
      {selectedTeamId && <WeeklyStatusPanel teamId={selectedTeamId} open={showWeeklyStatus} onOpenChange={setShowWeeklyStatus} />}
      {selectedTeamId && <TeamSettings teamId={selectedTeamId} open={showTeamSettings} onOpenChange={setShowTeamSettings} />}
    </div>
  );
}
