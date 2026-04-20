

## Status: Krok 4 już zrobiony w IA-2

Patrząc na historię: większość Kroku 4 jest już zaimplementowana w `OfferingKanbanBoard.tsx` z poprzednich iteracji. Sprawdzam co dokładnie zostało zrobione vs. co jeszcze brakuje wg tego prompta.

### Co JEST (z viewu pliku w kontekście)
- ✅ 8 stage w `STAGE_META` + kolejność `OFFERING_STAGE_ORDER` (won/lost ostatnie)
- ✅ Polskie labele w `OFFERING_STAGE_LABELS` (z `dealTeam.ts`)
- ✅ Toggle "Pokaż przegrane" (default OFF) ukrywający kolumnę `lost`
- ✅ Drop na `won` → `ConvertWonToClientDialog` (reuse z IA-1)
- ✅ Drop na `lost` → `LostReasonDialog` (set `is_lost=true`, `lost_reason`, `lost_at`)
- ✅ Legacy fallback mapping (preparation→offer_sent, accepted→won, audit_*→audit, meeting_*→decision_meeting)
- ✅ Nagłówek kolumny: count + Σ wartości (z payments)
- ✅ Timeline 24mc usunięty z `OfferingTab` (przeniesiony do `ClientPaymentsTab`)

### Czego BRAKUJE wg tego prompta
1. **Rollback handler**: drop `won`→inna kolumna lub `lost`→inna → `StageRollbackDialog`. Obecny kod milcząco pozwala przeciągnąć z won/lost gdziekolwiek bez confirm. Trzeba wykryć źródłowy stage karty i jeśli `won` lub `lost` → otworzyć rollback dialog (i przy cofaniu z `lost` wyczyścić `is_lost`/`lost_reason`/`lost_at`).
2. **`<FourAreasBar/>` na karcie offering** (`OfferingKanbanCard`). Trzeba sprawdzić czy komponent istnieje (z IA-1 — wspomniany w prompcie). Jeśli tak → reuse. Jeśli nie → odłożyć (poza scope, tylko zaznaczyć).
3. **Σ 4 obszarów w nagłówku kolumny** — obecnie jest tylko Σ payments, brakuje sumy `potential_property_gr + potential_financial_gr + potential_communication_gr + potential_life_group_gr` per kontakt w stage.
4. **Redirect `/deals-team?view=offering` → `/sgu/sprzedaz?filter=offering`** — sprawdzić czy istnieje, jeśli nie → dodać.

### Plan implementacji

**Step 1 — Recon (read-only, w plan mode)**
Muszę zweryfikować przed kodzeniem:
- Czy `FourAreasBar` istnieje w repo? (`src/components/sgu/...` lub `src/components/deals-team/...`)
- Czy `StageRollbackDialog` jest gotowy? (potwierdzone — istnieje, widziałem w kontekście IA-1)
- Czy `OfferingKanbanCard` ma już propsy żeby wcisnąć FourAreasBar, czy trzeba refactor?
- Czy `useUpdateTeamContact` obsługuje wyzerowanie `isLost=false` + `lostReason=null` + `lostAt=null` (z poprawek IA-2 — obsługuje `isLost`/`lostReason`/`lostAt`, ale trzeba zweryfikować że null działa)?
- Czy istnieje route alias `/deals-team?view=offering`?

**Step 2 — Edycje (default mode po approval)**

A. `OfferingKanbanBoard.tsx`:
- W `handleDrop`: przed sprawdzeniem stage docelowego, sprawdź `contact.offering_stage`. Jeśli `won` lub `lost` i target ≠ won/lost → otwórz `<StageRollbackDialog>` (nowy state `rollbackDialog`). 
- Po approve rollback: `updateContact.mutate({ id, teamId, offeringStage: targetStage, ...(fromStage==='lost' ? { isLost: false, lostReason: null, lostAt: null } : {}) })`.
- W nagłówku kolumny: dodać Σ `potential_*_gr` z `c.contact?.potential_property_gr` etc. (lub bezpośrednio z `c` jeśli pola są na `deal_team_contacts`). Wyświetlić jako druga linijka małym fontem.

B. `OfferingKanbanCard.tsx`:
- Jeśli `FourAreasBar` istnieje → import + render pod treścią karty.
- Jeśli nie → POMINĄĆ (out of scope, zaznaczyć w raporcie do IA-3).

C. `useUpdateTeamContact` (jeśli trzeba):
- Upewnić się że `null` w `lostReason`/`lostAt` propaguje do `update()` jako `null` (a nie `undefined` które pomija pole).

D. Redirect `/deals-team?view=offering` → `/sgu/sprzedaz?filter=offering`:
- W `App.tsx` lub odpowiednim routerze: dodać `<Route path="/deals-team" element={<DeprecatedRedirect />} />` z parsowaniem query param. ALBO jeśli `/deals-team` jeszcze działa jako pełna strona → dodać przekierowanie wewnątrz `DealsTeamDashboard.tsx` przy `view==='offering'`.

E. `OfferingTab.tsx` — Timeline 24mc usunięty (potwierdzone w IA-2). Skip.

**Step 3 — Raport**
- Lista zmodyfikowanych plików (max 4: OfferingKanbanBoard, OfferingKanbanCard?, useDealsTeamContacts?, App.tsx/redirect?).
- Status checklisty DoD (5 punktów).
- Zaznaczenie ewentualnego skip-a (FourAreasBar jeśli nie istnieje).

### Pytania do usera (1, krytyczne)

Przed implementacją muszę wiedzieć: czy `FourAreasBar` faktycznie istnieje w repo z IA-1, czy to prompt-założenie które nie zostało zaimplementowane? Jeśli nie istnieje — czy mam:
- (A) stworzyć go teraz jako część Kroku 4 (mini horizontal bar z 4 segmentami: 🏠💰📞🏥, każdy proporcjonalny do `potential_*_gr`, kolor active/muted), albo
- (B) skip i odłożyć do IA-3.

Reszta jest jasna.

