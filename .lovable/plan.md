
# Dodanie terminu waznosci do poszukiwanych kontaktow

## Co sie zmieni

Kazdy poszukiwany kontakt bedzie mial "termin waznosci" -- po jego uplynieciu pozycja automatycznie zmienia status na "expired" i trafia do archiwum. Uzytkownik wybiera okres: miesiac, kwartal, rok, lub bez limitu.

## Zmiany w bazie danych

Nowa kolumna w tabeli `wanted_contacts`:
- `expires_at` (timestamp with time zone, nullable) -- data wygasniecia, null = bez limitu

Nowy status `expired` dodany do logiki aplikacji.

Trigger bazodanowy lub funkcja cron nie jest potrzebna -- filtrowanie po stronie zapytania: kontakty z `expires_at < now()` beda traktowane jako "expired" w zapytaniach. Alternatywnie, prostsza opcja: **cron job w Supabase** (pg_cron) ktory co godzine aktualizuje status na 'expired' dla rekordow z `expires_at < now() AND status = 'active'`.

Wybieram podejscie z **pg_cron** -- bo wtedy status jest trwaly i nie trzeba modyfikowac kazdego zapytania.

## Zmiany w plikach

### 1. Migracja SQL

```sql
ALTER TABLE wanted_contacts ADD COLUMN expires_at timestamptz;

-- Cron: co godzine archiwizuj przeterminowane
SELECT cron.schedule(
  'expire-wanted-contacts',
  '0 * * * *',
  $$UPDATE public.wanted_contacts SET status = 'expired' WHERE status IN ('active','in_progress') AND expires_at IS NOT NULL AND expires_at < now()$$
);
```

### 2. `src/hooks/useWantedContacts.ts`

- Dodac `expires_at: string | null` do interfejsu `WantedContact`
- W `useCreateWantedContact` dodac `expires_at` do inputu

### 3. `src/components/wanted/WantedContactModal.tsx`

- Dodac pole "Termin poszukiwania" -- Select z opcjami:
  - Miesiac (oblicza `now + 1 month`)
  - Kwartal (`now + 3 months`)
  - Rok (`now + 12 months`)
  - Bez limitu (`null`)
- Wyslac obliczona date jako `expires_at`

### 4. `src/components/wanted/WantedContactCard.tsx`

- Wyswietlic termin wygasniecia (np. "Do: 15 mar 2026") lub "Bez limitu"
- Jesli blisko terminu (< 7 dni) -- wyroznic kolorem (pomaranczowy/czerwony)
- Dodac status `expired` do label/badge: "Wygasly"

### 5. `src/components/wanted/ImportWantedDialog.tsx`

- Dodac pole terminu do etapu importu (wspolne dla calej listy lub per pozycja)
- Przekazac `expires_at` przy zatwierdzaniu

### 6. `src/pages/WantedContacts.tsx`

- Dodac status "Wygasle" do filtra statusow
- Domyslnie ukryc wygasle (filtr na 'all' nie pokazuje expired, osobna opcja "Archiwum")
- Opcjonalnie: dodac licznik wygaslych w statystykach

### 7. `src/components/contacts/ContactWantedTab.tsx`

- Brak zmian -- korzysta z `WantedContactCard` ktory juz zostanie zaktualizowany

## Obliczanie daty

W formularzu uzytkownik wybiera okres, a frontend oblicza date:

```text
"1month"  → new Date(); date.setMonth(date.getMonth() + 1)
"3months" → new Date(); date.setMonth(date.getMonth() + 3)  
"1year"   → new Date(); date.setFullYear(date.getFullYear() + 1)
"none"    → null
```

## Archiwum

Wygasle pozycje nie sa usuwane -- zmieniaja status na "expired". Uzytkownik moze je zobaczyc wybierajac filtr "Wygasle" na stronie poszukiwanych. Karty wygaslych sa wyszarzone i nie maja przyciskow akcji.
