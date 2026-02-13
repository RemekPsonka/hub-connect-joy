
# Konfigurator czestotliwosci statusow per etap

## Cel

Dodanie konfigurowalnej czestotliwosci wymaganych statusow dla kazdego etapu lejka sprzedazy. Ustawienia zapisywane w bazie danych na poziomie zespolu. System overdue bedzie uwzglednial rozne interwaly dla roznych kategorii (np. HOT co tydzien, Klienci co miesiac).

## Domyslne czestotliwosci

| Etap | Czestotliwosc | Dni |
|------|--------------|-----|
| HOT LEAD | Co tydzien | 7 |
| OFERTOWANIE | Co tydzien | 7 |
| TOP LEAD | Co miesiac | 30 |
| LEAD | Brak wymagania | 0 |
| 10x | Co miesiac | 30 |
| COLD | Brak wymagania | 0 |
| KLIENCI | Co miesiac | 30 |
| PRZEGRANE | Brak wymagania | 0 |

Wartosc 0 oznacza "status nie jest wymagany" dla danego etapu.

## Rozwiazanie

### 1. Migracja bazy danych

Dodanie kolumny JSONB `status_frequency_days` do tabeli `deal_teams`:

```sql
ALTER TABLE deal_teams
ADD COLUMN status_frequency_days jsonb
DEFAULT '{"hot":7,"offering":7,"top":30,"lead":0,"10x":30,"cold":0,"client":30,"lost":0}'::jsonb;
```

Aktualizacja triggera `update_deal_team_contact_fields` -- zamiast stalych 7 dni, odczytuje konfiguracje z tabeli `deal_teams` i porownuje z kategoria kontaktu:

```sql
CREATE OR REPLACE FUNCTION update_deal_team_contact_fields()
RETURNS TRIGGER AS $$
DECLARE
  freq_days int;
  freq_config jsonb;
BEGIN
  NEW.updated_at = now();

  -- Pobierz konfiguracje czestotliwosci z zespolu
  SELECT COALESCE(status_frequency_days, 
    '{"hot":7,"offering":7,"top":30,"lead":0,"10x":30,"cold":0,"client":30,"lost":0}'::jsonb)
  INTO freq_config
  FROM deal_teams WHERE id = NEW.team_id;

  -- Pobierz dni dla danej kategorii (0 = nie wymaga statusu)
  freq_days := COALESCE((freq_config->>NEW.category)::int, 0);

  IF freq_days = 0 THEN
    NEW.status_overdue = false;
  ELSE
    NEW.status_overdue = (
      NEW.last_status_update IS NULL
      OR NEW.last_status_update < now() - (freq_days || ' days')::interval
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 2. Nowy komponent: `src/components/deals-team/StatusFrequencyConfig.tsx`

Sekcja w TeamSettings z lista etapow i selectem czestotliwosci dla kazdego:

- Kazdy etap wyswietlany jako wiersz: ikona + nazwa + Select (Brak / Co tydzien / Co 2 tyg. / Co miesiac / Wlasne)
- Przycisk "Zapisz" zapisujacy konfiguracje do `deal_teams.status_frequency_days`
- Opcje czestotliwosci: 0 (brak), 7 (tydzien), 14 (2 tygodnie), 30 (miesiac), wlasne (input numeryczny)

### 3. Zmiana: `src/components/deals-team/TeamSettings.tsx`

Dodanie sekcji `StatusFrequencyConfig` po sekcji kolorow, przed Separator:

```
Separator
StatusFrequencyConfig (teamId)
Separator
Czlonkowie
...
```

### 4. Zmiana: `src/hooks/useWeeklyStatuses.ts` -- `useOverdueContacts`

Rozszerzenie zapytania o overdue kontakty:
- Usuniecie filtra `.in('category', ['hot', 'top'])` -- teraz sprawdzamy `status_overdue` dla wszystkich kategorii (trigger sam ustawi false dla kategorii z freq_days=0)
- Dodanie `'offering'` i `'client'` do obslugiwanych kategorii w logice wyswietlania

### 5. Zmiana: `src/hooks/useDealTeams.ts`

Rozszerzenie `useUpdateDealTeam` o mozliwosc aktualizacji `status_frequency_days`.

### 6. Zmiana: `src/components/deals-team/WeeklyStatusPanel.tsx`

Zmiana tytulu z "Cotygodniowe statusy" na "Statusy" (bo czestotliwosc moze byc rozna). Wyswietlanie przy kazdym overdue kontakcie informacji o wymaganej czestotliwosci.

## Zmieniane pliki

| Plik | Zmiana |
|------|--------|
| Migracja SQL | Kolumna `status_frequency_days` + aktualizacja triggera |
| `src/components/deals-team/StatusFrequencyConfig.tsx` | NOWY -- konfigurator czestotliwosci |
| `src/components/deals-team/TeamSettings.tsx` | Dodanie sekcji StatusFrequencyConfig |
| `src/hooks/useWeeklyStatuses.ts` | Rozszerzenie filtra overdue o wszystkie kategorie |
| `src/hooks/useDealTeams.ts` | Obsluga `status_frequency_days` w update |
| `src/components/deals-team/WeeklyStatusPanel.tsx` | Zmiana tytulu + info o czestotliwosci |
| `src/components/deals-team/index.ts` | Export nowego komponentu |
