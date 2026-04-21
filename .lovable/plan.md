

# B-FIX.11 — Zwarta karta Kanban (mniej whitespace)

## Problem
Karta jest wysoka i rozciągnięta, bo:
- 6 wierszy z `space-y-2` (8px), każdy element w osobnym `<div>`
- Tytuł, sub-info, taski, sub-badge, premium, areas, banner, footer — wszystko stackowane pionowo
- Footer z `border-t pt-1` + dwa pełne przyciski "Więcej" / "Oznacz jako lost"
- Premium chip (`💰 — PLN`) w pustym wierszu (gdy brak wartości)
- Awatary asystentki przeniesione do drugiego wiersza headera (zamiast obok tytułu)

## Cel
Spłaszczyć kartę do **3 logicznych wierszy** + opcjonalnego bannera, zachowując wszystkie funkcje (klikalne badge, popover składki, mini-banner overdue, akcje "Więcej"/"Lost").

## Nowy układ karty

```
┌─────────────────────────────────────────────────┐
│ Imię Nazwisko                            [AO] · │  ← row 1: tytuł + awatar (po prawej)
│ Firma · Stanowisko                              │  ← podpis pod tytułem (truncate)
├─────────────────────────────────────────────────┤
│ [📅 1] [📞 2]  [COLD]  [🏠][💰]      💰 12k PLN │  ← row 2: taski + sub-badge + areas + premium
├─────────────────────────────────────────────────┤
│ ⚠ 58 dni temu: Umówić spotkanie                │  ← banner (tylko jeśli overdue)
├─────────────────────────────────────────────────┤
│  ⋯                                       ✕ Lost │  ← row 4: ikonowe akcje (bez "Więcej" tekstu)
└─────────────────────────────────────────────────┘
```

## Konkretne zmiany w `UnifiedKanbanCard.tsx`

### 1. Padding + spacing
- `p-3 space-y-2` → **`p-2.5 space-y-1.5`** (oszczędność ~6px na karcie)

### 2. Header (row 1) — awatar inline z tytułem
- Layout: `flex items-start gap-2`
- Lewa kolumna `flex-1 min-w-0`: tytuł + sub-info
- Prawa kolumna: `<AssigneeAvatars />` (bez wrappera `ml-auto`)
- Usuwa cały wiersz z awatarami pod headerem

### 3. Row 2 — JEDNA linia: taski + sub-badge + areas + premium
Wszystko w `flex flex-wrap items-center gap-1` z `onClick stopPropagation`:
- `<TaskStatusPill />` (chipy per typ)
- Sub-badge wg stage (TemperatureBadge / SourceBadge / ClientStatusBadge / StageBadge offering)
- Mini-chipy areas (ComplexityChips, już są inline)
- `<PremiumQuickEdit />` z **`ml-auto`** (przyklejone do prawej)

→ Likwidacja 3 osobnych wierszy. Gdy brak areas/sub-badge → wiersz wciąż się trzyma kupy.

### 4. PremiumQuickEdit — ukryj puste
- W `PremiumQuickEdit.tsx`: gdy `valueGr == null || valueGr === 0` → render kompaktowy badge `+💰` (bez "— PLN"). Tooltip "Dodaj prognozę składki". Oszczędza miejsce wizualne.

### 5. Mini-banner overdue
- Bez zmian logiki, ale `text-[11px] py-1` → `text-[10px] py-0.5` i `rounded` → `rounded-sm`. Zwarciej.

### 6. Footer — ikony zamiast tekstów
- Bez `border-t pt-1` → tylko `pt-0.5`
- "Więcej" → ikonowy button `MoreHorizontal` (`h-6 w-6 p-0`), tooltip "Więcej"
- "Oznacz jako lost" → ikonowy button `X` (`h-6 w-6 p-0` ghost, `text-muted-foreground hover:text-destructive`), tooltip "Oznacz jako lost"
- Layout: `flex justify-between items-center`

→ Oszczędność szerokości i wysokości; akcje nadal dostępne, opisane tooltipem.

## Pliki

| # | Plik | Akcja |
|---|---|---|
| 1 | `src/components/sgu/sales/UnifiedKanbanCard.tsx` | EDIT — restrukturyzacja na 3 wiersze, awatar w headerze, ikonowy footer |
| 2 | `src/components/sgu/sales/PremiumQuickEdit.tsx` | EDIT — kompaktowy fallback `+💰` gdy brak wartości |

## Weryfikacja

```bash
npx tsc --noEmit  # exit 0
```

Manual smoke (`/sgu/sprzedaz`):
- Karta Artura Czepczyńskiego (Lead, COLD, 1 telefon, brak składki) → ~25-30% niższa, wszystkie elementy w jednej linii pod tytułem
- Karta Bogdana Pietrzaka (Ofertowanie, Handshake, 200k PLN, overdue 58 dni) → kompaktowa, banner widoczny
- Karta Artura Lewandowskiego (Klient, Standard, brak składki) → fallback `+💰` zamiast pustego "— PLN"
- Klik tytułu → nawigacja do kontaktu
- Klik chipa zadania / "Więcej" (ikonka) → otwiera Sheet
- Klik PremiumQuickEdit → popover edycji
- Klik "X" → flow Lost
- Drag & drop nadal działa (stopPropagation na badge'ach)

## DoD

| Check | Stan |
|---|---|
| Karta ma 3 logiczne wiersze + opcjonalny banner | ✅ |
| Awatary asystentki w headerze obok tytułu | ✅ |
| Taski + sub-badge + areas + premium w jednym wierszu | ✅ |
| Footer ikonowy (Więcej + Lost), bez `border-t` | ✅ |
| PremiumQuickEdit ma kompaktowy fallback dla pustej wartości | ✅ |
| `tsc --noEmit` exit 0 | ✅ |
| Wszystkie istniejące akcje dostępne (drag, popover, dialogi) | ✅ |

