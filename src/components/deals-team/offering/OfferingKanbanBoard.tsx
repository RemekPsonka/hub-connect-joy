import { useState, useMemo, useCallback } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useUpdateTeamContact } from '@/hooks/useDealsTeamContacts';
import { formatCompactCurrency } from '@/lib/formatCurrency';
import { OfferingKanbanCard } from './OfferingKanbanCard';
import type { DealTeamContact, OfferingStage } from '@/types/dealTeam';
import type { PaymentScheduleEntry } from '@/hooks/usePaymentSchedule';

interface OfferingKanbanBoardProps {
  contacts: DealTeamContact[];
  payments: PaymentScheduleEntry[];
  teamId: string;
  onContactClick: (contact: DealTeamContact) => void;
}

const STAGES: { id: OfferingStage; label: string; icon: string; color: string }[] = [
  { id: 'handshake', label: 'Handshake', icon: '🤝', color: 'border-t-blue-500' },
  { id: 'power_of_attorney', label: 'Pełnomocnictwo', icon: '📝', color: 'border-t-indigo-500' },
  { id: 'preparation', label: 'Oferta w przygotowaniu', icon: '⚙️', color: 'border-t-amber-500' },
  { id: 'negotiation', label: 'Negocjacje', icon: '💬', color: 'border-t-orange-500' },
  { id: 'accepted', label: 'Akceptacja', icon: '✅', color: 'border-t-green-500' },
  { id: 'lost', label: 'Przegrana', icon: '❌', color: 'border-t-red-500' },
];

export function OfferingKanbanBoard({ contacts, payments, teamId, onContactClick }: OfferingKanbanBoardProps) {
  const updateContact = useUpdateTeamContact();
  const [dragOverStage, setDragOverStage] = useState<OfferingStage | null>(null);

  const paymentsByContact = useMemo(() => {
    const map = new Map<string, PaymentScheduleEntry[]>();
    for (const p of payments) {
      const arr = map.get(p.team_contact_id) || [];
      arr.push(p);
      map.set(p.team_contact_id, arr);
    }
    return map;
  }, [payments]);

  const contactsByStage = useMemo(() => {
    const map = new Map<OfferingStage, DealTeamContact[]>();
    for (const stage of STAGES) {
      map.set(stage.id, []);
    }
    for (const c of contacts) {
      const stage = (c.offering_stage || 'handshake') as OfferingStage;
      const arr = map.get(stage) || map.get('handshake')!;
      arr.push(c);
    }
    return map;
  }, [contacts]);

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

    updateContact.mutate({
      id: contactId,
      teamId,
      offeringStage: stage,
    });
  }, [contacts, teamId, updateContact]);

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-3 pb-4" style={{ minWidth: STAGES.length * 240 }}>
        {STAGES.map((stage) => {
          const stageContacts = contactsByStage.get(stage.id) || [];
          const stageValue = stageContacts.reduce((sum, c) => {
            const cp = paymentsByContact.get(c.id) || [];
            return sum + cp.reduce((s, p) => s + p.amount, 0);
          }, 0);

          return (
            <div
              key={stage.id}
              className={cn(
                'bg-muted/30 rounded-lg border border-t-2 flex flex-col min-w-[220px] flex-1 min-h-[350px] transition-all',
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
              {/* Header */}
              <div className="p-3 border-b bg-muted/50">
                <div className="flex items-center gap-2">
                  <span className="text-base">{stage.icon}</span>
                  <h3 className="font-semibold text-xs">{stage.label}</h3>
                  <Badge variant="secondary" className="text-[10px] ml-auto">
                    {stageContacts.length}
                  </Badge>
                </div>
                {stageValue > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatCompactCurrency(stageValue)}
                  </p>
                )}
              </div>

              {/* Cards */}
              <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                {stageContacts.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Brak</p>
                ) : (
                  stageContacts.map((contact) => (
                    <OfferingKanbanCard
                      key={contact.id}
                      contact={contact}
                      payments={paymentsByContact.get(contact.id) || []}
                      onClick={() => onContactClick(contact)}
                      onDragStart={(e) => handleDragStart(e, contact.id)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
