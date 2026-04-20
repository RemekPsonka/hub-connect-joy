

## Plan: Weryfikacja DoD IA-2 (read-only audit)

To jest checklist verification, nie nowa implementacja. Przejdę przez 11 punktów DoD i zweryfikuję każdy w kodzie. Większość jest zrobiona w iteracjach 1-6, ale są 2 znane gaps:

### Znane gaps (do uzupełnienia)
1. **`FourAreasBar` na karcie Offering** — w Kroku 4 świadomie skipnięte ("komponent nie istnieje, odłożyć do IA-3"). DoD wymaga ✓.
2. **5 vs 6 tabów w `/sgu/klienci`** — mamy 6 (portfolio/payments/obszary/polecenia/odnowienia/prowizje). DoD mówi 5 (bez payments). Decyzja: zostawić 6 ale zweryfikować, czy DoD-5 to literalne wymaganie czy minimum.

### Verification plan

**Step 1 — Audyt read-only (parallel reads)**
- `OfferingKanbanBoard.tsx` → grep 8 stages, dialog handlers ✓
- `OfferingKanbanCard.tsx` → grep `FourAreasBar` (potwierdzić brak)
- `DealsTeamDashboard.tsx` → grep `TeamStats` (potwierdzić usunięte)
- `src/components/sgu/headers/` → ls (potwierdzić 5 plików)
- `SGUPipelineRoute.tsx` → grep `SalesHeader` + `onCardClick` ✓
- `SGUClientsView.tsx` → grep 6 TabsTrigger ✓
- `ClientComplexityPanel.tsx` → grep 6 rzędów (property/financial/communication/life/referrals/references)
- `AddReferralDialog.tsx` + DB trigger ambasador → potwierdzić (memory: trigger DB istnieje)
- `ClientPaymentsTab.tsx` lub `ClientRenewalsTab.tsx` → gdzie Timeline 24mc?
- Grep `commission` Case D — sprawdzić że nietknięte

**Step 2 — Szukanie istniejącego `FourAreasBar`**
- `code--search_files` w `src/` na "FourAreasBar" lub "potential_property" component patterns
- Jeśli istnieje gdziekolwiek (np. dla ClientObszary) → reuse w OfferingKanbanCard
- Jeśli nie istnieje → stworzyć minimalny komponent (4 segmenty: 🏠💰📞🏥, opacity wg `potential_*_gr > 0`)

**Step 3 — Implementacja brakującego FourAreasBar (jedyna real edycja)**
- Plik `src/components/deals-team/offering/FourAreasBar.tsx` (nowy, ~30 linii):
  - Props: `propertyGr, financialGr, communicationGr, lifeGroupGr` (wszystkie number, default 0)
  - Render: flex row 4 emoji z `opacity-100` (active) lub `opacity-30` (inactive=0)
  - Tooltip z formatCompactCurrency wartości
- Edycja `OfferingKanbanCard.tsx`: import + render `<FourAreasBar/>` pod treścią karty (przed footerem z przyciskami)

**Step 4 — Raport końcowy DoD**
- Tabela 11 punktów × status (✓/✗/N/A)
- Plik(i) zmodyfikowane (tylko 2: nowy FourAreasBar + edycja Card)
- Notka o 6-vs-5 tabach (świadoma decyzja IA-2)
- Notka o regresji UnifiedKanban → manualny smoke test sugerowany dla usera

### Pliki do edycji (max 2)
- NEW: `src/components/deals-team/offering/FourAreasBar.tsx`
- EDIT: `src/components/deals-team/offering/OfferingKanbanCard.tsx`

### Pominięte świadomie
- Manualne E2E testy UnifiedKanban IA-1 (regresja) — wymaga klikania w preview, sugeruję user-driven smoke test po implementacji.
- Refactor 6→5 tabów w `/sgu/klienci` — payments tab to value-add z IA-2, nie usuwam.

