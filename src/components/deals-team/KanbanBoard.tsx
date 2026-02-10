import { useMemo, useState } from 'react';
import { useTeamContacts } from '@/hooks/useDealsTeamContacts';
import { useTeamProspects } from '@/hooks/useDealsTeamProspects';
import { KanbanColumn } from './KanbanColumn';
import { HotLeadCard } from './HotLeadCard';
import { TopLeadCard } from './TopLeadCard';
import { LeadCard } from './LeadCard';
import { ProspectCard } from './ProspectCard';
import { AddContactDialog } from './AddContactDialog';
import { AddProspectDialog } from './AddProspectDialog';
import { DealContactDetailSheet } from './DealContactDetailSheet';
import type { DealCategory, DealTeamContact } from '@/types/dealTeam';

interface KanbanBoardProps {
  teamId: string;
}

export function KanbanBoard({ teamId }: KanbanBoardProps) {
  const { data: contacts = [], isLoading: contactsLoading } = useTeamContacts(teamId);
  const { data: prospects = [], isLoading: prospectsLoading } = useTeamProspects(teamId);

  const [addContactCategory, setAddContactCategory] = useState<DealCategory | null>(null);
  const [showAddProspect, setShowAddProspect] = useState(false);
  const [selectedContact, setSelectedContact] = useState<DealTeamContact | null>(null);

  // Filter contacts by category
  const hotContacts = useMemo(
    () => contacts.filter((c) => c.category === 'hot'),
    [contacts]
  );
  const topContacts = useMemo(
    () => contacts.filter((c) => c.category === 'top'),
    [contacts]
  );
  const leadContacts = useMemo(
    () => contacts.filter((c) => c.category === 'lead'),
    [contacts]
  );

  // Calculate total value for HOT
  const hotTotalValue = useMemo(
    () => hotContacts.reduce((sum, c) => sum + (c.estimated_value || 0), 0),
    [hotContacts]
  );

  const isLoading = contactsLoading || prospectsLoading;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-muted/30 rounded-lg border animate-pulse min-h-[400px]"
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* HOT column */}
        <KanbanColumn
          title="HOT LEAD"
          icon="🔥"
          color="red"
          count={hotContacts.length}
          totalValue={hotTotalValue}
          onAdd={() => setAddContactCategory('hot')}
          emptyMessage="Brak HOT leadów. Awansuj kontakty z TOP →"
        >
          {hotContacts.map((contact) => (
            <HotLeadCard key={contact.id} contact={contact} teamId={teamId} onClick={() => setSelectedContact(contact)} />
          ))}
        </KanbanColumn>

        {/* TOP column */}
        <KanbanColumn
          title="TOP LEAD"
          icon="⭐"
          color="amber"
          count={topContacts.length}
          onAdd={() => setAddContactCategory('top')}
          emptyMessage="Brak TOP leadów. Awansuj kontakty z LEAD →"
        >
          {topContacts.map((contact) => (
            <TopLeadCard key={contact.id} contact={contact} teamId={teamId} onClick={() => setSelectedContact(contact)} />
          ))}
        </KanbanColumn>

        {/* LEAD column */}
        <KanbanColumn
          title="LEAD"
          icon="📋"
          color="blue"
          count={leadContacts.length}
          onAdd={() => setAddContactCategory('lead')}
          emptyMessage="Brak leadów. Dodaj kontakty z CRM →"
        >
          {leadContacts.map((contact) => (
            <LeadCard key={contact.id} contact={contact} teamId={teamId} onClick={() => setSelectedContact(contact)} />
          ))}
        </KanbanColumn>

        {/* PROSPECTS column */}
        <KanbanColumn
          title="POSZUKIWANI"
          icon="🔍"
          color="purple"
          count={prospects.length}
          onAdd={() => setShowAddProspect(true)}
          addButtonLabel="+ Szukaj"
          emptyMessage="Brak poszukiwanych. Dodaj osobę/firmę do znalezienia →"
        >
          {prospects.map((prospect) => (
            <ProspectCard key={prospect.id} prospect={prospect} teamId={teamId} />
          ))}
        </KanbanColumn>
      </div>

      {/* Add Contact Dialog */}
      <AddContactDialog
        open={addContactCategory !== null}
        onOpenChange={(open) => !open && setAddContactCategory(null)}
        teamId={teamId}
        defaultCategory={addContactCategory || 'lead'}
      />

      {/* Add Prospect Dialog */}
      <AddProspectDialog
        open={showAddProspect}
        onOpenChange={setShowAddProspect}
        teamId={teamId}
      />

      {/* Contact Detail Sheet */}
      <DealContactDetailSheet
        contact={selectedContact}
        teamId={teamId}
        open={selectedContact !== null}
        onOpenChange={(open) => !open && setSelectedContact(null)}
      />
    </>
  );
}
