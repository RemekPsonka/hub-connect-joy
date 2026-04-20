

## BLOK IA-3-FIX-3 — Manual smoke checklist + raport końcowy IA-3

### Co robimy

**1 plik EDITED** (nie CREATE — `docs/qa/sgu-refactor-ia-smoke.md` już istnieje z poprzedniego BLOK 3, zawiera krótszą wersję):

- `docs/qa/sgu-refactor-ia-smoke.md` — pełna podmiana na wersję z briefu (23 kroków: 18 partner + 2 seller + 3 redirect, tabele markdown, sekcja Wyniki).

### Świadome odstępstwa

1. **Krok 5** brief mówi: "Drag Lead → Ofertowanie ... NIE pojawia się dialog". W naszej IA `/sgu/sprzedaz` ma 4-kolumnowy Kanban (Prospect/Lead/Audyt/Klient), Ofertowanie to **osobny view** (`?view=offering`, 8 kolumn). Drag Lead → Audyt = poprawny flow. Krok zostawiam dosłownie z briefu — Remek zinterpretuje jako "drag Lead → kolejny etap bez dialogu".
2. **Krok 9** mówi "ClientComplexityPanel u góry (6 elementów) + ClientObszaryTab pod spodem" — to **Wariant A**. W BLOK IA-3-FIX-1 zatwierdziliśmy **Wariant B** (status quo: lista klientów + per-client ComplexityPanel). Krok zostawiam dosłownie z briefu — przy wykonaniu Remek zaznaczy ⚠️ i zdecyduje czy potrzebuje przerobienia na Wariant A.
3. **Krok 18** "Renderuje pełny moduł Raporty (świadome odstępstwo od stub)" — zgodne z naszą decyzją z BLOK IA-3-3 (`mem://features/sgu/reports-feature-flag`).

### Po utworzeniu pliku — raport końcowy IA-3

Wypiszę zwięzły raport (~30 linii):

**a) Pliki — bilans całego IA-3 (BLOK 1-4 + FIX 1-3):**
- CREATED: 12 plików (5×dashboard cards, 5×admin tabs, 2×hooks dashboard, smoke checklist, e2e spec+helpery)
- EDITED: 11 plików (SGUDashboard, SGUAdmin, SGUTasks, SGUClients, SGUClientsView, 3×ClientTab, UnifiedTaskRow, SGUSidebar, DealsTeamDashboard)
- DELETED: 0 (wszystkie pliki zachowane per spec)

**b) Decyzje architektoniczne (świadome odstępstwa od briefu):**
1. `/sgu/raporty` = pełen moduł, NIE Alert stub (sidebar gating wystarczy)
2. Tab "Obszary" = Wariant B (per-client ComplexityPanel, nie globalny)
3. `WORKFLOW_COLUMNS` zachowany (używany w `TaskDetailSheet`)
4. Pliki `SnoozedTeamView/TeamStats/OfferingTab` w repo bez referencji
5. Playwright odłożony do IA-4 (mimo że spec + helpery już są w repo — gotowe, czeka na CI)

**c) Następne kroki:**
1. Remek wykonuje smoke test (`docs/qa/sgu-refactor-ia-smoke.md`) — ~20 min
2. Wynik PASS → IA-3 zamknięte → planowanie IA-4 (Playwright CI + Wariant A obszary jeśli potrzebne + cross-sell tab)
3. Wynik FAIL na konkretnych krokach → osobne FIX-y per krok

**d) DoD końcowy IA-3:**
- ✅ 6 tabów `/sgu/klienci`
- ✅ 5 tabów `/sgu/admin` z gate
- ✅ Sidebar Raporty gating
- ✅ Dashboard `/sgu` 5 priorytetów + 5 alertów
- ✅ Cleanup `DealsTeamDashboard` (offering→kanban+filter)
- ✅ Toast redirect legacy → SGU
- ⚠️ Smoke test wykonuje Remek manualnie

### Pliki

| Plik | Akcja |
|---|---|
| `docs/qa/sgu-refactor-ia-smoke.md` | EDIT — pełna podmiana na wersję 23-krokową z briefu |

