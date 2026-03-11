import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Users, Plus } from 'lucide-react';
import { useMyDealTeams } from '@/hooks/useDealTeams';
import { useTeamContactStats } from '@/hooks/useDealsTeamContacts';
import {
  TeamSelector,
  KanbanBoard,
  CreateTeamDialog,
  WeeklyStatusPanel,
  TeamStats,
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
import { Button } from '@/components/ui/button';

type ViewMode = 'kanban' | 'table' | 'prospecting' | 'clients' | 'commissions' | 'tasks' | 'snoozed' | 'offering' | 'dashboard';

const STORAGE_KEY = 'deals-team-selected';
const VALID_VIEWS: ViewMode[] = ['kanban', 'table', 'prospecting', 'clients', 'commissions', 'tasks', 'snoozed', 'offering', 'dashboard'];

export default function DealsTeamDashboard() {
  const { data: teams = [], isLoading: teamsLoading } = useMyDealTeams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [selectedTeamId, setSelectedTeamId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || '';
  });

  const currentView = searchParams.get('view') as ViewMode;
  const viewMode: ViewMode = VALID_VIEWS.includes(currentView) ? currentView : 'kanban';

  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showWeeklyStatus, setShowWeeklyStatus] = useState(false);
  const [showTeamSettings, setShowTeamSettings] = useState(false);

  const contactStats = useTeamContactStats(selectedTeamId || undefined);

  useEffect(() => {
    if (!teamsLoading && teams.length > 0 && !selectedTeamId) {
      const firstTeamId = teams[0].id;
      setSelectedTeamId(firstTeamId);
      localStorage.setItem(STORAGE_KEY, firstTeamId);
    }
  }, [teams, teamsLoading, selectedTeamId]);

  useEffect(() => {
    if (selectedTeamId) {
      localStorage.setItem(STORAGE_KEY, selectedTeamId);
    }
  }, [selectedTeamId]);

  const handleTeamChange = (teamId: string) => setSelectedTeamId(teamId);
  const handleTeamCreated = (teamId: string) => setSelectedTeamId(teamId);
  const handleSettingsClick = () => setShowTeamSettings(true);

  const handleNavigate = (view: string) => {
    setSearchParams({ view });
  };

  if (teamsLoading) {
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

  if (teams.length === 0) {
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
      {/* Header */}
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

      {/* Stats - always visible when team selected (except dashboard, tasks, kanban) */}
      {selectedTeamId && viewMode !== 'dashboard' && viewMode !== 'tasks' && viewMode !== 'kanban' && <TeamStats teamId={selectedTeamId} />}

      {/* Content */}
      {selectedTeamId && viewMode === 'dashboard' && (
        <SalesFunnelDashboard teamId={selectedTeamId} onNavigate={handleNavigate} />
      )}
      {selectedTeamId && viewMode === 'kanban' && <KanbanBoard teamId={selectedTeamId} />}
      {selectedTeamId && viewMode === 'table' && <TableView teamId={selectedTeamId} />}
      {selectedTeamId && viewMode === 'prospecting' && <ProspectingTab teamId={selectedTeamId} />}
      {selectedTeamId && viewMode === 'clients' && <ClientsTab teamId={selectedTeamId} />}
      {selectedTeamId && viewMode === 'tasks' && <MyTeamTasksView teamId={selectedTeamId} />}
      {selectedTeamId && viewMode === 'commissions' && <CommissionsTab teamId={selectedTeamId} />}
      {selectedTeamId && viewMode === 'snoozed' && <SnoozedTeamView teamId={selectedTeamId} />}
      {selectedTeamId && viewMode === 'offering' && <OfferingTab teamId={selectedTeamId} />}

      <CreateTeamDialog open={showCreateTeam} onOpenChange={setShowCreateTeam} onTeamCreated={handleTeamCreated} />
      {selectedTeamId && <WeeklyStatusPanel teamId={selectedTeamId} open={showWeeklyStatus} onOpenChange={setShowWeeklyStatus} />}
      {selectedTeamId && <TeamSettings teamId={selectedTeamId} open={showTeamSettings} onOpenChange={setShowTeamSettings} />}
    </div>
  );
}
