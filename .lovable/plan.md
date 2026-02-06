
# Implementacja DealsAnalytics - Dashboard analityczny dla Pipeline

## Cel
Utworzenie komponentu `DealsAnalytics` z wizualizacją kluczowych metryk pipeline sprzedażowego, prognozą przychodów i funnel konwersji.

## Analiza obecnego stanu

### Co już istnieje:
- **Strona `Deals.tsx`** - zawiera podstawowe metryki (Otwarte Deals, Wartość Pipeline, Średni Deal, Win Rate)
- **Hook `useDeals`** - obsługuje filtrowanie po `status` (open/won/lost)
- **Biblioteka `recharts`** - już zainstalowana i używana w `Analytics.tsx`
- **Wzorzec UI** - ustalony w istniejącej stronie Analytics

### Czego brakuje:
- Komponent `DealsAnalytics` z rozbudowanymi wizualizacjami
- Kalkulacja Weighted Pipeline (wartość × prawdopodobieństwo)
- 6-miesięczna prognoza na podstawie `expected_close_date`
- Funnel konwersji wg etapów

## Nowy komponent

### `src/components/deals/DealsAnalytics.tsx`

Struktura:

```text
┌─────────────────────────────────────────────────────────────┐
│  Key Metrics (3 karty)                                      │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │ Weighted        │ │ Win Rate        │ │ Avg Days to     ││
│  │ Pipeline        │ │ 67%             │ │ Close: 32 dni   ││
│  │ 245 000 PLN     │ │ 12 won / 6 lost │ │                 ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  6-Month Forecast (wykres słupkowy)                         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ▓▓▓ ▓▓▓▓ ▓▓ ▓▓▓▓▓ ▓▓▓ ▓▓▓▓                              ││
│  │ Sty  Lut  Mar  Kwi   Maj  Cze                           ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  Conversion Funnel (wykres lejkowy)                         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Prospecting      ████████████████████ 45               ││
│  │  Qualification    ████████████████ 32                   ││
│  │  Proposal         ██████████ 18                         ││
│  │  Negotiation      ██████ 12                             ││
│  │  Won              ███ 8                                 ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Szczegóły techniczne

### Kalkulacje:

1. **Weighted Pipeline**:
   ```typescript
   const weightedValue = openDeals.reduce((sum, deal) => 
     sum + (deal.value * (deal.probability / 100)), 0);
   ```

2. **Win Rate**:
   ```typescript
   const winRate = wonDeals.length / (wonDeals.length + lostDeals.length) * 100;
   ```

3. **6-Month Forecast** - grupowanie deals wg `expected_close_date`:
   ```typescript
   const forecastData = useMemo(() => {
     const months = [];
     for (let i = 0; i < 6; i++) {
       const month = new Date();
       month.setMonth(month.getMonth() + i);
       
       const dealsThisMonth = openDeals.filter(deal => {
         const closeDate = new Date(deal.expected_close_date);
         return closeDate.getMonth() === month.getMonth() &&
                closeDate.getFullYear() === month.getFullYear();
       });
       
       months.push({
         month: month.toLocaleDateString('pl-PL', { month: 'short' }),
         expected: dealsThisMonth.reduce((sum, d) => 
           sum + (d.value * d.probability / 100), 0),
         deals: dealsThisMonth.length
       });
     }
     return months;
   }, [openDeals]);
   ```

4. **Conversion Funnel** - deals wg etapów + win/lost rate:
   ```typescript
   const conversionData = useMemo(() => {
     return stages.map(stage => {
       const dealsInStage = allDeals.filter(d => d.stage_id === stage.id);
       const wonFromStage = wonDeals.filter(d => /* historycznie przeszły przez etap */);
       return {
         name: stage.name,
         color: stage.color,
         count: dealsInStage.length,
         value: dealsInStage.reduce((sum, d) => sum + d.value, 0)
       };
     });
   }, [allDeals, stages]);
   ```

### Importy:
```typescript
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDeals, useDealStages } from '@/hooks/useDeals';
import { 
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, FunnelChart, Funnel
} from 'recharts';
```

### Avg Days to Close:
Kalkulacja średniego czasu zamknięcia na podstawie wygranych deals:
```typescript
const avgDaysToClose = useMemo(() => {
  if (!wonDeals.length) return 0;
  const totalDays = wonDeals.reduce((sum, deal) => {
    const created = new Date(deal.created_at);
    const won = new Date(deal.won_at!);
    return sum + Math.round((won.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  }, 0);
  return Math.round(totalDays / wonDeals.length);
}, [wonDeals]);
```

## Integracja

### Opcja A: Dodatkowa zakładka w DealsHeader
Dodanie trzeciej zakładki "Analityka" obok Kanban i Tabela.

### Opcja B: Osobna strona
Utworzenie `/deals/analytics` jako sub-route.

### Opcja C: Sekcja na stronie Deals (rekomendowane)
Dodanie przełącznika lub sekcji na dole strony Deals, widocznej po kliknięciu "Pokaż analitykę".

## Pliki do utworzenia/modyfikacji

| Plik | Operacja | Opis |
|------|----------|------|
| `src/components/deals/DealsAnalytics.tsx` | **Nowy** | Komponent z wykresami i metrykami |
| `src/components/deals/index.ts` | Aktualizacja | Eksport nowego komponentu |
| `src/pages/Deals.tsx` | Modyfikacja | Integracja komponentu (opcjonalnie) |

## Rozszerzenia na przyszłość

1. **Filtrowanie czasowe** - wybór zakresu dat (7d, 30d, 90d)
2. **Eksport danych** - PDF/Excel z prognozami
3. **Porównanie okresów** - trend vs poprzedni miesiąc
4. **AI Insights** - automatyczne rekomendacje dla pipeline

## Efekt końcowy

Dashboard analityczny pokazujący:
- Ważoną wartość pipeline (realniejsza prognoza przychodów)
- Współczynnik wygranych z liczbą won/lost
- Średni czas zamknięcia deal
- 6-miesięczną prognozę przychodów z wykresem
- Funnel konwersji wg etapów pipeline
