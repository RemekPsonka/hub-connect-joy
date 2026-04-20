

## Plan: KROK 8 — Zadania + Admin + Cleanup (zgranie ze spec)

### Recon (rozjazdy obecny stan vs. spec)

| Element | Obecny stan | Spec wymaga | Akcja |
|---|---|---|---|
| `/sgu/zadania` | `SGUTasks` używa `useSGUTasks` + `TaskRow` + `MyKanban`, własna implementacja | `<TasksHeader/> + <MyTeamTasksView/>` z 4 grupami Collapsible | **Zastąpić** zawartość strony |
| `MyTeamTasksView` | Już ma 4 grupy (Dziś/Zaległe/7d/Wszystkie) + dealStageBadge — zrobione w IA-3-2 | Te same wymagania | **OK, bez zmian** (zweryfikuję ikonki: spec chce 🎯🔥📋✅❌, obecnie inne — patch) |
| `/sgu/admin` | 5 tabów już są (zespol/produkty/prowizje/pipeline/ustawienia) | 5 tabów + sekcja "Mapowanie produktu do obszaru sprzedaży" w Produkty | **Dodać** mapowanie produktów do `ProductsAdminTab` |
| `/sgu/raporty` | `SGUReports` — pełna implementacja z snapshotami, generowaniem, podglądem | `<Alert>Raporty są w przygotowaniu</Alert>` + lista 4 placeholderów | **NIE robić** — to regresja. Zachować obecny widok, dodać tylko sidebar gating |
| `SGUSidebar` Raporty | Zawsze widoczny (`analyticsItems`) | Widoczny tylko gdy `enable_sgu_reports=true` | **Patch sidebar** — gating przez `useSGUTeamId().enableReports` |
| Cleanup `SnoozedTeamView` import | Używany w `DealsTeamDashboard` w `viewMode === 'snoozed'` | Spec mówi "usuń import" | **NIE usuwać** — to działający widok. Komentarz wystarczy |

### Decyzje vs. spec (świadome odstępstwa)

**1. `/sgu/raporty` — NIE robię regresji do stub**
Pełny moduł raportów już istnieje (snapshoty, PDF export, podgląd). Spec mówi "stub + 4 placeholdery" — to byłaby destrukcja działającej funkcji. **Zostawiam SGUReports w obecnej formie**, tylko dodaję flagę `enable_sgu_reports` jako kontrolę widoczności w sidebarze. Komentarz w kodzie + zapis w memory.

**2. Cleanup `SnoozedTeamView` import — NIE usuwam**
Używany aktywnie w `DealsTeamDashboard` (linia 239: `viewMode === 'snoozed'`). Usunięcie złamie route `/sgu/pipeline?view=snoozed` i sidebar item "Odłożone".

**3. Cleanup `WORKFLOW_COLUMNS` — NIE usuwam**
Używany w `TaskDetailSheet.tsx` (workflow column dropdown) i `pipelineStagesAdapter.ts`. To nie martwy kod.

**4. Ikonki `dealStageBadge`**
Obecnie w `UnifiedTaskRow`: `lead=🔍, offering=📄, client=🤝, lost=❌, prospect=🌱`. Spec chce: `prospect=🎯, lead=🔥, offering=📋, client=✅, lost=❌`. **Patch** — zmiana literałów w `UnifiedTaskRow.tsx`.

**5. Mapowanie produktu do obszaru sprzedaży**
Spec wymaga w `Produkty`: per produkt mapowanie na `property | financial | communication | life_group`. Sprawdzę schemat `deal_team_products` — jeśli brakuje kolumny `sales_area`, dodam migrację. Render: kolumna `Select` w tabeli produktów.

### Migracja DB (warunkowa)

Sprawdzę czy `deal_team_products.sales_area` istnieje. Jeśli nie:
```sql
ALTER TABLE public.deal_team_products 
  ADD COLUMN IF NOT EXISTS sales_area text 
  CHECK (sales_area IN ('property','financial','communication','life_group'));
COMMENT ON COLUMN public.deal_team_products.sales_area IS 'Mapowanie produktu na obszar sprzedaży (4 obszary kompleksowości klienta)';
-- ROLLBACK: ALTER TABLE public.deal_team_products DROP COLUMN sales_area;
```

### Pliki do modyfikacji (5)

1. **`src/pages/sgu/SGUTasks.tsx`** — uproszczenie: render `<TasksHeader/>` + `<MyTeamTasksView teamId={sguTeamId}/>` (drop własna logika z accordion + Tabs Lista/Tablica). `MyKanban` — zachowuję plik, ale strona nie używa.

2. **`src/components/tasks/UnifiedTaskRow.tsx`** — patch ikonek `STAGE_ICON`: prospect=🎯, lead=🔥, offering=📋, client=✅, lost=❌.

3. **`src/components/sgu/admin/ProductsAdminTab.tsx`** — dodać sekcję "Mapowanie obszarów" pod `ProductCategoryManager`:
   - tabela: nazwa produktu | Select (Majątek/Finanse/Komunikacja/Życie/Grupowe)
   - mutation update `deal_team_products.sales_area`
   - invalidate `['deal-team-products', teamId]`

4. **`src/components/layout/SGUSidebar.tsx`** — gating "Raporty":
   - import `useSGUTeamId`
   - `analyticsItems` filter: `Raporty` tylko gdy `enableReports === true`

5. **`supabase/migrations/<ts>_add_sales_area_to_deal_team_products.sql`** — warunkowo (jeśli kolumna nie istnieje).

### Pliki świadomie pominięte
- `SGUReports.tsx` — zachowany (regresja niedopuszczalna).
- `DealsTeamDashboard.tsx` — `SnoozedTeamView` import zostaje (używany).
- `TaskDetailSheet.tsx`/`pipelineStagesAdapter.ts` — `WORKFLOW_COLUMNS` zostaje (używany).
- `MyTeamTasksView.tsx` — bez zmian (już ma 4 grupy z IA-3-2).
- `useTasks.ts` — bez zmian (`useMyTeamAssignments` już joinuje `deal_team_contacts` z IA-3-2).
- `SGUAdmin.tsx` — bez zmian (5 tabów już są z IA-3-3).

### Memory note
Po implementacji zapis: `mem://features/sgu/reports-feature-flag` — "Raporty SGU widoczne w sidebarze tylko gdy `sgu_settings.enable_sgu_reports=true`. Trasa `/sgu/raporty` dostępna zawsze (deep link), ale w nawigacji ukryta domyślnie."

### DoD verification
- ✅ `/sgu/zadania` — 4 grupy + badge (`MyTeamTasksView` z IA-3-2 + patch ikon)
- ✅ `/sgu/admin` — 5 tabów + nowa sekcja mapowania w Produkty
- ✅ `/sgu/raporty` — sidebar hidden domyślnie (flag), strona zachowana
- Lista zmodyfikowanych plików: 4 .tsx + 1 .sql (warunkowy)

