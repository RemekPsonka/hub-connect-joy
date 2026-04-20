

# BLOK B-FIX.4 — badges sub-kategorii na każdej karcie

## Problem
Obecnie karta kontaktu pokazuje tylko jeden badge zależnie od kolumny (`stage`):
- Lead → tylko `TemperatureBadge`
- Prospekt → tylko `SourceBadge`
- Klient → tylko `ClientStatusBadge`
- Ofertowanie → żadnego z powyższych (tylko `StageBadge` dla offering)

Skutek: kontakt w Ofertowaniu nie ma widocznej temperatury, kontakt w Prospekcie nie ma temperatury, itd. User chce widzieć **wszystkie** wypełnione (lub klikalne, jeśli puste) sub-kategorie na każdej karcie.

## Rozwiązanie
Wszystkie 3 badges (Temperature, Source, ClientStatus) renderowane na **każdej karcie** niezależnie od kolumny. Każdy badge nadal klikalny (popover z opcjami), z `e.stopPropagation()` na wrapperze. Layout: badges w wierszu pod nagłówkiem karty (zamiast obok nazwiska, bo zrobi się ciasno przy 3 badgeach + ikona overdue + nazwisko).

## Pliki

| # | Plik | Akcja |
|---|---|---|
| 1 | `src/components/sgu/sales/UnifiedKanbanCard.tsx` | EDIT — wyrenderuj wszystkie 3 badge zawsze, przeniesione do osobnego rzędu pod nagłówkiem |

## Szczegóły zmiany w `UnifiedKanbanCard.tsx`

### Obecny header (linie 62–93)
Po prawej obok nazwiska: jeden warunkowy badge + ikona overdue.

### Nowy układ
**Header** (linie 62–71): tylko nazwisko/firma/pozycja po lewej + `AlertTriangle` po prawej.

**Nowy rząd badges** (nowy blok, przed `ComplexityChips`):
```tsx
<div className="flex items-center gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
  <TemperatureBadge
    value={contact.temperature}
    onChange={(v) => onSubcategoryChange('temperature', v)}
  />
  <SourceBadge
    value={contact.prospect_source}
    onChange={(v) => onSubcategoryChange('prospect_source', v)}
  />
  <ClientStatusBadge
    value={contact.client_status}
    onChange={(v) => onSubcategoryChange('client_status', v)}
  />
</div>
```

Wszystkie 3 widoczne zawsze. `EditableSubcategoryBadge` już obsługuje stan pusty (`(brak)` z dashed border po B-FIX.3+5), więc kontakt bez wartości pokaże klikalny placeholder.

### Pozostałe sekcje karty bez zmian
- `StageBadge` dla `offering` — zostaje (to inny mechanizm, kontroluje pod-etap ofertowania).
- `ComplexityChips` — zostaje.
- `PremiumQuickEdit` — zostaje.
- Footer z „Oznacz jako lost" — zostaje.

## Ryzyka / decyzje

1. **Wizualny ciężar karty.** 3 badges + ComplexityChips + PremiumQuickEdit + offering badge (gdy aktywny) = sporo elementów. Decyzja: `flex-wrap`, kompaktowe `text-[10px]` (badges już to mają), w razie ścisku zawiną się do 2 linii. Akceptowalne, bo karta i tak ma min ~140px wysokości.

2. **Czy ukrywać badge gdy pusty?** NIE — user ma móc kliknąć i ustawić temperaturę nawet na karcie w kolumnie Prospekt. Pusty badge = `(brak)` z dashed border (już zaimplementowane).

3. **`onSubcategoryChange` handler.** Już istnieje w `UnifiedKanban` i obsługuje wszystkie 3 fieldy (`temperature` / `prospect_source` / `client_status`) — bez zmian w hooku, bez zmian w `UnifiedKanban.tsx`.

4. **Grupowanie „wg sub-kategorii".** Nadal grupuje per kolumna wg `SUBGROUP_CONFIG` (lead → temperature, prospect → source, client → client_status). Bez zmian — to feature niezależny od wyświetlania badge'a.

## Weryfikacja

```bash
npx tsc --noEmit          # 0 errors
```

Manualne (po deploy):
- Karta w kolumnie **Prospekt** → widać badges: `(brak)` lub wartość dla Temperature, wartość dla Source, `(brak)` dla ClientStatus. Wszystkie klikalne.
- Karta w kolumnie **Ofertowanie** → widać 3 badges + offering stage badge. Klik w Temperature → popover, wybór HOT → badge zmienia się na HOT, count w nagłówku grupy (jeśli grupowanie wg sub) NIE zmienia się (bo to kolumna offering, grupowana inaczej).
- Karta w kolumnie **Klient** → widać 3 badges (Temperature i Source typowo `(brak)` jeśli kontakt poszedł od razu jako klient).
- Klik w dowolny badge nie nawiguje do `/sgu/klienci` (stopPropagation działa).
- Drag&drop działa.

## DoD

| Check | Stan |
|---|---|
| Każda karta pokazuje 3 badges (Temperature, Source, ClientStatus) | ✅ |
| Puste badges → `(brak)` z dashed border, klikalne | ✅ |
| Klik w badge otwiera popover, NIE nawiguje | ✅ |
| Mutacja działa dla każdej kolumny (nie tylko „matching stage") | ✅ |
| Drag&drop nadal działa | ✅ |
| `tsc --noEmit` 0 błędów | ✅ |

