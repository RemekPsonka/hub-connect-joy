

## Status: KROK 7 już zaimplementowany w poprzedniej iteracji + brakujące elementy

Po analizie kontekstu (poprzednia wiadomość AI + pliki w `<current-code>`) — większość Kroku 7 jest **zrobiona**. Sprawdzam co JEST vs. BRAKUJE wg tego prompta.

### Co JEST (potwierdzone w `<current-code>`)
- ✅ `SGUDashboard.tsx` — przebudowany: `DashboardHeader` + grid 2-col (`PriorityTodayCard` + `AlertsCard`) + `TeamPerformanceCard` (partner-only) + `FunnelConversionChart` + `StickyQuickActions` + empty state guard
- ✅ `PriorityTodayCard.tsx` — 5 wierszy P1–P5 z hookami `usePriorityTaskToday/StuckNegotiation/OverduePayment/ColdTopLead/CrossSell`, klikalne navigate, placeholder "Brak priorytetu"
- ✅ `StickyQuickActions.tsx` — 3 buttony (Dodaj kontakt / Nowe zadanie / Nowa polisa)
- ✅ `TeamPerformanceCard.tsx` — wrapper + `useSGUTeamPerformance`, render warunkowy w SGUDashboard (`isPartner`)
- ✅ `AlertsCard.tsx` — wrapper wokół istniejącego `<AlertsPanel/>`
- ✅ `EmptyStateCTA.tsx` — 3 tiles (Dodaj klienta / Import CSV / AI KRS)
- ✅ `FunnelConversionChart` reuse z `deals-team/`

### Rozjazd vs. obecny prompt (5 punktów do uzupełnienia)

**1. Tytuł `PriorityTodayCard` → "Co dziś" + ikona Target**
- Obecnie: `"Priorytety na dziś"` bez ikony. Drobna korekta tekstu + dodać `<Target/>` z lucide.

**2. URL params w nawigacji P1–P5 — NIEZGODNE**
| Priorytet | Obecnie | Wymagane |
|---|---|---|
| P1 | `/sgu/zadania` (bez taskId) | `/sgu/zadania?taskId={id}` |
| P2 | `/sgu/sprzedaz?contact={id}` | `/sgu/sprzedaz?contactId={id}&stage=offering` |
| P3 | `/sgu/klienci?contact={id}&tab=raty` | `/sgu/klienci?tab=raty&contactId={id}` |
| P4 | `/sgu/sprzedaz?contact={id}` | `/sgu/sprzedaz?contactId={id}` |
| P5 | `/sgu/klienci?contact={id}&tab=obszary` | `/sgu/klienci?contactId={id}&tab=obszary` |

Akcja: zmiana `navigateTo` w 5 hookach (`contact` → `contactId`, dodać taskId/stage).

**3. `AlertsCard` — BRAKUJE 5 dedykowanych alertów A1–A5**
- Obecnie: tylko wrapper wokół `AlertsPanel` (legacy, nieznana zawartość).
- Wymagane: 5 konkretnych liczników z navigate:
    - A1: Polisy wygasające <14d → `/sgu/klienci?tab=odnowienia&filter=lt14`
    - A2: Raty zaległe 30+d → `/sgu/klienci?tab=raty&filter=overdue30`
    - A3: Klienci stale 30+d → `/sgu/klienci?filter=stale`
    - A4: Nowe prospekty AI KRS 7d → `/sgu/sprzedaz?filter=prospect&source=ai_krs`
    - A5: Kandydaci na Ambasadora (5/6 complexity) → `/sgu/klienci?filter=near_ambassador`
- Każdy z badge count: `0` szary, `>0` warning/destructive.

Akcja: przepisać `AlertsCard.tsx` od zera + 5 hooków (lub 1 hook z 5 countami). **Nie używam** `AlertsPanel` legacy.

**4. `StickyQuickActions` — BRAKUJE 4. przycisku + zmiana składu**
- Obecnie: 3 (Dodaj kontakt / Nowe zadanie / Nowa polisa).
- Wymagane: 4 (Dodaj klienta / Import CSV / AI KRS scan / Raport tygodniowy PDF).
- Akcja: przepisać. „Raport tygodniowy PDF" = `toast.info("Sprint SGU-08")` stub.

**5. P3 query — meta info**
- Obecnie hook P3 query OK, ale meta nie pokazuje nazwy klienta (P3 navigateTo używa `deal_team_contact_id`, sprawdzę czy hook to zwraca).

### Pliki do edycji (5) + utworzenia (5 hooków alertów)

**EDIT (5):**
1. `src/components/sgu/dashboard/PriorityTodayCard.tsx` — tytuł "Co dziś" + ikona Target
2. `src/hooks/sgu-dashboard/usePriorityTaskToday.ts` — `?taskId={id}`
3. `src/hooks/sgu-dashboard/usePriorityStuckNegotiation.ts` — `?contactId={id}&stage=offering`
4. `src/hooks/sgu-dashboard/usePriorityOverduePayment.ts` — `?tab=raty&contactId={id}`
5. `src/hooks/sgu-dashboard/usePriorityColdTopLead.ts` — `?contactId={id}`
6. `src/hooks/sgu-dashboard/usePriorityCrossSell.ts` — `?contactId={id}&tab=obszary`
7. `src/components/sgu/dashboard/AlertsCard.tsx` — przepisać: 5 wierszy A1–A5 z navigate
8. `src/components/sgu/dashboard/StickyQuickActions.tsx` — 4 buttony (Dodaj klienta / Import CSV / AI KRS / Raport PDF)

**NEW (1 hook agregujący):**
9. `src/hooks/sgu-dashboard/useDashboardAlerts.ts` — 5 countów w 1 hooku (jedna `Promise.all` 5 supabase queries, zwraca `{a1, a2, a3, a4, a5}`).

### Kluczowe decyzje
- **AlertsPanel legacy** — nie zmieniam, nie usuwam (może być używany gdzie indziej). Po prostu `AlertsCard` przestaje go renderować.
- **A5 (Ambasador 5/6)** — heurystyka: count `deal_team_contacts` gdzie `client_status='standard'` i dokładnie 1 z 4 `potential_*_gr` = 0 (czyli 3 z 4 active = bliskie pokrycia). Komplet 6 elementów complexity (4 obszary + referrals + references) wymaga JOIN — uproszczę do "3 z 4 obszarów aktywne" jako proxy. Komentarz `// TODO: pełna logika 5/6 complexity w IA-3 część dalsza`.
- **A4 (prospect_source='ai_krs')** — sprawdzę czy kolumna `prospect_source` istnieje w `deal_team_contacts`. Jeśli nie → fallback `created_at > now()-7d AND deal_stage='top'` + komentarz TODO.
- **Counts** — `{ count: 'exact', head: true }` dla efektywności (bez ciągnięcia danych).
- **Empty state** — warunek `clients+contacts === 0` już zaimplementowany w `useDashboardEmptyState` (count na `deal_team_contacts`). Bez zmian.

### Pominięte świadomie
- **Pełna logika "5/6 complexity"** dla A5 — wymaga osobnego hooka z weryfikacją 6 pól per rekord. Obecnie proxy "3/4 obszarów". Notka w kodzie.
- **`useCrossSellCandidates`** shared hook — dalej skip (P5 ma swój dedykowany).
- **A4 jeśli `prospect_source` nie istnieje** — fallback z TODO.

