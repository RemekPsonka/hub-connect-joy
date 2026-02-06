import { useState, useEffect } from 'react';
import { LayoutGrid, List, Users, Plus, BarChart3 } from 'lucide-react';
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
} from '@/components/deals-team';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ViewMode = 'kanban' | 'table';

const STORAGE_KEY = 'deals-team-selected';

export default function DealsTeamDashboard() {
  const { data: teams = [], isLoading: teamsLoading } = useMyDealTeams();

  // Load selected team from localStorage
  const [selectedTeamId, setSelectedTeamId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || '';
  });

  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showWeeklyStatus, setShowWeeklyStatus] = useState(false);
  const [showTeamSettings, setShowTeamSettings] = useState(false);

  // Get stats for selected team
  const contactStats = useTeamContactStats(selectedTeamId || undefined);

  // Auto-select first team if none selected
  useEffect(() => {
    if (!teamsLoading && teams.length > 0 && !selectedTeamId) {
      const firstTeamId = teams[0].id;
      setSelectedTeamId(firstTeamId);
      localStorage.setItem(STORAGE_KEY, firstTeamId);
    }
  }, [teams, teamsLoading, selectedTeamId]);

  // Persist selected team to localStorage
  useEffect(() => {
    if (selectedTeamId) {
      localStorage.setItem(STORAGE_KEY, selectedTeamId);
    }
  }, [selectedTeamId]);

  const handleTeamChange = (teamId: string) => {
    setSelectedTeamId(teamId);
  };

  const handleTeamCreated = (teamId: string) => {
    setSelectedTeamId(teamId);
  };

  const handleSettingsClick = () => {
    setShowTeamSettings(true);
  };

  const overdueCount = contactStats?.overdue_count || 0;

  // Loading state
  if (teamsLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-10 w-64 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
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

  // Empty state - no teams
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
          {/* Weekly Status Button */}
          <Button
            variant="outline"
            onClick={() => setShowWeeklyStatus(true)}
            className="gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Statusy</span>
            {overdueCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {overdueCount}
              </Badge>
            )}
          </Button>

          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="kanban" className="gap-2">
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">Kanban</span>
              </TabsTrigger>
              <TabsTrigger value="table" className="gap-2">
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Tabela</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button variant="outline" size="icon" onClick={() => setShowCreateTeam(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats - always visible when team selected */}
      {selectedTeamId && <TeamStats teamId={selectedTeamId} />}

      {/* Content */}
      {selectedTeamId && viewMode === 'kanban' && (
        <KanbanBoard teamId={selectedTeamId} />
      )}

      {selectedTeamId && viewMode === 'table' && (
        <TableView teamId={selectedTeamId} />
      )}

      {/* Create Team Dialog */}
      <CreateTeamDialog
        open={showCreateTeam}
        onOpenChange={setShowCreateTeam}
        onTeamCreated={handleTeamCreated}
      />

      {/* Weekly Status Panel */}
      {selectedTeamId && (
        <WeeklyStatusPanel
          teamId={selectedTeamId}
          open={showWeeklyStatus}
          onOpenChange={setShowWeeklyStatus}
        />
      )}

      {/* Team Settings */}
      {selectedTeamId && (
        <TeamSettings
          teamId={selectedTeamId}
          open={showTeamSettings}
          onOpenChange={setShowTeamSettings}
        />
      )}
    </div>
  );
}
