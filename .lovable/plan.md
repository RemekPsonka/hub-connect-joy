

# B-FIX.8 — Breakdown w kafelkach SalesHeader spójny z kolumnami kanbana

## Problem
Aktualnie kafelki Prospekci/Leady/Ofertowanie pokazują ten sam breakdown HOT/TOP/10x/COLD — to są wartości `temperature`, które logicznie należą tylko do kolumny **Lead**. Kanban dla każdej kolumny używa innego podziału (`SUBGROUP_CONFIG` w `UnifiedKanban.tsx`).

## Cel
Każdy kafelek pokazuje breakdown odpowiadający subgroups jego kolumny w kanbanie:

| Kafelek | Pole | Skróty w badge (porządek) |
|---|---|---|
| Prospekci | `prospect_source` | CRM · CC · KRS · WWW · CSV · MAN |
| Leady | `temperature` | HOT · TOP · 10x · COLD |
| Ofertowanie | `offering_stage` | DEC · HAND · PEŁ · AUD · OF · NEG · WON · LOST |
| Klienci | `client_status` | AMB · STD · UTR (zamiast sumy PLN? — patrz pytanie) |
| Odłożone | — | brak breakdown |

Pomijamy w badge wartości z licznikiem 0, żeby nie zaśmiecać — jeśli wszystkie 0, badge nie pokazujemy.

## Zmiany

### `src/components/sgu/headers/SalesHeader.tsx`
1. Importy: `PROSPECT_SOURCE_LABELS`, `OFFERING_STAGE_LABELS`, `CLIENT_STATUS_LABELS`, `TEMPERATURE_LABELS` z `@/types/dealTeam`.
2. Generic helper:
   ```ts
   const groupBy = <T extends string>(
     list: DealTeamContact[],
     getter: (c) => string | null | undefined,
     order: T[],
   ) => order.map(k => ({ key: k, count: list.filter(c => getter(c) === k).length }));
   ```
3. Dla każdego stage zbudować tablicę `{ key, label_short, count, colorClass }`. Mapa skrótów + kolorów (Tailwind tokens) zdefiniowana lokalnie:
   - **prospect_source**: `crm_push→CRM` (sky), `cc_meeting→CC` (violet), `ai_krs→KRS` (emerald), `ai_web→WWW` (cyan), `csv→CSV` (slate), `manual→MAN` (zinc)
   - **temperature**: bez zmian (już mamy)
   - **offering_stage**: `decision_meeting→DEC`, `handshake→HAND`, `power_of_attorney→PEŁ`, `audit→AUD`, `offer_sent→OF`, `negotiation→NEG`, `won→WON` (emerald), `lost→LOST` (red); reszta — kolory neutralne slate/blue/violet
   - **client_status**: `ambassador→AMB` (amber), `standard→STD` (emerald), `lost→UTR` (red)
4. Renderowanie: `breakdownByKey[it.key]?.filter(b => b.count > 0).map(...)` — ten sam komponent badge co teraz, tylko dynamiczna treść/klasa.
5. Dla kafelka **Klienci** rozbicie po `client_status` zostaje **dodatkowo** obok sumy PLN (suma na osobnym wierszu pod licznikiem, badge pod sumą).
6. Dla **Odłożone** — bez breakdown (jak teraz).
7. Dodać `<TooltipProvider>` + `<Tooltip>` na każdym badge → pełna nazwa z `*_LABELS` (np. `HAND` → "Uścisk dłoni"), żeby skróty były czytelne.

### Pozostałe pliki
Bez zmian. `SUBGROUP_CONFIG` w `UnifiedKanban.tsx` traktujemy jako single source of truth — nie kopiujemy konfiguracji do header'a, tylko duplikujemy mapowanie skrótów (krótkie, dedykowane do badge'ów; pełne nazwy w tooltipach pochodzą z `*_LABELS`).

## Pliki

| # | Plik | Akcja |
|---|---|---|
| 1 | `src/components/sgu/headers/SalesHeader.tsx` | EDIT — dynamiczny breakdown per stage + tooltipy |

## Poza zakresem
- Klikalne badge filtrujące kanban (osobny ticket, jeśli potrzebny).
- Zmiany w `UnifiedKanban` / `SUBGROUP_CONFIG`.
- Sortowanie z poziomu kafelka.

## DoD

| Check | Stan |
|---|---|
| Prospekci pokazują breakdown po `prospect_source` (skróty + tooltip pełna nazwa) | ⬜ |
| Leady pokazują HOT/TOP/10x/COLD (bez zmian) | ⬜ |
| Ofertowanie pokazuje breakdown po `offering_stage` | ⬜ |
| Klienci pokazują breakdown po `client_status` + sumę PLN | ⬜ |
| Wartości z licznikiem 0 są ukryte | ⬜ |
| Sumy w badge per kafelek = liczba w głównym counterze kafelka | ⬜ |
| `npx tsc --noEmit` exit 0 | ⬜ |

