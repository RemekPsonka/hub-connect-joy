

# Nowa hierarchia kategorii lejka sprzedazowego

## Obecny stan

Kanban ma 6 kolumn: HOT, OFERTOWANIE, TOP, LEAD, COLD, POSZUKIWANI.
Hierarchia: cold < lead < top < hot < offering < client.

## Nowy stan (wg uzytkownika)

Pelna hierarchia od najnizszej do najwyzszej:

```text
PRZEGRANE -> COLD -> 10x -> LEAD -> TOP -> HOT -> OFERTOWANIE -> KLIENT
```

Dodajemy 2 nowe kategorie:
- **lost** (PRZEGRANE) -- najnizszy poziom, kontakt przegrany ale widoczny
- **10x** -- etap "budowania relacji", pomiedzy COLD a LEAD

Kolumny na Kanbanie (od lewej): HOT LEAD, OFERTOWANIE, TOP LEAD, LEAD, 10x, COLD LEAD, PRZEGRANE, POSZUKIWANI

## Szczegoly techniczne

### 1. Typ DealCategory

Plik: `src/types/dealTeam.ts`

Zmiana:
```
'hot' | 'top' | 'lead' | 'cold' | 'offering' | 'client'
```
na:
```
'hot' | 'top' | 'lead' | '10x' | 'cold' | 'offering' | 'client' | 'lost'
```

Dodanie do `DealTeamContactStats`:
- `tenx_count: number`
- `lost_count: number`

### 2. CATEGORY_PROBABILITY

Plik: `src/hooks/useTeamClients.ts`

Dodanie:
- `'10x': 10` (miedzy cold 5% a lead 20%)
- `lost: 0`

### 3. KanbanBoard -- nowe kolumny

Plik: `src/components/deals-team/KanbanBoard.tsx`

Dodanie dwoch nowych kolumn:
- **10x** (ikona: zegar/powtorka, kolor: cyan) -- miedzy COLD a LEAD
- **PRZEGRANE** (ikona: X/ban, kolor: gray) -- po COLD

Nowa kolejnosc kolumn (od lewej):
HOT LEAD | OFERTOWANIE | TOP LEAD | LEAD | 10x | COLD LEAD | PRZEGRANE | POSZUKIWANI

Grid zmiana z `lg:grid-cols-6` na `lg:grid-cols-8`.

### 4. useTeamContactStats

Plik: `src/hooks/useDealsTeamContacts.ts`

Dodanie `tenx_count` i `lost_count` do obliczen.

### 5. TeamStats -- nowe karty

Plik: `src/components/deals-team/TeamStats.tsx`

Dodanie kart "10x" i "Przegrane". Grid z 7 na 9 kolumn.

### 6. FunnelConversionChart

Plik: `src/components/deals-team/FunnelConversionChart.tsx`

Dodanie etapow PRZEGRANE i 10x do wykresu lejka.

### 7. categoryConfig (rozne pliki)

Dodanie `'10x'` i `'lost'` do slownikow categoryConfig w:
- `DealContactDetailSheet.tsx`
- `TableView.tsx`
- `SnoozedContactsBar.tsx`

### 8. WeeklyStatusForm -- rekomendacje

Plik: `src/components/deals-team/WeeklyStatusForm.tsx`

Dodanie rekomendacji:
- `'10x': '🔄 10x (buduj relacje, wroc pozniej)'`

### 9. ProspectingConvertDialog

Plik: `src/components/deals-team/ProspectingConvertDialog.tsx`

Dodanie `'10x'` i `'lost'` do listy kategorii konwersji.

### 10. AddContactDialog

Dodanie nowych kategorii do selecta.

### Zmieniane pliki

| Plik | Zmiana |
|------|--------|
| `src/types/dealTeam.ts` | Rozszerzenie DealCategory + DealTeamContactStats |
| `src/hooks/useTeamClients.ts` | CATEGORY_PROBABILITY += 10x, lost |
| `src/hooks/useDealsTeamContacts.ts` | useTeamContactStats += tenx_count, lost_count |
| `src/components/deals-team/KanbanBoard.tsx` | 2 nowe kolumny, grid 8-col |
| `src/components/deals-team/TeamStats.tsx` | 2 nowe karty, grid 9-col |
| `src/components/deals-team/FunnelConversionChart.tsx` | 2 nowe etapy |
| `src/components/deals-team/DealContactDetailSheet.tsx` | categoryConfig += 10x, lost |
| `src/components/deals-team/TableView.tsx` | categoryConfig += 10x, lost |
| `src/components/deals-team/WeeklyStatusForm.tsx` | Nowa rekomendacja 10x |
| `src/components/deals-team/ProspectingConvertDialog.tsx` | Nowe kategorie |
| `src/components/deals-team/AddContactDialog.tsx` | Nowe kategorie |
| `src/components/deals-team/SnoozedContactsBar.tsx` | categoryIcons += 10x, lost |

Brak zmian w bazie danych -- kolumna `category` jest typu `text`, wiec nowe wartosci dzialaja od razu.
