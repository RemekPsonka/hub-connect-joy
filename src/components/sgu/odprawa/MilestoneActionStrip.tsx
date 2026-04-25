import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLogDecision, type MilestoneVariant } from '@/hooks/useLogDecision';
import type {
  ContactTimelineState,
  MilestoneKey,
} from '@/hooks/odprawa/useContactTimelineState';
import { cn } from '@/lib/utils';

const LABEL: Record<MilestoneKey, string> = {
  prospect: 'Prospekt',
  k1: 'Spotkanie odbyte',
  k2: 'Handshake',
  'k2+': 'POA podpisane',
  k3: 'Audyt zrobiony',
  k4: 'Klient',
};

// UWAGA: trigger trg_set_milestone_timestamps wymaga 'audit_done' (nie 'audit')
// dla ostemplowania audit_done_at. Potwierdzone w pre-flight 0.2.
const OFFERING_STAGE_MAP: Record<MilestoneKey, string | null> = {
  prospect: null,
  k1: 'meeting_done',
  k2: 'handshake',
  'k2+': 'power_of_attorney',
  k3: 'audit_done',
  k4: 'won',
};

interface Props {
  state: ContactTimelineState;
  contactId: string;
  teamId: string;
  tenantId: string;
  odprawaSessionId: string;
}

export function MilestoneActionStrip({
  state,
  contactId,
  teamId,
  tenantId,
  odprawaSessionId,
}: Props) {
  const logMut = useLogDecision();
  const qc = useQueryClient();

  if (state.availableMilestones.length === 0) {
    return null;
  }

  const stamp = async (key: MilestoneKey) => {
    const stage = OFFERING_STAGE_MAP[key];
    if (!stage) return;
    try {
      const update: Record<string, unknown> = { offering_stage: stage };
      if (key === 'k4') {
        update.status = 'won';
        update.category = 'client';
      }
      const { error: upErr } = await supabase
        .from('deal_team_contacts')
        .update(update)
        .eq('id', contactId);
      if (upErr) throw upErr;

      await logMut.mutateAsync({
        contactId,
        teamId,
        tenantId,
        decision: 'push',
        milestoneVariant: key as MilestoneVariant,
        odprawaSessionId,
      });

      qc.invalidateQueries({ queryKey: ['deal_team_contact_for_agenda'] });
      qc.invalidateQueries({ queryKey: ['odprawa-agenda'] });
      qc.invalidateQueries({ queryKey: ['odprawa-session-decisions'] });
      toast.success(`Zaznaczono: ${LABEL[key]}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Nie udało się zapisać milestone';
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold">Co się stało od ostatniej odprawy?</div>
      <div className="flex flex-wrap gap-2">
        {state.availableMilestones.map((key) => (
          <Button
            key={key}
            variant={key === 'k4' ? 'default' : 'outline'}
            size="sm"
            disabled={logMut.isPending}
            onClick={() => stamp(key)}
            className={cn(
              key === 'k4' && 'bg-emerald-600 text-white hover:bg-emerald-700',
            )}
          >
            {LABEL[key]}
          </Button>
        ))}
      </div>
    </div>
  );
}