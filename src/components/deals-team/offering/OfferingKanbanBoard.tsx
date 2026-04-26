import { useState, useMemo, useCallback } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useUpdateTeamContact } from '@/hooks/useDealsTeamContacts';
import { formatCompactCurrency } from '@/lib/formatCurrency';
import { OfferingKanbanCard } from './OfferingKanbanCard';
import { WonPremiumBreakdownDialog } from '@/components/sgu/odprawa/WonPremiumBreakdownDialog';
import { LostReasonDialog } from '@/components/sgu/sales/LostReasonDialog';
import { StageRollbackDialog } from '@/components/sgu/sales/StageRollbackDialog';
import {
  OFFERING_STAGE_LABELS,
  OFFERING_STAGE_ORDER,
  type DealTeamContact,
  type OfferingStage,
} from '@/types/dealTeam';
import type { PaymentScheduleEntry } from '@/hooks/usePaymentSchedule';

interface OfferingKanbanBoardProps {
  contacts: DealTeamContact[];
  payments: PaymentScheduleEntry[];
  teamId: string;
  onContactClick: (contact: DealTeamContact) => void;
}

interface StageMeta {
  id: OfferingStage;
  icon: string;
  color: string;
}

const STAGE_META: Record<OfferingStage, StageMeta> = {
  decision_meeting: { id: 'decision_meeting', icon: '📅', color: 'border-t-sky-500' },
  handshake: { id: 'handshake', icon: '🤝', color: 'border-t-blue-500' },
  power_of_attorney: { id: 'power_of_attorney', icon: '📝', color: 'border-t-indigo-500' },
  audit: { id: 'audit', icon: '🔍', color: 'border-t-violet-500' },
  offer_sent: { id: 'offer_sent', icon: '📤', color: 'border-t-amber-500' },
  negotiation: { id: 'negotiation', icon: '💬', color: 'border-t-orange-500' },
  won: { id: 'won', icon: '✅', color: 'border-t-green-500' },
  lost: { id: 'lost', icon: '❌', color: 'border-t-red-500' },
  // legacy fallbacks (not shown but typed)
  preparation: { id: 'preparation', icon: '⚙️', color: 'border-t-amber-500' },
  accepted: { id: 'accepted', icon: '✅', color: 'border-t-green-500' },
  audit_plan: { id: 'audit_plan', icon: '🔍', color: 'border-t-violet-500' },
  audit_scheduled: { id: 'audit_scheduled', icon: '🔍', color: 'border-t-violet-500' },
  audit_done: { id: 'audit_done', icon: '🔍', color: 'border-t-violet-500' },
  meeting_plan: { id: 'meeting_plan', icon: '📅', color: 'border-t-sky-500' },
  meeting_scheduled: { id: 'meeting_scheduled', icon: '📅', color: 'border-t-sky-500' },
  meeting_done: { id: 'meeting_done', icon: '📅', color: 'border-t-sky-500' },
};

export function OfferingKanbanBoard({ contacts, payments, teamId, onContactClick }: OfferingKanbanBoardProps) {
  const updateContact = useUpdateTeamContact();
  const [dragOverStage, setDragOverStage] = useState<OfferingStage | null>(null);
  const [showLost, setShowLost] = useState(false);
  const [wonDialog, setWonDialog] = useState<DealTeamContact | null>(null);
  const [lostDialog, setLostDialog] = useState<DealTeamContact | null>(null);
  const [rollbackDialog, setRollbackDialog] = useState<{ contact: DealTeamContact; toStage: OfferingStage } | null>(null);

  const visibleStages = useMemo(
    () => OFFERING_STAGE_ORDER.filter((s) => showLost || s !== 'lost'),
    [showLost],
  );

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
    for (const stage of OFFERING_STAGE_ORDER) map.set(stage, []);
    for (const c of contacts) {
      let stage = (c.offering_stage || 'handshake') as OfferingStage;
      // Legacy → new mapping fallback
      if (stage === 'preparation') stage = 'offer_sent';
      if (stage === 'accepted') stage = 'won';
      if (stage === 'audit_plan' || stage === 'audit_scheduled' || stage === 'audit_done') stage = 'audit';
      if (stage === 'meeting_plan' || stage === 'meeting_scheduled' || stage === 'meeting_done') stage = 'decision_meeting';
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

  const handleDrop = useCallback(
    (e: React.DragEvent, stage: OfferingStage) => {
      e.preventDefault();
      setDragOverStage(null);
      const contactId = e.dataTransfer.getData('text/plain');
      if (!contactId) return;
      const contact = contacts.find((c) => c.id === contactId);
      if (!contact || contact.offering_stage === stage) return;

      const fromStage = (contact.offering_stage || 'handshake') as OfferingStage;
      // Rollback: opuszczenie won/lost do innego etapu wymaga potwierdzenia
      if ((fromStage === 'won' || fromStage === 'lost') && stage !== 'won' && stage !== 'lost') {
        setRollbackDialog({ contact, toStage: stage });
        return;
      }

      if (stage === 'won') {
        setWonDialog(contact);
        return;
      }
      if (stage === 'lost') {
        setLostDialog(contact);
        return;
      }
      updateContact.mutate({ id: contactId, teamId, offeringStage: stage });
    },
    [contacts, teamId, updateContact],
  );

  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <Switch id="show-lost" checked={showLost} onCheckedChange={setShowLost} />
        <Label htmlFor="show-lost" className="text-xs cursor-pointer">
          Pokaż przegrane
        </Label>
      </div>
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-4" style={{ minWidth: visibleStages.length * 240 }}>
          {visibleStages.map((stageId) => {
            const meta = STAGE_META[stageId];
            const stageContacts = contactsByStage.get(stageId) || [];
            const stageValue = stageContacts.reduce((sum, c) => {
              const cp = paymentsByContact.get(c.id) || [];
              return sum + cp.reduce((s, p) => s + p.amount, 0);
            }, 0);
            const stageAreasGr = stageContacts.reduce(
              (sum, c) =>
                sum +
                (c.potential_property_gr ?? 0) +
                (c.potential_financial_gr ?? 0) +
                (c.potential_communication_gr ?? 0) +
                (c.potential_life_group_gr ?? 0),
              0,
            );

            return (
              <div
                key={stageId}
                data-testid={`column-${stageId}`}
                className={cn(
                  'bg-muted/30 rounded-lg border border-t-2 flex flex-col min-w-[220px] flex-1 min-h-[350px] transition-all',
                  meta.color,
                  dragOverStage === stageId && 'ring-2 ring-primary/50 bg-primary/5',
                )}
                onDragOver={handleDragOver}
                onDragEnter={() => setDragOverStage(stageId)}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverStage(null);
                  }
                }}
                onDrop={(e) => handleDrop(e, stageId)}
              >
                <div className="p-3 border-b bg-muted/50">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{meta.icon}</span>
                    <h3 className="font-semibold text-xs">{OFFERING_STAGE_LABELS[stageId]}</h3>
                    <Badge variant="secondary" className="text-[10px] ml-auto">
                      {stageContacts.length}
                    </Badge>
                  </div>
                  {stageValue > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatCompactCurrency(stageValue)}
                    </p>
                  )}
                  {stageAreasGr > 0 && (
                    <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                      Σ obszary: {formatCompactCurrency(stageAreasGr / 100)}
                    </p>
                  )}
                </div>

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

      {wonDialog && (
        <WonPremiumBreakdownDialog
          open={!!wonDialog}
          onOpenChange={(o) => !o && setWonDialog(null)}
          contactId={wonDialog.id}
          teamId={teamId}
          clientName={wonDialog.contact?.full_name ?? '—'}
          current={{
            property: wonDialog.potential_property_gr,
            financial: wonDialog.potential_financial_gr,
            communication: wonDialog.potential_communication_gr,
            life_group: wonDialog.potential_life_group_gr,
          }}
          onSuccess={() => {
            updateContact.mutate({ id: wonDialog.id, teamId, offeringStage: 'won' });
          }}
        />
      )}
      {lostDialog && (
        <LostReasonDialog
          open={!!lostDialog}
          onOpenChange={(o) => !o && setLostDialog(null)}
          contactId={lostDialog.id}
          contactName={lostDialog.contact?.full_name ?? '—'}
          teamId={teamId}
          setOfferingLost
        />
      )}
      {rollbackDialog && (
        <StageRollbackDialog
          open={!!rollbackDialog}
          onOpenChange={(o) => !o && setRollbackDialog(null)}
          contactId={rollbackDialog.contact.id}
          contactName={rollbackDialog.contact.contact?.full_name ?? '—'}
          teamId={teamId}
          fromStage={OFFERING_STAGE_LABELS[(rollbackDialog.contact.offering_stage || 'handshake') as OfferingStage] ?? '—'}
          toCategory="offering"
          onSuccess={() => {
            const fromStage = (rollbackDialog.contact.offering_stage || 'handshake') as OfferingStage;
            updateContact.mutate({
              id: rollbackDialog.contact.id,
              teamId,
              offeringStage: rollbackDialog.toStage,
              ...(fromStage === 'lost'
                ? { isLost: false, lostReason: null, lostAt: null }
                : {}),
            });
            setRollbackDialog(null);
          }}
        />
      )}
    </>
  );
}
