
# Dodanie etapu "Umowiony audyt" i zmiana pozycji "Ofertowanie"

## Zakres zmian

Nowa kategoria `audit` ("Umowiony audyt/spotkanie robocze") zostanie dodana do lejka, a kolejnosc kolumn zostanie zmieniona.

### Nowa kolejnosc kolumn na Kanbanie (od lewej):

```text
OFERTOWANIE | HOT LEAD | AUDYT | TOP LEAD | LEAD | 10x | COLD | PRZEGRANE | POSZUKIWANI
```

## Pliki do zmiany

### 1. `src/types/dealTeam.ts`
- Dodanie `'audit'` do typu `DealCategory`

### 2. `src/hooks/useKanbanColumnSettings.ts`
- Dodanie `audit: true` do interfejsu `KanbanColumnVisibility` i domyslnych ustawien

### 3. `src/components/deals-team/KanbanBoard.tsx`
- Dodanie `useMemo` filtrujacego kontakty z kategoria `audit`
- Dodanie kolumny AUDYT miedzy HOT a TOP
- Przesuniecie kolumny OFERTOWANIE na pierwsza pozycje (przed HOT)

### 4. `src/components/deals-team/KanbanColumnConfigPopover.tsx`
- Dodanie etykiety `audit: 'AUDYT'` do `COLUMN_LABELS`
- Zmiana kolejnosci etykiet: offering na poczatku, audit miedzy hot a top

### 5. `src/hooks/useTeamClients.ts`
- Dodanie `audit: 85` do `CATEGORY_PROBABILITY`

### 6. `src/components/deals-team/DealContactDetailSheet.tsx`
- Dodanie `audit` do `categoryConfig` z etykieta "AUDYT", ikona "📅" i kolorami

### 7. `src/components/contacts/DealFunnelBadges.tsx`
- Dodanie `AUDIT` do `CATEGORIES` i `CATEGORY_COLORS`

### 8. `src/components/deals-team/AddContactDialog.tsx`
- Dodanie `SelectItem` dla `audit` w dropdownie kategorii

### 9. `src/components/deals-team/TableView.tsx`
- Dodanie `SelectItem` dla `audit` w filtrze kategorii

### 10. `src/components/deals-team/ProspectingConvertDialog.tsx`
- Dodanie `'audit'` do typu kategorii

### 11. `src/components/deals-team/FunnelConversionChart.tsx`
- Dodanie `audit_count` do danych wykresu (opcjonalnie, jesli potrzebne)

## Szczegoly techniczne

- Kategoria: `audit`
- Etykieta: `AUDYT` (lub "UM. AUDYT")
- Ikona: `📅`
- Kolor: `violet` / `bg-violet-100 text-violet-800`
- Prawdopodobienstwo: 85%
- Pozycja w Kanbanie: trzecia kolumna (po OFERTOWANIE i HOT)
