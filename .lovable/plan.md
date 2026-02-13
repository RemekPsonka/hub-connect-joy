

# Lejek konwersji -- tylko 4 kluczowe etapy

## Zmiana

Wykres "Lejek konwersji" obecnie pokazuje 8 etapow (od PRZEGRANE do KLIENT). Uzytkownik chce widziec tylko 4 istotne etapy, ulozone od gory:

```text
KLIENT
OFERTOWANIE
HOT
TOP
```

## Szczegoly techniczne

### Plik: `src/components/deals-team/FunnelConversionChart.tsx`

Zmiana tablicy `STAGES` z 8 elementow na 4, w kolejnosci od gory wykresu:

```
KLIENT     (#8b5cf6)
OFERTOWANIE (#10b981)
HOT        (#ef4444)
TOP        (#f59e0b)
```

Interfejs `FunnelConversionChartProps` zostanie uproszczony -- potrzebne tylko `top_count`, `hot_count`, `offering_count`, `client_count`.

### Plik: `src/components/deals-team/TeamStats.tsx`

Dostosowanie przekazywanych propsow do `FunnelConversionChart` -- usuniecie niepotrzebnych pol (`lost_count`, `cold_count`, `tenx_count`, `lead_count`).

