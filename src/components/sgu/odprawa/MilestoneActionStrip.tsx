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
import {
  OFFERING_STAGE_LABEL,
  type OfferingStage,
} from '@/lib/offeringStageLabels';
import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { useSguStageTransition } from '@/hooks/useSguStageTransition';
import { useRequireDirector } from '@/hooks/useRequireDirector';
import { asSguStage, buildTaskTitle, type SguStage } from '@/lib/sgu/stageActionMap';

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
  /** contacts.id (osoba) — potrzebne do task_contacts join. */
  contactRecordId: string;
  /** Display name kontaktu — do tytułu zadania. */
  contactName: string;
  /** Firma kontaktu — do tytułu zadania (opcjonalnie). */
  contactCompany?: string | null;
  /** Triggered after successful K2/K4 milestone — parent opens the premium dialog. */
  onPremiumPrompt?: (kind: 'k2' | 'k4') => void;
}

export function MilestoneActionStrip({
  state,
  contactId,
  teamId,
  tenantId,
  odprawaSessionId,
  contactRecordId,
  contactName,
  contactCompany,
  onPremiumPrompt,
}: Props) {
  const logMut = useLogDecision();
  const transitionMut = useSguStageTransition();
  const qc = useQueryClient();
  const { hasDirector } = useRequireDirector(contactId);
  // Świeżo kliknięty sub-stage — podświetlamy przez ~1.5s żeby user zobaczył efekt zapisu.
  const [justSavedStage, setJustSavedStage] = useState<OfferingStage | null>(null);
  useEffect(() => {
    if (!justSavedStage) return;
    const t = setTimeout(() => setJustSavedStage(null), 1500);
    return () => clearTimeout(t);
  }, [justSavedStage]);

  if (state.availableMilestones.length === 0 && state.availableSubStages.length === 0) {
    return null;
  }

  /**
   * Znajdź aktualnie aktywne zadanie dla tego kontaktu (do zamknięcia przy tranzycji).
   * Zwraca null gdy brak — wtedy hook po prostu utworzy nowe.
   */
  const findActiveSourceTaskId = async (): Promise<string | null> => {
    const { data } = await supabase
      .from('tasks')
      .select('id')
      .eq('deal_team_contact_id', contactId)
      .in('status', ['todo', 'pending', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.id ?? null;
  };

  const runTransition = async (
    nextStage: SguStage | null,
    contactPatch: Record<string, unknown>,
  ) => {
    const sourceTaskId = await findActiveSourceTaskId();
    await transitionMut.mutateAsync({
      teamId,
      teamContactId: contactId,
      contactId: contactRecordId,
      contactName,
      contactCompany: contactCompany ?? null,
      nextStage,
      sourceTaskId,
      newTaskDueDate: null,
      contactPatch,
    });
  };

  const stamp = async (key: MilestoneKey) => {
    const stage = OFFERING_STAGE_MAP[key];
    if (!stage) return;
    if (!hasDirector) {
      toast.error('Ten kontakt nie ma przypisanego dyrektora.', {
        description: 'Przypisz dyrektora przed dodaniem zadania.',
      });
      return;
    }
    const sguNext = asSguStage(stage);
    try {
      const patch: Record<string, unknown> = { offering_stage: stage };
      if (key === 'k2') {
        // K2 (handshake) = kwalifikacja biznesowa — kontakt staje się leadem
        patch.category = 'lead';
      }
      if (key === 'k4') {
        patch.status = 'won';
        patch.category = 'client';
      }

      // Zamknij stary task + utwórz nowy + update kontaktu (atomicznie po stronie hooka).
      await runTransition(sguNext, patch);

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
      qc.invalidateQueries({ queryKey: ['active-task-contacts'] });
      qc.invalidateQueries({ queryKey: ['sgu-tasks'] });
      const nextTitle = sguNext ? buildTaskTitle(sguNext, contactName, contactCompany) : null;
      toast.success(
        nextTitle
          ? `${LABEL[key]} · utworzono zadanie: ${nextTitle}`
          : `Zaznaczono: ${LABEL[key]}`,
      );

      // Po pełnym zapisie milestone+category → poproś rodzica o otwarcie dialogu składek.
      // (state lokalny zniknąłby po invalidate, gdy kontakt wypada z agendy → unmount)
      if (key === 'k2') onPremiumPrompt?.('k2');
      if (key === 'k4') onPremiumPrompt?.('k4');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Nie udało się zapisać milestone';
      toast.error(msg);
    }
  };

  const stampSubStage = async (stage: OfferingStage) => {
    if (!hasDirector) {
      toast.error('Ten kontakt nie ma przypisanego dyrektora.', {
        description: 'Przypisz dyrektora przed dodaniem zadania.',
      });
      return;
    }
    const sguNext = asSguStage(stage);
    try {
      // Zamknij stary task + utwórz nowy task pod nowy etap + zaktualizuj offering_stage.
      await runTransition(sguNext, { offering_stage: stage });

      await logMut.mutateAsync({
        contactId,
        teamId,
        tenantId,
        decision: 'push',
        milestoneVariant:
          state.currentMilestone === 'prospect'
            ? null
            : (state.currentMilestone as MilestoneVariant),
        odprawaSessionId,
        notes: OFFERING_STAGE_LABEL[stage],
      });

      qc.invalidateQueries({ queryKey: ['deal_team_contact_for_agenda'] });
      qc.invalidateQueries({ queryKey: ['odprawa-agenda'] });
      qc.invalidateQueries({ queryKey: ['odprawa-session-decisions'] });
      qc.invalidateQueries({ queryKey: ['active-task-contacts'] });
      qc.invalidateQueries({ queryKey: ['sgu-tasks'] });
      setJustSavedStage(stage);
      const nextTitle = sguNext ? buildTaskTitle(sguNext, contactName, contactCompany) : null;
      toast.success(
        nextTitle
          ? `${OFFERING_STAGE_LABEL[stage]} · utworzono zadanie: ${nextTitle}`
          : `Zapisano: ${OFFERING_STAGE_LABEL[stage]}`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Nie udało się zapisać sub-stage';
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold">Co się stało od ostatniej odprawy?</div>
      <div className="flex flex-wrap gap-2">
        {/* Aktualny sub-stage (read-only chip) — żeby user widział co już jest zapisane */}
        {state.currentOfferingStage && state.showSubStageStrip && (
          <div
            className={cn(
              'inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium',
              'bg-amber-50 border-amber-300 text-amber-900',
              justSavedStage === state.currentOfferingStage &&
                'ring-2 ring-amber-400 ring-offset-1 animate-pulse',
            )}
          >
            <Check className="h-3 w-3 mr-1" />
            {state.currentOfferingStageLabel}
          </div>
        )}
        {state.availableSubStages.map((stage) => (
          <Button
            key={stage}
            variant="outline"
            size="sm"
            disabled={logMut.isPending || transitionMut.isPending}
            onClick={() => stampSubStage(stage)}
            className={cn(
              'text-xs text-muted-foreground border-dashed',
              justSavedStage === stage && 'ring-2 ring-amber-400 ring-offset-1',
            )}
          >
            <span className="mr-1.5 text-[10px]">●</span>
            {OFFERING_STAGE_LABEL[stage]}
          </Button>
        ))}
        {state.availableMilestones.map((key) => (
          <Button
            key={key}
            variant={key === 'k4' ? 'default' : 'outline'}
            size="sm"
            disabled={logMut.isPending || transitionMut.isPending}
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