

## BLOK B-FIX — dokończenie kanbana do SPEC-IA-v2-FINAL

### Pliki

| Plik | Akcja |
|---|---|
| `src/components/sgu/sales/TemperatureBadge.tsx` | CREATE |
| `src/components/sgu/sales/SourceBadge.tsx` | CREATE |
| `src/components/sgu/sales/ComplexityChips.tsx` | CREATE |
| `src/components/sgu/sales/UnifiedKanbanCard.tsx` | EDIT — podmiana inline temperature/areas na nowe komponenty + dodanie SourceBadge dla prospect |
| `src/components/sgu/sales/UnifiedKanban.tsx` | EDIT — toggle Wariant A + Σ PLN w nagłówku kolumny |
| `src/components/sgu/headers/SalesHeader.tsx` | EDIT — counts liczone z `deal_stage` (przez `deriveStage`) zamiast surowego `category` |
| `docs/qa/sgu-refactor-ia-blokB.md` | EDIT — dopisać sekcję `## BLOK B-FIX` |

### 1. Nowe atomowe komponenty

**`TemperatureBadge.tsx`** — `{value: Temperature | string | null}` → `Badge` z kolorem per HOT/TOP/COLD/10x. Zwraca `null` gdy brak. Używa `Badge` z `@/components/ui/badge` + `cn` dla styli (spójnie z resztą projektu — nie inline klas).

**`SourceBadge.tsx`** — `{value: ProspectSource | string | null}` → `Badge` z labelem CRM PUSH / CC / AI KRS / AI WEB / CSV / Ręczne. Zwraca `null` gdy brak. Używa `PROSPECT_SOURCE_LABELS` z `@/types/dealTeam` (DRY).

**`ComplexityChips.tsx`** — `{complexity: ClientComplexity | Record<string, unknown> | null | undefined}` → flex-wrap chipów (🏠/💰/📞/🏥) tylko dla aktywnych obszarów. Zwraca `null` gdy brak aktywnych.

Wszystkie z named export, bez `any` (typy z `@/types/dealTeam`).

### 2. `UnifiedKanbanCard.tsx` — refactor

- Usunąć lokalne stałe `TEMP_CLASSES`, `TEMP_LABELS`, `AREAS` (przeniesione do nowych komponentów).
- Usunąć fallback `temperature` z `category` — używać tylko `contact.temperature` (nowa taksonomia).
- Header (prawy górny róg) — render warunkowy wg `stage` (prop już przekazywany):
  - `stage === 'lead'` → `<TemperatureBadge value={contact.temperature} />`
  - `stage === 'prospect'` → `<SourceBadge value={contact.prospect_source} />`
  - `stage === 'client' && client_status === 'ambassador'` → istniejący badge "Ambasador" z gwiazdką
  - `stage === 'offering'` → `StageBadge` (zostaje jak jest, w sekcji pod headerem)
- Sekcja obszarów — wymiana inline mapowania na `<ComplexityChips complexity={contact.client_complexity} />`.
- Pozostałe elementy (overdue ring, click navigate, lost button, isDragging) bez zmian.

### 3. `UnifiedKanban.tsx` — Σ PLN + toggle Wariant A

**3.1 Toggle nad gridem:**
```tsx
const [groupBySubcategory, setGroupBySubcategory] = useState(false);
```
Renderowany jako `<label>` z `<Checkbox>` z `@/components/ui/checkbox` (shadcn — spójne z resztą; nie raw `input`).

**3.2 Σ wartości w `DroppableColumn` header:**
```tsx
const sumPLN = contacts.reduce((acc, c) => acc + (c.estimated_value ?? 0), 0);
```
Render: `· {Math.round(sumPLN/1000)}k PLN` jako `<span className="text-xs text-muted-foreground">` obok badge'a z liczbą. Renderowane tylko gdy `sumPLN > 0`.

**3.3 Wariant A — sub-grupowanie:**
Mapa konfigu per-stage (`SUBGROUP_CONFIG: Record<DealStage, {getter, labels}>`) używająca `TEMPERATURE_LABELS` / `PROSPECT_SOURCE_LABELS` / `CLIENT_STATUS_LABELS` / `OFFERING_STAGE_LABELS` z `@/types/dealTeam` (zamiast duplikować labele).

`DroppableColumn` przyjmuje nowy prop `groupBy: boolean`. Gdy `true`, body kolumny renderuje sekcje accordion-style:
- Klucz grupy = `cfg.getter(c) ?? '__none__'`
- Każda sekcja: nagłówek `text-xs font-medium text-muted-foreground` z labelem + count, pod spodem karty.
- Karty pozostają draggable wewnątrz sekcji.

Gdy `groupBy === false`, render dotychczasowy (płaska lista).

### 4. `SalesHeader.tsx` — fix rozjazdu counts

Aktualnie counts liczy się surowo po `category` (10 wartości legacy). Po BLOK B kanban grupuje po `deal_stage` (`deriveStage`). To powoduje rozjazd np. `category='audit'` → kanban: kolumna `offering`, header: nigdzie (audit nie jest w `['hot','top','lead','10x']`).

Fix: zaimportować `deriveStage` z `UnifiedKanban` (lub przenieść do `@/types/dealTeam` jako helper — czystsza opcja, ale poza scope FIX-a; tymczasowo eksport z `UnifiedKanban`). Counts:
```tsx
const visible = contacts.filter((c) => !c.is_lost);
const counts = {
  prospect: visible.filter((c) => deriveStage(c) === 'prospect').length,
  lead:     visible.filter((c) => deriveStage(c) === 'lead').length,
  offering: visible.filter((c) => deriveStage(c) === 'offering').length,
  today: today.length,
  overdue: overdue.length,
};
```

**Świadome odstępstwo od briefu:** brief proponował `c.deal_stage === 'prospect'` bezpośrednio. Ale `deal_stage` jest opcjonalny w typie (`DealStage | undefined`) i niektóre rekordy mogą go nie mieć w cache (zależy od zwracanej projekcji w `useTeamContacts`). `deriveStage(c)` = bezpieczny fallback z `category` — identyczna logika jak w kanbanie → gwarantowany match counts ↔ kolumny.

### 5. Smoke checklist

Dopisać do `docs/qa/sgu-refactor-ia-blokB.md` sekcję `## BLOK B-FIX` z 7 punktami z briefu (1:1).

### 6. Świadome odstępstwa (zbiorczo)

1. **Toggle: `Checkbox` zamiast `<input type="checkbox">`** — zgodność z shadcn/ui (zasada „Tailwind only, shadcn primitives", nie raw HTML form controls).
2. **Labele sub-grup z istniejących stałych** (`TEMPERATURE_LABELS` etc.) — DRY, nie hardkodować.
3. **`SalesHeader` używa `deriveStage`** — patrz pkt 4 wyżej.
4. **Bez `any`** — typy z `@/types/dealTeam` (project rule "TypeScript strict, never any").
5. **`PROSPECT_SOURCE_LABELS`** używa wartości "CRM push" / "Spotkanie CC". Brief w `SourceBadge` proponował UPPERCASE "CRM PUSH" / "CC". Trzymam się stałej z `dealTeam.ts` (single source of truth) — jeśli Remek chce UPPERCASE, zmieniamy w jednym miejscu.

### 7. Weryfikacja po edycji

```bash
npx tsc --noEmit 2>&1 | tail -10
grep -nE "TemperatureBadge|SourceBadge|ComplexityChips" src/components/sgu/sales/UnifiedKanbanCard.tsx
grep -nE "groupBySubcategory" src/components/sgu/sales/UnifiedKanban.tsx
grep -nE "estimated_value.*reduce|sumPLN" src/components/sgu/sales/UnifiedKanban.tsx
grep -nE "deriveStage|deal_stage === 'prospect'" src/components/sgu/headers/SalesHeader.tsx
```
Oczekiwane: 0 TS errors, każdy grep ≥1 trafienie.

### DoD

| Check | Stan po patchu |
|---|---|
| Karta LEAD ma TemperatureBadge | ✅ |
| Karta PROSPECT ma SourceBadge | ✅ |
| Karta CLIENT (ambassador) ma gwiazdkę | ✅ (zachowane) |
| `ComplexityChips` na każdej karcie z aktywnymi obszarami | ✅ |
| Σ PLN w nagłówku kolumny | ✅ |
| Toggle Wariant A działa | ✅ |
| `SalesHeader` counts == kolumny kanbana | ✅ (przez `deriveStage`) |
| `tsc` 0 błędów | ✅ |

