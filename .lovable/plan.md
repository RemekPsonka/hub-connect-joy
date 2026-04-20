

## Plan: KROK 8 — SGUAdminPage 5 zakładek

### Decyzje vs. spec (rozjazdy)

**1. `commission_base_split` schema NIE pasuje do spec**
Spec chce: `ProductCategory × rate_rep × rate_partner × rate_director`. Realna tabela: `role_key` (text, np. `sgu_company`/`adam`/`paweł`/`remek` lub `rep:<uuid>`), `share_pct`, `active_from/to`. To jest pojedynczy split bazowy (Case A), już obsługiwany w `SGUCommissionsAdmin.tsx`.

**Decyzja**: W `CommissionsSplitTab` reuse istniejący `SGUCommissionsAdmin` content (read-only tabela aktywnego splita + historia). Edycja per-row to osobny sprint (SGU-08). Komentarz `// TODO: dodanie inline edit udziałów w SGU-08`. **Nie wymyślam kolumn ProductCategory × rate_*.**

**2. `sgu_settings` brakuje 2 kolumn (`enable_sgu_prospecting_ai`, `enable_sgu_reports`)**
**Decyzja**: Migracja DB doda 2 kolumny `boolean DEFAULT false`. Bez archiwizacji (dodanie nullable bool nie niszczy danych).

**3. `PipelineConfigurator` jest Dialog-em z teamId+tenantId+open**
**Decyzja**: `PipelineConfigTab` to wrapper z przyciskiem `[Otwórz konfigurator]` → otwiera Dialog. Pobiera `teamId` z `useSGUTeamId`, `tenantId` z `sgu_settings` (rozszerzę `useSGUTeamId`).

**4. `SGUAdmin.tsx` — refactor czy nowy `SGUAdminPage`?**
Spec mówi `SGUAdminPage.tsx`. Ale routing w `App.tsx` używa `SGUAdmin`. **Decyzja**: Refactor istniejącego `src/pages/sgu/SGUAdmin.tsx` (zachowuję default export, App.tsx bez zmian). Hub-tile mode + `commissions` legacy → usuwam, zastępuję 5-tabami. `:section` route → mapuję na `defaultValue` Tabs.

**5. Guard partner/director**
`useSGUAccess()` zwraca `isPartner` i `isRep`. Brak `isDirector`, ale `useAuth().director` daje info. **Decyzja**: dostęp gdy `isPartner || !!director`. Gdy `isRep && !isPartner` → `<Navigate to="/sgu" replace/>`.

### Migracja DB (1)
```sql
ALTER TABLE public.sgu_settings 
  ADD COLUMN IF NOT EXISTS enable_sgu_prospecting_ai boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS enable_sgu_reports boolean NOT NULL DEFAULT false;
-- ROLLBACK: ALTER TABLE public.sgu_settings DROP COLUMN enable_sgu_prospecting_ai, DROP COLUMN enable_sgu_reports;
```

### Pliki

**EDIT (2):**
1. `src/pages/sgu/SGUAdmin.tsx` — refactor: guard + CommissionsHeader + Tabs (5) + content per tab. Usuwam hub-tile mode i `commissions` lazy. Wsparcie URL `?tab=` dla deep linkowania.
2. `src/hooks/useSGUTeamId.ts` — rozszerzyć select o `tenant_id, enable_sgu_prospecting_ai, enable_sgu_reports`; zwrócić `tenantId`, `enableProspectingAI`, `enableReports`.

**NEW (6):**
3. `src/components/sgu/admin/TeamAdminTab.tsx` — `useTeamMembers(sguTeamId)`. Tabela: avatar/nazwa/email/rola/status. Przycisk `[+ Zaproś przedstawiciela]` → `toast.info('Sprint SGU-09')`.
4. `src/components/sgu/admin/ProductsAdminTab.tsx` — render `<ProductCategoryManager teamId={sguTeamId}/>` bezpośrednio (nie dialog).
5. `src/components/sgu/admin/CommissionsSplitTab.tsx` — przeniesiona logika z `SGUCommissionsAdmin` (read-only tabela aktywnego splita + historia + sumWarning). Komentarz TODO o edycji.
6. `src/components/sgu/admin/PipelineConfigTab.tsx` — przycisk + `<PipelineConfigurator teamId tenantId open onOpenChange/>` w state. Gdy brak `teamId/tenantId` → `<Alert>`.
7. `src/components/sgu/admin/SGUSettingsTab.tsx` — Form z 3 `<Switch>` (enable_sgu_layout/prospecting_ai/reports). Read przez `useSGUSettings()` (nowy hook). Update przez `useUpdateSGUSettings()` (mutation, upsert by tenant_id). Disabled dla `isPartner && !director`. Invalidate `['sgu-settings']`, `['sgu-team-id']`.
8. `src/hooks/useSGUSettings.ts` — query (full row) + mutation upsert. queryKey `['sgu-settings']`.

**NIE TWORZĘ:**
- `SGUAdminPage.tsx` (nowy plik) — refactor istniejącego `SGUAdmin.tsx` zamiast.
- Edycji split per-row (Case D) — TODO SGU-08.
- Stub `enable_sgu_reports` UI gdy nieaktywny — Switch widoczny ale `SGUReports` route bez gating w tym kroku.

### Struktura `SGUAdmin.tsx`
```tsx
const { isPartner } = useSGUAccess();
const { director } = useAuth();
const allowed = isPartner || !!director;
if (!allowed) return <Navigate to="/sgu" replace/>;

const { sguTeamId, tenantId } = useSGUTeamId();
const [tab, setTab] = useState(searchParams.get('tab') ?? 'zespol');

return (
  <div className="max-w-6xl mx-auto space-y-4">
    <CommissionsHeader teamId={sguTeamId ?? undefined}/>
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="grid grid-cols-5 w-full max-w-3xl">
        <TabsTrigger value="zespol">Zespół</TabsTrigger>
        <TabsTrigger value="produkty">Produkty</TabsTrigger>
        <TabsTrigger value="prowizje">Prowizje</TabsTrigger>
        <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
        <TabsTrigger value="ustawienia">Ustawienia</TabsTrigger>
      </TabsList>
      <TabsContent value="zespol"><TeamAdminTab teamId={sguTeamId}/></TabsContent>
      <TabsContent value="produkty"><ProductsAdminTab teamId={sguTeamId}/></TabsContent>
      <TabsContent value="prowizje"><CommissionsSplitTab/></TabsContent>
      <TabsContent value="pipeline"><PipelineConfigTab teamId={sguTeamId} tenantId={tenantId}/></TabsContent>
      <TabsContent value="ustawienia"><SGUSettingsTab/></TabsContent>
    </Tabs>
  </div>
);
```

### Konsekwencje
- `SGUCommissionsAdmin.tsx` — **zostawiam plik** (route `/sgu/admin/commissions/case-d` go nie używa, ale lazy import w starym SGUAdmin znika; samym pliku może być powołany w przyszłości). Komentarz `// LEGACY: zachowane do referencji, faktyczny widok teraz w CommissionsSplitTab`. Alternatywa: archiwizacja → zostawiam in-place.
- Routing `App.tsx` bez zmian. Route `/sgu/admin/:section` (catch-all) pokazywał nieistotne sekcje placeholder — po refactorze będzie próbował renderować Tabs z `defaultValue=section`. Mapping `:section` → `tab` (np. `commissions` → `prowizje`, `team` → `zespol`).
- `SGURepresentatives`/`SGUAssignments`/`SGUCaseD` — dedykowane routes nadal działają niezależnie.

