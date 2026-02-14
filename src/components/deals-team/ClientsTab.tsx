import { useState, useMemo } from 'react';
import { Search, X, UserCheck, Plus, BarChart3 } from 'lucide-react';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';
import { TaskModal } from '@/components/tasks/TaskModal';
import type { TaskWithDetails } from '@/hooks/useTasks';
import { useTeamClients } from '@/hooks/useTeamClients';
import { ClientCard } from './ClientCard';
import { AddClientDialog } from './AddClientDialog';
import { ClientsSummaryView } from './ClientsSummaryView';
import { DealContactDetailSheet } from './DealContactDetailSheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { DealTeamContact } from '@/types/dealTeam';

interface ClientsTabProps {
  teamId: string;
}

export function ClientsTab({ teamId }: ClientsTabProps) {
  const { data: clients = [], isLoading } = useTeamClients(teamId);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddClient, setShowAddClient] = useState(false);
  const [selectedClient, setSelectedClient] = useState<DealTeamContact | null>(null);
  const [taskForDetail, setTaskForDetail] = useState<TaskWithDetails | null>(null);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [taskEditOpen, setTaskEditOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const q = searchQuery.toLowerCase();
    return clients.filter(
      (c) =>
        c.contact?.full_name?.toLowerCase().includes(q) ||
        c.contact?.company?.toLowerCase().includes(q)
    );
  }, [clients, searchQuery]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  return (
    <>
      <Tabs defaultValue="list">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold">Klienci ({clients.length})</h2>
          </div>
          <div className="flex items-center gap-2">
            <TabsList>
              <TabsTrigger value="list" className="text-xs">Lista</TabsTrigger>
              <TabsTrigger value="summary" className="text-xs gap-1">
                <BarChart3 className="h-3.5 w-3.5" />
                Podsumowanie
              </TabsTrigger>
            </TabsList>
            <Button onClick={() => setShowAddClient(true)} size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4" />
              Dodaj klienta
            </Button>
          </div>
        </div>

        <TabsContent value="list">
          {/* Search */}
          <div className="mb-4 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Szukaj klienta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Client list */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
                <UserCheck className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'Nie znaleziono klientów' : 'Brak klientów. Dodaj klienta z CRM lub skonwertuj leada.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((client) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  onClick={() => setSelectedClient(client)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="summary">
          <ClientsSummaryView teamId={teamId} />
        </TabsContent>
      </Tabs>

      <AddClientDialog open={showAddClient} onOpenChange={setShowAddClient} teamId={teamId} />

      <DealContactDetailSheet
        contact={selectedClient}
        teamId={teamId}
        open={selectedClient !== null}
        onOpenChange={(open) => !open && setSelectedClient(null)}
        onTaskOpen={(task) => { setTaskForDetail(task); setTaskDetailOpen(true); }}
      />

      {taskForDetail && (
        <TaskDetailSheet
          open={taskDetailOpen}
          onOpenChange={setTaskDetailOpen}
          task={taskForDetail}
          onEdit={() => {
            setTaskDetailOpen(false);
            setTaskEditOpen(true);
          }}
        />
      )}
      <TaskModal
        open={taskEditOpen}
        onOpenChange={(o) => { setTaskEditOpen(o); if (!o) setTaskForDetail(null); }}
        task={taskForDetail}
      />
    </>
  );
}
