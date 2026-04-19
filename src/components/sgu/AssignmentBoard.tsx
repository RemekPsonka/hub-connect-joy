import { useMemo, useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useRepAssignmentsBoard, useAssignContactToRep, type UnassignedContact, type RepWithAssignments } from '@/hooks/useRepAssignments';
import { useSGUTeamId } from '@/hooks/useSGUTeamId';
import { useAuth } from '@/contexts/AuthContext';

const UNASSIGNED_ID = '__unassigned__';

function ContactCard({ contact }: { contact: UnassignedContact }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: contact.id,
    data: { contact },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`p-3 bg-card border rounded-md cursor-grab active:cursor-grabbing hover:border-primary transition ${
        isDragging ? 'opacity-30' : ''
      }`}
    >
      <div className="text-sm font-medium truncate">{contact.full_name ?? '—'}</div>
      {contact.company_name && (
        <div className="text-xs text-muted-foreground truncate">{contact.company_name}</div>
      )}
      {contact.status && (
        <Badge variant="outline" className="mt-2 text-[10px]">
          {contact.status}
        </Badge>
      )}
    </div>
  );
}

function Column({
  id,
  title,
  contacts,
  count,
}: {
  id: string;
  title: string;
  contacts: UnassignedContact[];
  count: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <Card className={`flex flex-col ${isOver ? 'ring-2 ring-primary' : ''}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>{title}</span>
          <Badge variant="secondary">{count}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent ref={setNodeRef} className="space-y-2 min-h-[200px] max-h-[600px] overflow-y-auto">
        {contacts.length === 0 ? (
          <div className="text-xs text-muted-foreground italic text-center py-8">Brak klientów</div>
        ) : (
          contacts.map((c) => <ContactCard key={c.id} contact={c} />)
        )}
      </CardContent>
    </Card>
  );
}

export function AssignmentBoard() {
  const { sguTeamId: teamId } = useSGUTeamId();
  const { director } = useAuth();
  const { data, isLoading } = useRepAssignmentsBoard(teamId);
  const assign = useAssignContactToRep(teamId);

  const tenantId = director?.tenant_id ?? null;
  const [activeContact, setActiveContact] = useState<UnassignedContact | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const repsList: RepWithAssignments[] = useMemo(() => data?.reps ?? [], [data]);

  const handleDragStart = (event: DragStartEvent) => {
    const c = event.active.data.current?.contact as UnassignedContact | undefined;
    if (c) setActiveContact(c);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveContact(null);
    const { active, over } = event;
    if (!over || !tenantId) return;
    const contactId = active.id as string;
    const targetId = over.id as string;
    const repUserId = targetId === UNASSIGNED_ID ? null : targetId;
    assign.mutate({ contactId, repUserId, tenantId });
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-96" />
        ))}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <Column
          id={UNASSIGNED_ID}
          title="Nieprzypisane"
          contacts={data?.unassigned ?? []}
          count={data?.unassigned.length ?? 0}
        />
        {repsList.map((rep) => (
          <Column
            key={rep.user_id}
            id={rep.user_id}
            title={rep.full_name}
            contacts={rep.contacts}
            count={rep.contacts.length}
          />
        ))}
      </div>
      <DragOverlay>
        {activeContact && (
          <div className="p-3 bg-card border rounded-md shadow-lg">
            <div className="text-sm font-medium">{activeContact.full_name}</div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
