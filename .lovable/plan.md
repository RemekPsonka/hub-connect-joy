

# Dodanie wizualnego wskaznika lejka nad Kanbanem

## Cel
Dodanie nad widokiem Kanban zadaniowego wizualnego paska pokazujacego glowne etapy lejka sprzedazy (HOT, TOP, OFERTOWANIE, AUDYT, KLIENT, PRZEGRANE) z informacja ile zadab jest na kazdym etapie. Uzytkownik widzi od razu, na ktorym etapie lejka znajduja sie zadania.

## Uklad wizualny

```text
🔥 HOT (2)  →  ⭐ TOP (1)  →  📝 OFERTOWANIE (4)  →  📋 AUDYT (0)  →  ✅ KLIENT (0)  →  ✖️ PRZEGRANE (0)
─────────────────────────────────────────────────────────────────────────────────────────────────────────────
[Zaplanować spotkanie] [Spotkanie umówione] [Spotkanie odbyte] [Handshake] [Pełnomocnictwo] [Przygotowanie] ...
```

Pasek wyglada jak stepper/breadcrumb z kolorowymi badge'ami. Etapy z zadaniami sa podswietlone (pelny kolor), puste sa przygaszone. Klikniecie na etap moze filtrowac kanban do danej kategorii.

## Plan techniczny

### Plik: `src/components/deals-team/MyTeamTasksView.tsx`

1. Dodac blok `useMemo` obliczajacy ile zadan jest w kazdej kategorii glownej (`contact_category`) na podstawie `filtered`
2. Dodac komponent paska lejka (inline lub wydzielony) renderowany **tylko w trybie kanban** (`viewMode === 'kanban'`), tuz przed `<DndContext>`
3. Pasek uzywa `CATEGORY_OPTIONS` z `pipelineStages.ts` do wyswietlenia etapow w kolejnosci
4. Kazdy etap pokazuje: ikone, nazwe, liczbe zadan w nawiasie
5. Etapy z zadaniami maja pelny kolor tla, puste sa `opacity-50`
6. Etapy polaczone strzalkami (`→` lub chevron) tworzac wizualny lejek
7. Opcjonalnie: klikniecie na etap filtruje widok kanban do kolumn nalezacych do tej kategorii

### Szacunkowe zmiany
- **1 plik**: `src/components/deals-team/MyTeamTasksView.tsx` -- dodanie ~30 linii kodu paska lejka nad sekcja kanban (linie 553-556)
