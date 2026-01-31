import { useState } from 'react';
import { useRepresentatives } from '@/hooks/useRepresentatives';
import { useRepresentativeContacts } from '@/hooks/useRepresentativeContacts';
import { RepresentativesList } from '@/components/representatives/RepresentativesList';
import { RepContactsTable } from '@/components/representatives/RepContactsTable';
import { AddRepresentativeModal } from '@/components/representatives/AddRepresentativeModal';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, UserPlus, FileText } from 'lucide-react';

export default function Representatives() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedRepId, setSelectedRepId] = useState<string | undefined>(undefined);
  
  const { representatives, isLoading: isLoadingReps } = useRepresentatives();
  const { assignments, isLoading: isLoadingAssignments } = useRepresentativeContacts(selectedRepId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Przedstawiciele handlowi</h1>
          <p className="text-muted-foreground">
            Zarządzaj przedstawicielami i ambasadorami oraz przekazywanymi kontaktami
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Dodaj przedstawiciela
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="representatives" className="space-y-4">
        <TabsList>
          <TabsTrigger value="representatives" className="gap-2">
            <Users className="h-4 w-4" />
            Przedstawiciele ({representatives?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="assignments" className="gap-2">
            <FileText className="h-4 w-4" />
            Przekazane kontakty ({assignments?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="representatives">
          <RepresentativesList
            representatives={representatives || []}
            isLoading={isLoadingReps}
            onSelectRepresentative={setSelectedRepId}
          />
        </TabsContent>

        <TabsContent value="assignments">
          <RepContactsTable
            assignments={assignments || []}
            isLoading={isLoadingAssignments}
            selectedRepId={selectedRepId}
            onSelectRepresentative={setSelectedRepId}
            representatives={representatives || []}
          />
        </TabsContent>
      </Tabs>

      <AddRepresentativeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
}
