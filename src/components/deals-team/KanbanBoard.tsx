import { useMemo, useState, useCallback, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useTeamContacts, useUpdateTeamContact } from '@/hooks/useDealsTeamContacts';
import { useTeamProspects } from '@/hooks/useDealsTeamProspects';
import { KanbanColumn } from './KanbanColumn';
import { HotLeadCard } from './HotLeadCard';
import { TopLeadCard } from './TopLeadCard';
import { LeadCard } from './LeadCard';
import { ColdLeadCard } from './ColdLeadCard';
import { ProspectCard } from './ProspectCard';
import { AddContactDialog } from './AddContactDialog';
import { AddProspectDialog } from './AddProspectDialog';
import { DealContactDetailSheet } from './DealContactDetailSheet';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DealCategory, DealTeamContact } from '@/types/dealTeam';

interface KanbanBoardProps {
  teamId: string;
}

export function KanbanBoard({ teamId }: KanbanBoardProps) {
  const { data: contacts = [], isLoading: contactsLoading } = useTeamContacts(teamId);
  const { data: prospects = [], isLoading: prospectsLoading } = useTeamProspects(teamId);
  const updateContact = useUpdateTeamContact();

  const [addContactCategory, setAddContactCategory] = useState<DealCategory | null>(null);
  const [showAddProspect, setShowAddProspect] = useState(false);
  const [selectedContact, setSelectedContact] = useState<DealTeamContact | null>(null);
  const [draggingContactId, setDraggingContactId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<DealCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter contacts
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.toLowerCase();
    return contacts.filter(
      (c) =>
        c.contact?.full_name?.toLowerCase().includes(q) ||
        c.contact?.company?.toLowerCase().includes(q)
    );
  }, [contacts, searchQuery]);

  const hotContacts = useMemo(
    () => filteredContacts.filter((c) => c.category === 'hot'),
    [filteredContacts]
  );
  const topContacts = useMemo(
    () => filteredContacts.filter((c) => c.category === 'top'),
    [filteredContacts]
  );
  const leadContacts = useMemo(
    () => filteredContacts.filter((c) => c.category === 'lead'),
    [filteredContacts]
  );
  const coldContacts = useMemo(
    () => filteredContacts.filter((c) => c.category === 'cold'),
    [filteredContacts]
  );

  // Calculate total value for HOT
  const hotTotalValue = useMemo(
    () => hotContacts.reduce((sum, c) => sum + (c.estimated_value || 0), 0),
    [hotContacts]
  );

  const isLoading = contactsLoading || prospectsLoading;

  // Drag & Drop handlers
  const wasDraggingRef = useRef(false);

  const handleDragStart = useCallback((e: React.DragEvent, contactId: string) => {
    e.dataTransfer.setData('contactId', contactId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingContactId(contactId);
    wasDraggingRef.current = true;
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingContactId(null);
    setDragOverColumn(null);
    setTimeout(() => { wasDraggingRef.current = false; }, 0);
  }, []);

  const handleCardClick = useCallback((contact: DealTeamContact) => {
    if (wasDraggingRef.current) return;
    setSelectedContact(contact);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent, category: DealCategory) => {
    e.preventDefault();
    setDragOverColumn(category);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const { clientX, clientY } = e;
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      setDragOverColumn(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, newCategory: DealCategory) => {
    e.preventDefault();
    const contactId = e.dataTransfer.getData('contactId');
    const contact = contacts.find(c => c.id === contactId);
    if (contact && contact.category !== newCategory) {
      updateContact.mutate({ id: contactId, teamId, category: newCategory });
    }
    setDraggingContactId(null);
    setDragOverColumn(null);
  }, [contacts, teamId, updateContact]);

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
      {/* Search bar */}
      <div className="mb-3 relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Szukaj kontakt po nazwie lub firmie..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 h-8 text-xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* HOT column */}
        <KanbanColumn
          title="HOT LEAD"
          icon="🔥"
          color="red"
          count={hotContacts.length}
          totalValue={hotTotalValue}
          onAdd={() => setAddContactCategory('hot')}
          emptyMessage="Brak HOT leadów. Awansuj kontakty z TOP →"
          onDragOver={handleDragOver}
          onDragEnter={(e) => handleDragEnter(e, 'hot')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'hot')}
          isDropTarget={dragOverColumn === 'hot'}
        >
          {hotContacts.map((contact) => (
            <HotLeadCard
              key={contact.id}
              contact={contact}
              teamId={teamId}
              onClick={() => handleCardClick(contact)}
              onDragStart={(e) => handleDragStart(e, contact.id)}
              onDragEnd={handleDragEnd}
              isDragging={draggingContactId === contact.id}
            />
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
          onDragOver={handleDragOver}
          onDragEnter={(e) => handleDragEnter(e, 'top')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'top')}
          isDropTarget={dragOverColumn === 'top'}
        >
          {topContacts.map((contact) => (
            <TopLeadCard
              key={contact.id}
              contact={contact}
              teamId={teamId}
              onClick={() => handleCardClick(contact)}
              onDragStart={(e) => handleDragStart(e, contact.id)}
              onDragEnd={handleDragEnd}
              isDragging={draggingContactId === contact.id}
            />
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
          onDragOver={handleDragOver}
          onDragEnter={(e) => handleDragEnter(e, 'lead')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'lead')}
          isDropTarget={dragOverColumn === 'lead'}
        >
          {leadContacts.map((contact) => (
            <LeadCard
              key={contact.id}
              contact={contact}
              teamId={teamId}
              onClick={() => handleCardClick(contact)}
              onDragStart={(e) => handleDragStart(e, contact.id)}
              onDragEnd={handleDragEnd}
              isDragging={draggingContactId === contact.id}
            />
          ))}
        </KanbanColumn>

        {/* COLD column */}
        <KanbanColumn
          title="COLD LEAD"
          icon="❄️"
          color="slate"
          count={coldContacts.length}
          onAdd={() => setAddContactCategory('cold')}
          emptyMessage="Brak COLD leadów. Dodaj kontakty →"
          onDragOver={handleDragOver}
          onDragEnter={(e) => handleDragEnter(e, 'cold')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'cold')}
          isDropTarget={dragOverColumn === 'cold'}
        >
          {coldContacts.map((contact) => (
            <ColdLeadCard
              key={contact.id}
              contact={contact}
              teamId={teamId}
              onClick={() => handleCardClick(contact)}
              onDragStart={(e) => handleDragStart(e, contact.id)}
              onDragEnd={handleDragEnd}
              isDragging={draggingContactId === contact.id}
            />
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
