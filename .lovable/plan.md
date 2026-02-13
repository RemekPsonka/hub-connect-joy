

# Etap 1: Konsolidacja Deals -- usuniecie zakladki Deals, polaczenie z Zespolem Deals

## Cel

Usunac oddzielna zakladke "Deals" (/deals) i skonsolidowac cala sprzedaz w module "Zespol Deals" (/deals-team), ktory staje sie glownym i jedynym lejkiem sprzedazowym. Dodac rowniez widok "Snoozed" na poziomie zespolu.

## Co sie zmieni dla uzytkownika

1. **Sidebar**: Zamiast "Deals" i "Zespol Deals" -- jeden wpis "Lejek sprzedazy" (/deals-team)
2. **Routing**: /deals przekierowuje na /deals-team, /deals/:id nadal dziala (detail page)
3. **Kanban**: Dodanie kolumny "OFERTOWANIE" miedzy HOT a KLIENCI (przygotowanie na etap 2)
4. **Snooze**: Nowa zakladka "Odlozone" w tabsach obok Kanban/Tabela/Prospecting/Klienci/Zadania/Prowizje -- widok wszystkich snoozowanych kontaktow zespolu

## Szczegoly techniczne

### 1. Sidebar (AppSidebar.tsx)

Zmiana sekcji salesItems:
```text
BYLO:
  Deals -> /deals
  Zespol Deals -> /deals-team
  Zadania zespolu -> /deals-team?view=tasks
  Ofertowanie -> /pipeline

BEDZIE:
  Lejek sprzedazy -> /deals-team
  Zadania sprzedazy -> /deals-team?view=tasks
  Ofertowanie -> /pipeline
  (Dopasowania bez zmian)
```

### 2. Routing (App.tsx)

- Zmiana `/deals` route na redirect do `/deals-team`
- Zachowanie `/deals/:id` (DealDetail page nadal potrzebne)

### 3. Nowa zakladka "Odlozone" (DealsTeamDashboard.tsx)

Dodanie ViewMode `'snoozed'` i nowego taba z ikona Moon:
```text
Kanban | Tabela | Prospecting | Klienci | Zadania | Prowizje | Odlozone
```

### 4. Nowy komponent SnoozedTeamView

Widok listy wszystkich snoozowanych kontaktow zespolu:
- Tabela z kolumnami: Kontakt, Firma, Kategoria (HOT/TOP/LEAD/COLD), Data powrotu, Powod, Akcje (Obud)
- Sortowanie domyslnie po dacie powrotu (najblizsze na gorze)
- Oznaczenie przeterminowanych (data powrotu w przeszlosci) kolorem ostrzegawczym
- Mozliwosc obudzenia kontaktu jednym kliknieciem

### 5. Nowa kategoria "offering" na Kanbanie (przygotowanie na etap 2)

Dodanie kategorii `offering` do type `DealCategory`:
```text
export type DealCategory = 'hot' | 'top' | 'lead' | 'cold' | 'offering';
```

Nowa kolumna na Kanbanie miedzy HOT a reszta:
- Tytul: "OFERTOWANIE"
- Ikona: Briefcase
- Kolor: zielony/emerald
- Drag-and-drop obslugiwany jak inne kolumny

### Zmieniane pliki

| Plik | Zmiana |
|------|--------|
| `src/components/layout/AppSidebar.tsx` | Zmiana nazw i URL-i w salesItems |
| `src/App.tsx` | Redirect /deals -> /deals-team |
| `src/pages/DealsTeamDashboard.tsx` | Dodanie ViewMode 'snoozed', nowy tab |
| `src/components/deals-team/SnoozedTeamView.tsx` | NOWY -- pelny widok snoozowanych |
| `src/components/deals-team/KanbanBoard.tsx` | Dodanie kolumny OFERTOWANIE |
| `src/components/deals-team/index.ts` | Export SnoozedTeamView |
| `src/types/dealTeam.ts` | Dodanie 'offering' do DealCategory |

### Co NIE zmienia sie w tym etapie

- Strona DealDetail (/deals/:id) -- zostaje bez zmian
- Tabela `deals` w bazie -- zostaje (jest uzywana przez deal_team_contacts.deal_id)
- Modul Ofertowania (/pipeline) -- zostaje bez zmian (integracja w etapie 2)
- Konsolidacja zadan (deal_team_assignments -> tasks) -- oddzielny plan (juz zatwierdzony)

## Nastepne etapy (oddzielne plany)

- **Etap 2**: Integracja lejka z ofertowaniem -- automatyczne tworzenie polis, harmonogram platnosci, prognozowanie
- **Etap 3**: Spojne wykresy i dashboardy -- dane z lejka na wykresach ofertowania i odwrotnie

