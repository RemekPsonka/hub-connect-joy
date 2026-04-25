
# ODPRAWA-SUBSTAGE-01 — sub-stage'y w karcie Odprawy

## PRE-FLIGHT ✅
- **0.1 CHECK constraint**: 14 wartości obecne — `decision_meeting, handshake, power_of_attorney, audit, offer_sent, negotiation, won, lost, meeting_plan, meeting_scheduled, meeting_done, audit_plan, audit_scheduled, audit_done`. ✅
- **0.2 useLogDecision**: `milestoneVariant: MilestoneVariant` (bez null). Trzeba rozszerzyć do `MilestoneVariant | null` (wymagane gdy sub-stage zapisuje się będąc na milestone bez wariantu, np. `prospect`).

## Scope adjustment
- **Krok 5 (10x toggle) pomijam** — `OperationalActions.tsx` już ma pełną implementację (`Sparkles`, `toggle10x`, fioletowy state, invalidate agendy). Acceptance check `rg "Sparkles"` już zielony.
- Reszta scope bez zmian.

## Co dotykam (5 plików, 1 nowy)

### A. NOWY: `src/lib/offeringStageLabels.ts`
Eksport `OfferingStage` (union 14 wartości, zgodny z CHECK), `OFFERING_STAGE_LABEL` (mapa label→PL), oraz 3 grupy sub-stages:
- `PRE_K1_SUBSTAGES = ['decision_meeting', 'meeting_plan', 'meeting_scheduled']`
- `PRE_K3_SUBSTAGES = ['audit_plan', 'audit_scheduled']`
- `POST_K3_SUBSTAGES = ['offer_sent', 'negotiation']`

### B. `src/hooks/useLogDecision.ts`
- `LogDecisionInput.milestoneVariant: MilestoneVariant | null` (rozszerzenie typu).
- `meeting_decisions.milestone_variant` przyjmuje już null (kolumna nullable po stronie DB — zakładam, walidacja przy zapisie).

### C. `src/hooks/odprawa/useContactTimelineState.ts`
- Dorzucam do Pick: `'offering_stage'`.
- Dorzucam do `ContactTimelineState`:
  - `currentOfferingStage: OfferingStage | null`
  - `currentOfferingStageLabel: string`
  - `availableSubStages: OfferingStage[]` — kontekst per `currentMilestone`:
    - `prospect` → `PRE_K1_SUBSTAGES.filter(s => s !== contact.offering_stage)`
    - `k2+` → `PRE_K3_SUBSTAGES.filter(...)`
    - `k3` → `POST_K3_SUBSTAGES.filter(...)`
    - else → `[]`
  - `showSubStageStrip: boolean` = `currentMilestone === 'prospect' || currentMilestone === 'k3'`

### D. NOWY: `src/components/sgu/odprawa/OfferingStageStrip.tsx`
Pasek pod osią. Render tylko gdy `state.showSubStageStrip`. Sekwencja 4 punktów:
- **prospect**: `[Spotkanie decyzyjne] → [Umawiamy] → [Umówione] → [→ K1]`
- **k3**: `[Audyt] → [Złożona oferta] → [Negocjacje] → [→ K4]`

Marker:
- aktualny (`stage === contact.offering_stage`) → wypełniony, podświetlony
- przed aktualnym → szary z ✓
- po aktualnym → pusta kropka
- ostatni element to label kierunkowy bez kropki (`→ K1` / `→ K4`)

Style: `text-[13px]`, neutralne kolory (border-secondary), spójne z `ContactTimeline`. Bez interakcji — czysto wizualne.

### E. `src/components/sgu/odprawa/MilestoneActionStrip.tsx`
Rozszerzenie o sub-stage buttony. W jednym pasku flex-wrap:
1. Najpierw `state.availableSubStages` jako buttony `variant="outline" size="sm"` z `text-muted-foreground` i ikoną `●` (rozróżnienie od milestone).
2. Potem `state.availableMilestones` jak teraz.

Filter per current milestone (sub-stages tylko dla prospect/k2+/k3):
- prospect → PRE_K1 + k1
- k1, k2 → tylko milestone (brak sub-stages)
- k2+ → PRE_K3 + k3
- k3 → POST_K3 + k4
- k4 → []

`stampSubStage(stage)`:
```ts
await supabase.from('deal_team_contacts')
  .update({ offering_stage: stage })
  .eq('id', contactId);

await logMut.mutateAsync({
  contactId, teamId, tenantId,
  decision: 'push',
  milestoneVariant: state.currentMilestone === 'prospect' ? null : (state.currentMilestone as MilestoneVariant),
  odprawaSessionId,
  notes: OFFERING_STAGE_LABEL[stage],
});

qc.invalidateQueries({ queryKey: ['deal_team_contact_for_agenda'] });
qc.invalidateQueries({ queryKey: ['odprawa-agenda'] });
qc.invalidateQueries({ queryKey: ['odprawa-session-decisions'] });
toast.success(`Status: ${OFFERING_STAGE_LABEL[stage]}`);
```

Zero milestone stamp, zero `category`/`status` change, zero `onPremiumPrompt`. Kontakt zostaje w agendzie (nie wypada z `currentMilestone`).

### F. `src/pages/sgu/SGUOdprawa.tsx`
Po `<ContactTimeline state={timelineState} />` dorzucam:
```tsx
<OfferingStageStrip state={timelineState} />
```
Reszta layoutu bez zmian.

### Czego NIE dotykam
`useFinishOdprawa`, `useStartOdprawa`, `useAdvanceOdprawaContact`, `useOdprawaAgenda`, `ContactTimeline` (sama oś), `ContactTasksInline`, `NextStepDialog`, `OdprawaExceptionsBar`, `OperationalActions` (już ma 10x).

## Weryfikacja
- `npm run typecheck` clean
- `rg "OFFERING_STAGE_LABEL" src/` ≥ 3 hity
- `ls src/components/sgu/odprawa/OfferingStageStrip.tsx`, `ls src/lib/offeringStageLabels.ts`

## Smoke (manual po deploy)
1. /sgu/odprawa → kontakt na K3 (audit_done_at != NULL, won_at == NULL) → pasek `Audyt ✓ → ● Złożona oferta → ○ Negocjacje → ○ K4`
2. "Co się stało" pokazuje `[Złożona oferta] [Negocjacje] [Klient]`
3. Klik `[Złożona oferta]` → toast `Status: Złożona oferta`, marker w pasku przeskakuje, kontakt nie znika z agendy
4. Kontakt na Prospekt → pasek `● Spotkanie decyzyjne → ○ Umawiamy → ○ Umówione → ○ K1`, buttony `[Spotkanie decyzyjne] [Umawiamy] [Umówione] [Spotkanie odbyte]`
5. 10x toggle (już działa, smoke kontrolny)

## Commit
`feat(odprawa): ODPRAWA-SUBSTAGE-01 — sub-stage buttony + pasek pod osią`
