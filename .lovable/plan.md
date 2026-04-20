

## BLOK B — UnifiedKanban + repipe SGUPipelineRoute

### Cel
Zastąpić w `/sgu/sprzedaz` 10-kolumnowy `DealsTeamDashboard` nowym 4-kolumnowym `UnifiedKanban` (Prospekt / Lead / Ofertowanie / Klient). Filtry `today/overdue` z SalesHeader → redirect do `/sgu/zadania`.

### Pliki

| Plik | Akcja | Rola |
|---|---|---|
| `src/components/sgu/sales/UnifiedKanban.tsx` | CREATE | 4-kolumnowy kanban z dnd-kit |
| `src/components/sgu/sales/UnifiedKanbanCard.tsx` | CREATE | Karta z badge'ami (temperature / offering_stage / ambasador / obszary) |
| `src/pages/sgu/SGUPipelineRoute.tsx` | EDIT | Wymiana `DealsTeamDashboard` → `UnifiedKanban` + redirect today/overdue |
| `docs/qa/sgu-refactor-ia-blokB.md` | CREATE | Manual smoke checklist |

### 1. `UnifiedKanban.tsx` — projekt

**Props:** `{ teamId: string; filter?: 'prospect'|'lead'|'offering'|null }`

**Dane:** `useTeamContacts(teamId)` z `@/hooks/useDealsTeamContacts` (NIE nowy hook).

**Filtrowanie w pamięci** (po pobraniu z cache):
```ts
const visible = contacts.filter(c =>
  !c.is_lost &&
  (!c.snoozed_until || c.snoozed_until < new Date().toISOString())
);
```

**Grupowanie po `deal_stage`:**
- `prospect` → kolumna Prospekt (icon 🔍, slate)
- `lead` → kolumna Lead (icon 🔥, amber) — obejmuje `category` ∈ {lead,hot,top,cold,10x}
- `offering` → kolumna Ofertowanie (icon 💼, blue) — obejmuje `category` ∈ {offering,audit}
- `client` → kolumna Klient (icon ⭐, emerald)

**Filtr z SalesHeader** — gdy `filter !== null`, pokazuj tylko jedną kolumnę (3 pozostałe wyrenderowane jako wąskie szare kolumny `opacity-50` lub całkiem schowane — wybór: schowane, czystszy UX).

**Drag & Drop** — `@dnd-kit/core` (`DndContext` + `useDraggable` na kartach, `useDroppable` na kolumnach):

| From → To | Akcja |
|---|---|
| `prospect → lead` | `updateContact({ category: 'lead', category_changed_at: now })` |
| `lead → offering` | `updateContact({ category: 'offering', offering_stage: 'decision_meeting', category_changed_at: now })` |
| `offering → client` | **Otwórz `ConvertWonToClientDialog`** (NIE direct UPDATE) |
| pozostałe transitions (np. cofnięcia) | `toast.info('Przejście niedostępne — użyj akcji na karcie')` |

Mutacja przez `useUpdateTeamContact()` (już istnieje w `useDealsTeamContacts.ts`). Po sukcesie hook sam invaliduje `['deal-team-contacts', teamId]`.

**State lokalny:**
- `convertDialogOpen: boolean` + `convertContact: DealTeamContact | null`
- `lostDialogOpen: boolean` + `lostContact: DealTeamContact | null`

### 2. `UnifiedKanbanCard.tsx` — projekt

**Props:** `{ contact: DealTeamContact; onLostClick: () => void }`

**Layout:**
```
┌─────────────────────────────────────┐
│ Imię Nazwisko        [HOT] [⭐]     │ ← header + badges (temperature, ambasador)
│ Firma · Stanowisko                   │
│                                      │
│ [💼 Decision meeting ▾]              │ ← StageBadge tylko dla offering
│                                      │
│ 🏠 Majątek · 💰 Finanse · 📞 Komun. │ ← chipy obszarów (jeśli active)
│                                      │
│              [Oznacz jako lost]      │ ← przycisk → onLostClick
└─────────────────────────────────────┘
```

**Badges:**
- `temperature`: `hot`=red, `top`=violet, `cold`=slate, `10x`=amber-gold
- `client_status === 'ambassador'` → `<Star className="text-amber-500" /> Ambasador`
- `deal_stage === 'offering'` → `<StageBadge stage="offering" value={offering_stage} mode="compact" onChange={...} onWonClick={...} onLostClick={...} />`

**Obszary** (chipy z `client_complexity` jsonb):
```ts
const areas = [
  { key: 'property_active', label: 'Majątek', icon: '🏠' },
  { key: 'financial_active', label: 'Finansowe', icon: '💰' },
  { key: 'communication_active', label: 'Komunikacja', icon: '📞' },
  { key: 'life_group_active', label: 'Grupowe/Życie', icon: '🏥' },
].filter(a => (contact.client_complexity as any)?.[a.key]);
```

**Stan overdue** — czerwona obwódka (`ring-2 ring-destructive`):
```ts
const isOverdue = contact.status_overdue ||
  (contact.next_action_date && new Date(contact.next_action_date) < new Date());
```

**Klik karty (poza badge/przyciskami):** `navigate('/sgu/klienci?contactId=' + contact.contact_id)`

**Przycisk "Oznacz jako lost":** wywołuje `onLostClick()` — parent otwiera `LostReasonDialog`.

### 3. `SGUPipelineRoute.tsx` — repipe

```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSGUTeamId } from '@/hooks/useSGUTeamId';
import { PageLoadingFallback } from '@/components/PageLoadingFallback';
import { SalesHeader } from '@/components/sgu/headers/SalesHeader';
import { UnifiedKanban } from '@/components/sgu/sales/UnifiedKanban';

type SalesFilter = 'prospect' | 'lead' | 'offering' | 'today' | 'overdue';

export default function SGUPipelineRoute() {
  const { sguTeamId, isLoading } = useSGUTeamId();
  const [filter, setFilter] = useState<SalesFilter | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (filter === 'today' || filter === 'overdue') {
      navigate(`/sgu/zadania?filter=${filter}`, { replace: true });
    }
  }, [filter, navigate]);

  if (isLoading) return <PageLoadingFallback />;
  if (!sguTeamId) return <div className="p-6 text-sm text-muted-foreground">Brak skonfigurowanego zespołu SGU.</div>;

  const kanbanFilter = filter === 'today' || filter === 'overdue' ? null : filter;

  return (
    <div className="space-y-4">
      <SalesHeader teamId={sguTeamId} activeKey={filter} onCardClick={(k) => setFilter(prev => prev === k ? null : k)} />
      <UnifiedKanban teamId={sguTeamId} filter={kanbanFilter} />
    </div>
  );
}
```

### 4. Smoke checklist `docs/qa/sgu-refactor-ia-blokB.md`

12 punktów per brief — bez modyfikacji.

### Świadome odstępstwa

1. **Filtr kolumny**: gdy `filter !== null`, pozostałe kolumny **schowane** (nie szare), bo wąskie szare kolumny są mylące — UX czystszy.
2. **`StageBadge.onWonClick/onLostClick`** dla offering_stage przekazujemy z karty (otwiera istniejące dialogi) — istniejący komponent obsługuje to natywnie.
3. **Brak `StageRollbackDialog`** w BLOK B — cofnięcia offering_stage poprzez StageBadge popover (już ma logikę). Rollback dialog poza zakresem.
4. **`useUpdateTeamContact()`** używamy zamiast bezpośredniego `supabase.from(...).update(...)` — zgodnie z regułą projektu "API tylko przez hooki".
5. **Klik na karcie** → `/sgu/klienci?contactId=...` per brief, choć kontakt może być prospect/lead (nie klient). Jeśli `/sgu/klienci` nie obsłuży tego, fix w osobnym BLOK C.

### Weryfikacja po implementacji

```bash
npx tsc --noEmit 2>&1 | tail -10
grep -nE "DealsTeamDashboard" src/pages/sgu/SGUPipelineRoute.tsx       # 0
grep -nE "UnifiedKanban" src/pages/sgu/SGUPipelineRoute.tsx            # >=1
grep -E "@dnd-kit" package.json                                        # 3 hits
```

Oczekiwane: 0 błędów TS, 0 trafień legacy, ≥1 trafienie nowe, dnd-kit obecny.

