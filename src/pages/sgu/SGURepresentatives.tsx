import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useSGURepresentatives } from '@/hooks/useSGURepresentatives';
import { useReactivateRep } from '@/hooks/useDeactivateRep';
import { InviteRepDialog } from '@/components/sgu/InviteRepDialog';
import { RepCard } from '@/components/sgu/RepCard';
import { RepSettingsPanel } from '@/components/sgu/RepSettingsPanel';
import type { SGURepresentativeProfile, RepStatusFilter } from '@/types/sgu-representative';

export default function SGURepresentatives() {
  const [tab, setTab] = useState<RepStatusFilter>('active');
  const [selected, setSelected] = useState<SGURepresentativeProfile | null>(null);
  const { data: reps, isLoading } = useSGURepresentatives(tab);
  const reactivate = useReactivateRep();

  const handleReactivate = (rep: SGURepresentativeProfile) => {
    reactivate.mutate({ userId: rep.user_id });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Przedstawiciele SGU</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Zarządzaj zespołem przedstawicieli sieci.
          </p>
        </div>
        <InviteRepDialog />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as RepStatusFilter)}>
        <TabsList>
          <TabsTrigger value="active">Aktywni</TabsTrigger>
          <TabsTrigger value="all">Wszyscy</TabsTrigger>
          <TabsTrigger value="deactivated">Dezaktywowani</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Przedstawiciel</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <td colSpan={5} className="p-3"><Skeleton className="h-10 w-full" /></td>
                    </TableRow>
                  ))
                ) : (reps ?? []).length === 0 ? (
                  <TableRow>
                    <td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">
                      Brak przedstawicieli w tej kategorii.
                    </td>
                  </TableRow>
                ) : (
                  reps!.map((rep) => (
                    <RepCard
                      key={rep.user_id}
                      rep={rep}
                      onOpen={setSelected}
                      onDeactivate={setSelected}
                      onReactivate={handleReactivate}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <RepSettingsPanel rep={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
