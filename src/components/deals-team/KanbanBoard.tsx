import { useMemo, useState, useCallback, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useTeamContacts, useUpdateTeamContact } from '@/hooks/useDealsTeamContacts';
import { useTeamProspects } from '@/hooks/useDealsTeamProspects';
import { useKanbanColumnSettings } from '@/hooks/useKanbanColumnSettings';
import { useActiveTaskContacts } from '@/hooks/useActiveTaskContacts';
import { KanbanColumn } from './KanbanColumn';
import { HotLeadCard } from './HotLeadCard';
import { TopLeadCard } from './TopLeadCard';
import { LeadCard } from './LeadCard';
import { ColdLeadCard } from './ColdLeadCard';
import { ProspectCard } from './ProspectCard';
import { AddContactDialog } from './AddContactDialog';
import { AddProspectDialog } from './AddProspectDialog';
import { DealContactDetailSheet } from './DealContactDetailSheet';
import { SnoozedContactsBar } from './SnoozedContactsBar';
import { KanbanColumnConfigPopover } from './KanbanColumnConfigPopover';
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
  const { data: activeTaskMap } = useActiveTaskContacts(teamId);
  const { columns: visibleColumns, toggleColumn, visibleCount } = useKanbanColumnSettings();
  const [addContactCategory, setAddContactCategory] = useState<DealCategory | null>(null);
  const [showAddProspect, setShowAddProspect] = useState(false);
  const [selectedContact, setSelectedContact] = useState<DealTeamContact | null>(null);
  const [draggingContactId, setDraggingContactId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<DealCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Separate snoozed contacts
  const { activeContacts, snoozedContacts } = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const active: DealTeamContact[] = [];
    const snoozed: DealTeamContact[] = [];
    for (const c of contacts) {
      if (c.snoozed_until && c.snoozed_until > today) {
        snoozed.push(c);
      } else {
        active.push(c);
      }
    }
    return { activeContacts: active, snoozedContacts: snoozed };
  }, [contacts]);

  // Filter active contacts by search
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return activeContacts;
    const q = searchQuery.toLowerCase();
    return activeContacts.filter(
      (c) =>
        c.contact?.full_name?.toLowerCase().includes(q) ||
        c.contact?.company?.toLowerCase().includes(q)
    );
  }, [activeContacts, searchQuery]);

  const hotContacts = useMemo(
    () => filteredContacts.filter((c) => c.category === 'hot'),
    [filteredContacts]
  );
  const offeringContacts = useMemo(
    () => filteredContacts.filter((c) => c.category === 'offering'),
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
  const tenxContacts = useMemo(
    () => filteredContacts.filter((c) => c.category === '10x'),
    [filteredContacts]
  );
  const coldContacts = useMemo(
    () => filteredContacts.filter((c) => c.category === 'cold'),
    [filteredContacts]
  );
  const lostContacts = useMemo(
    () => filteredContacts.filter((c) => c.category === 'lost'),
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
      {/* Search bar + column config */}
      <div className="mb-3 flex gap-2 items-center">
        <div className="relative flex-1">
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
        <KanbanColumnConfigPopover columns={visibleColumns} onToggle={toggleColumn} />
      </div>

      {/* Snoozed contacts bar */}
      <SnoozedContactsBar
        snoozedContacts={snoozedContacts}
        teamId={teamId}
        onContactClick={handleCardClick}
      />

      <div className={cn(
        "grid grid-cols-1 sm:grid-cols-2 gap-4",
        visibleCount <= 4 && "lg:grid-cols-4",
        visibleCount === 5 && "lg:grid-cols-5",
        visibleCount === 6 && "lg:grid-cols-6",
        visibleCount === 7 && "lg:grid-cols-7",
        visibleCount >= 8 && "lg:grid-cols-8"
      )}>
        {/* HOT column */}
        {visibleColumns.hot && (
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
                taskStatus={activeTaskMap?.get(contact.id)}
              />
            ))}
          </KanbanColumn>
        )}

        {/* OFFERING column */}
        {visibleColumns.offering && (
          <KanbanColumn
            title="OFERTOWANIE"
            icon="📝"
            color="emerald"
            count={offeringContacts.length}
            onAdd={() => setAddContactCategory('offering')}
            emptyMessage="Brak kontaktów w ofertowaniu"
            onDragOver={handleDragOver}
            onDragEnter={(e) => handleDragEnter(e, 'offering')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'offering')}
            isDropTarget={dragOverColumn === 'offering'}
          >
            {offeringContacts.map((contact) => (
              <HotLeadCard
                key={contact.id}
                contact={contact}
                teamId={teamId}
                onClick={() => handleCardClick(contact)}
                onDragStart={(e) => handleDragStart(e, contact.id)}
                onDragEnd={handleDragEnd}
                isDragging={draggingContactId === contact.id}
                taskStatus={activeTaskMap?.get(contact.id)}
              />
            ))}
          </KanbanColumn>
        )}

        {/* TOP column */}
        {visibleColumns.top && (
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
                taskStatus={activeTaskMap?.get(contact.id)}
              />
            ))}
          </KanbanColumn>
        )}

        {/* LEAD column */}
        {visibleColumns.lead && (
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
                taskStatus={activeTaskMap?.get(contact.id)}
              />
            ))}
          </KanbanColumn>
        )}

        {/* 10x column */}
        {visibleColumns.tenx && (
          <KanbanColumn
            title="10x"
            icon="🔄"
            color="cyan"
            count={tenxContacts.length}
            onAdd={() => setAddContactCategory('10x' as DealCategory)}
            emptyMessage="Brak kontaktów 10x. Buduj relacje →"
            onDragOver={handleDragOver}
            onDragEnter={(e) => handleDragEnter(e, '10x' as DealCategory)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, '10x' as DealCategory)}
            isDropTarget={dragOverColumn === ('10x' as DealCategory)}
          >
            {tenxContacts.map((contact) => (
              <ColdLeadCard
                key={contact.id}
                contact={contact}
                teamId={teamId}
                onClick={() => handleCardClick(contact)}
                onDragStart={(e) => handleDragStart(e, contact.id)}
                onDragEnd={handleDragEnd}
                isDragging={draggingContactId === contact.id}
                taskStatus={activeTaskMap?.get(contact.id)}
              />
            ))}
          </KanbanColumn>
        )}

        {/* COLD column */}
        {visibleColumns.cold && (
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
                taskStatus={activeTaskMap?.get(contact.id)}
              />
            ))}
          </KanbanColumn>
        )}

        {/* LOST column */}
        {visibleColumns.lost && (
          <KanbanColumn
            title="PRZEGRANE"
            icon="✖️"
            color="gray"
            count={lostContacts.length}
            onAdd={() => setAddContactCategory('lost' as DealCategory)}
            emptyMessage="Brak przegranych kontaktów"
            onDragOver={handleDragOver}
            onDragEnter={(e) => handleDragEnter(e, 'lost' as DealCategory)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'lost' as DealCategory)}
            isDropTarget={dragOverColumn === ('lost' as DealCategory)}
          >
            {lostContacts.map((contact) => (
              <ColdLeadCard
                key={contact.id}
                contact={contact}
                teamId={teamId}
                onClick={() => handleCardClick(contact)}
                onDragStart={(e) => handleDragStart(e, contact.id)}
                onDragEnd={handleDragEnd}
                isDragging={draggingContactId === contact.id}
                taskStatus={activeTaskMap?.get(contact.id)}
              />
            ))}
          </KanbanColumn>
        )}

        {/* PROSPECTS column */}
        {visibleColumns.prospecting && (
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
        )}
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
