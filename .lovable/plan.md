

# B-FIX.8 — Status w lejku spójny z Kanbanem + potencjał składki

## Problem

W `ContactTasksSheet` → sekcja "STATUS W LEJKU":
1. **Sub-stage pokazuje błędną wartość** — dla kontaktu `category=top` (Lead) pokazuje `decision_meeting` (offering_stage), zamiast `TOP` (temperature). Logika `CATEGORIES_WITH_SUBSTAGES` zawiera `hot`/`top`, ale czyta `offering_stage`, który jest polem etapu **Ofertowania**, nie Leada.
2. **Brak potencjału składki** (`expected_annual_premium_gr`) — to kluczowa kwota widoczna na karcie Kanban i powinna być w bocznym menu.

Dodatkowo badge'y "Aktywny" + "Średni" duplikują info o etapie (status/priority to oddzielne wymiary, ale w sekcji "Status w lejku" zaciemniają obraz).

## Rozwiązanie

**Plik:** `src/components/deals-team/ContactTasksSheet.tsx`

### 1. Sub-stage zależny od derived stage

Zamienić obecną logikę (linia 289-291) na funkcję wybierającą właściwe pole + label per stage Kanbana:

```tsx
// Importy z @/types/dealTeam
import {
  TEMPERATURE_LABELS,
  PROSPECT_SOURCE_LABELS,
  CLIENT_STATUS_LABELS,
  OFFERING_STAGE_LABELS,
} from '@/types/dealTeam';

// Helper w komponencie
const stage = deriveStage(contact);
const subStageBadge = (() => {
  if (stage === 'lead' && contact.temperature) {
    return TEMPERATURE_LABELS[contact.temperature] ?? contact.temperature;
  }
  if (stage === 'prospect' && contact.prospect_source) {
    return PROSPECT_SOURCE_LABELS[contact.prospect_source] ?? contact.prospect_source;
  }
  if (stage === 'client' && contact.client_status) {
    return CLIENT_STATUS_LABELS[contact.client_status] ?? contact.client_status;
  }
  if (stage === 'offering' && contact.offering_stage) {
    return OFFERING_STAGE_LABELS[contact.offering_stage] ?? contact.offering_stage;
  }
  return null;
})();
```

W JSX (sekcja "Status w lejku"):

```tsx
<div className="flex flex-wrap gap-1.5">
  <Badge variant="outline">{stageLabels[stage] || contact.category}</Badge>
  {subStageBadge && <Badge variant="secondary">{subStageBadge}</Badge>}
  <Badge variant="secondary">{statusLabels[contact.status] || contact.status}</Badge>
  <Badge variant="secondary">{priorityLabels[contact.priority] || contact.priority}</Badge>
</div>
```

Usuwamy stary blok `contact.offering_stage && CATEGORIES_WITH_SUBSTAGES.has(contact.category)` oraz stałą `CATEGORIES_WITH_SUBSTAGES` i `subStageLabels` jeśli nie są używane gdzie indziej (sprawdzić — na razie tylko ten render je używa).

### 2. Potencjał składki

Pod badge'ami (przed/obok `estimated_value`) dodać linię z `expected_annual_premium_gr`:

```tsx
{contact.expected_annual_premium_gr != null && contact.expected_annual_premium_gr > 0 && (
  <p className="text-xs text-muted-foreground mt-1.5">
    Potencjał składki: {new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
      maximumFractionDigits: 0,
    }).format(contact.expected_annual_premium_gr / 100)}
    {' '}/ rok
  </p>
)}
```

Konwencja: kwoty w **groszach** (integer) zgodnie z project-knowledge → dzielimy przez 100 w renderze.

## Pliki

| # | Plik | Akcja |
|---|---|---|
| 1 | `src/components/deals-team/ContactTasksSheet.tsx` | EDIT — import labeli sub-stage, helper `subStageBadge`, render potencjału składki, usunąć martwe `CATEGORIES_WITH_SUBSTAGES` + `subStageLabels` |

## Efekt (przykład z screenshota)

Michał Matejka (`category=top`, `temperature=top`, `expected_annual_premium_gr=...`):
- **Przed:** `Lead | Aktywny | Średni | decision_meeting`  (brak składki)
- **Po:** `Lead | ⭐ TOP | Aktywny | Średni` + linia "Potencjał składki: 4 200 000 zł / rok"

Inne stany:
- Prospekt z `prospect_source=ai_krs` → badge "AI KRS"
- Klient z `client_status=ambassador` → badge "🏆 Ambasador"
- Ofertowanie z `offering_stage=handshake` → badge "Handshake"

## DoD

| Check | Stan |
|---|---|
| Lead → sub-badge z temperature (HOT/TOP/10x/COLD) | ✅ |
| Prospekt → sub-badge ze źródła | ✅ |
| Klient → sub-badge ze statusu klienta | ✅ |
| Ofertowanie → sub-badge z offering_stage | ✅ |
| Potencjał składki widoczny (gr → PLN) | ✅ |
| Brak martwego kodu (`CATEGORIES_WITH_SUBSTAGES`) | ✅ |
| `tsc --noEmit` exit 0 | ✅ |

