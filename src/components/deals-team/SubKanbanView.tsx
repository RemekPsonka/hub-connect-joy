import { useState, useMemo, useCallback } from 'react';
import { ArrowLeft, Users } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUpdateTeamContact } from '@/hooks/useDealsTeamContacts';
import { HotLeadCard } from './HotLeadCard';
import type { DealTeamContact, OfferingStage, DealCategory } from '@/types/dealTeam';
import type { TaskContactInfo } from '@/hooks/useActiveTaskContacts';

export interface SubStageConfig {
  id: OfferingStage;
  label: string;
  icon: string;
  color: string;
}

interface SubKanbanViewProps {
  title: string;
  icon: string;
  contacts: DealTeamContact[];
  stages: SubStageConfig[];
  teamId: string;
  defaultStage: OfferingStage;
  onBack: () => void;
  onContactClick: (contact: DealTeamContact) => void;
  activeTaskMap?: Map<string, TaskContactInfo>;
  filterMember?: string;
  currentDirectorId?: string;
  teamMembers?: { director_id: string; director?: { full_name: string } | null }[];
}

export const SUB_KANBAN_CONFIGS: Record<string, { title: string; icon: string; stages: SubStageConfig[]; defaultStage: OfferingStage }> = {
  audit: {
    title: 'AUDYT',
    icon: '📅',
    defaultStage: 'audit_plan',
    stages: [
      { id: 'audit_plan', label: 'Do zaplanowania', icon: '📋', color: 'border-t-slate-500' },
      { id: 'audit_scheduled', label: 'Zaplanowany', icon: '📅', color: 'border-t-blue-500' },
      { id: 'audit_done', label: 'Odbyty', icon: '✅', color: 'border-t-green-500' },
    ],
  },
  hot: {
    title: 'HOT LEAD',
    icon: '🔥',
    defaultStage: 'meeting_plan',
    stages: [
      { id: 'meeting_plan', label: 'Zaplanować spotkanie', icon: '📋', color: 'border-t-slate-500' },
      { id: 'meeting_scheduled', label: 'Spotkanie umówione', icon: '📅', color: 'border-t-blue-500' },
      { id: 'meeting_done', label: 'Spotkanie odbyte', icon: '✅', color: 'border-t-green-500' },
    ],
  },
  top: {
    title: 'TOP LEAD',
    icon: '⭐',
    defaultStage: 'meeting_plan',
    stages: [
      { id: 'meeting_plan', label: 'Zaplanować spotkanie', icon: '📋', color: 'border-t-slate-500' },
      { id: 'meeting_scheduled', label: 'Spotkanie umówione', icon: '📅', color: 'border-t-blue-500' },
      { id: 'meeting_done', label: 'Spotkanie odbyte', icon: '✅', color: 'border-t-green-500' },
    ],
  },
};

export function SubKanbanView({
  title,
  icon,
  contacts,
  stages,
  teamId,
  defaultStage,
  onBack,
  onContactClick,
  activeTaskMap,
  filterMember = 'all',
  currentDirectorId,
  teamMembers = [],
}: SubKanbanViewProps) {
  const updateContact = useUpdateTeamContact();
  const [dragOverStage, setDragOverStage] = useState<OfferingStage | null>(null);
  const [localFilterMember, setLocalFilterMember] = useState<string>(filterMember);

  // Apply member filter to contacts
  const memberFilteredContacts = useMemo(() => {
    if (localFilterMember === 'all') return contacts;
    if (localFilterMember === 'unassigned') {
      return contacts.filter(c => !activeTaskMap?.get(c.id));
    }
    const targetId = localFilterMember === 'mine' ? currentDirectorId : localFilterMember;
    return contacts.filter(c => {
      const info = activeTaskMap?.get(c.id);
      if (!info) return localFilterMember === 'mine';
      return info.assignedTo === targetId;
    });
  }, [contacts, localFilterMember, activeTaskMap, currentDirectorId]);

  const contactsByStage = useMemo(() => {
    const map = new Map<OfferingStage, DealTeamContact[]>();
    for (const stage of stages) {
      map.set(stage.id, []);
    }
    for (const c of memberFilteredContacts) {
      const stage = (c.offering_stage || defaultStage) as OfferingStage;
      const arr = map.get(stage) || map.get(defaultStage)!;
      arr.push(c);
    }
    return map;
  }, [memberFilteredContacts, stages, defaultStage]);

  const handleDragStart = useCallback((e: React.DragEvent, contactId: string) => {
    e.dataTransfer.setData('text/plain', contactId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, stage: OfferingStage) => {
    e.preventDefault();
    setDragOverStage(null);
    const contactId = e.dataTransfer.getData('text/plain');
    if (!contactId) return;
    const contact = contacts.find(c => c.id === contactId);
    if (!contact || contact.offering_stage === stage) return;
    updateContact.mutate({ id: contactId, teamId, offeringStage: stage });
  }, [contacts, teamId, updateContact]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Wstecz
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <h2 className="font-semibold text-base">{title}</h2>
          <Badge variant="secondary">{memberFilteredContacts.length}</Badge>
        </div>
      </div>

      {/* Member filter bar */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <Users className="h-3.5 w-3.5 text-muted-foreground mr-1" />
        <Button
          size="sm"
          variant={localFilterMember === 'all' ? 'default' : 'outline'}
          className="h-6 text-[11px] px-2"
          onClick={() => setLocalFilterMember('all')}
        >
          Wszyscy
        </Button>
        <Button
          size="sm"
          variant={localFilterMember === 'mine' ? 'default' : 'outline'}
          className="h-6 text-[11px] px-2"
          onClick={() => setLocalFilterMember('mine')}
        >
          Moje
        </Button>
        {teamMembers.map((m) => (
          <Button
            key={m.director_id}
            size="sm"
            variant={localFilterMember === m.director_id ? 'default' : 'outline'}
            className="h-6 text-[11px] px-2"
            onClick={() => setLocalFilterMember(m.director_id)}
          >
            {m.director?.full_name?.split(' ')[0] || 'Członek'}
          </Button>
        ))}
        <Button
          size="sm"
          variant={localFilterMember === 'unassigned' ? 'default' : 'outline'}
          className="h-6 text-[11px] px-2"
          onClick={() => setLocalFilterMember('unassigned')}
        >
          Nieprzypisane
        </Button>
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-4" style={{ minWidth: stages.length * 280 }}>
          {stages.map((stage) => {
            const stageContacts = contactsByStage.get(stage.id) || [];
            return (
              <div
                key={stage.id}
                className={cn(
                  'bg-muted/30 rounded-lg border border-t-2 flex flex-col min-w-[260px] flex-1 min-h-[350px] max-h-[calc(100vh-280px)] transition-all',
                  stage.color,
                  dragOverStage === stage.id && 'ring-2 ring-primary/50 bg-primary/5'
                )}
                onDragOver={handleDragOver}
                onDragEnter={() => setDragOverStage(stage.id)}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverStage(null);
                  }
                }}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                <div className="p-3 border-b bg-muted/50">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{stage.icon}</span>
                    <h3 className="font-semibold text-xs">{stage.label}</h3>
                    <Badge variant="secondary" className="text-[10px] ml-auto">
                      {stageContacts.length}
                    </Badge>
                  </div>
                </div>
                <ScrollArea className="flex-1 p-2">
                  {stageContacts.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">Brak</p>
                  ) : (
                    <div className="space-y-1">
                      {stageContacts.map((contact) => (
                        <HotLeadCard
                          key={contact.id}
                          contact={contact}
                          teamId={teamId}
                          onClick={() => onContactClick(contact)}
                          onDragStart={(e) => handleDragStart(e, contact.id)}
                          onDragEnd={() => {}}
                          isDragging={false}
                          taskStatus={activeTaskMap?.get(contact.id)}
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
