

# Zamiana kolumny "Stanowisko" na "Lejki" + filtry/sortowania/konfiguracja kolumn

## Zakres zmian

### 1. Kolumna "Lejki" zamiast "Stanowisko" w `ContactsTable.tsx`

Zastapienie kolumny "Stanowisko" kolumna "Lejki", ktora wyswietla badge'e z przypisanymi lejkami (nazwa zespolu + kategoria, np. "SGU - LEAD"). Kazdy wiersz bedzie mial przycisk **+** do szybkiego dodawania kontaktu do lejka (mini-popover z wyborem zespolu i kategorii).

Dane o lejkach beda pobierane hurtowo -- jeden dodatkowy query w `useContacts` lub osobny hook `useContactsDealTeams` pobierajacy dane `deal_team_contacts` + `deal_teams` dla wszystkich widocznych kontaktow na stronie.

### 2. System filtrowania i sortowania w `ContactsHeader.tsx`

Rozbudowanie naglowka o:
- **Filtr po lejku** (dropdown z lista zespolow Deals)
- **Filtr po kategorii lejka** (COLD/LEAD/TOP/HOT/CLIENT)
- **Filtr po profilu AI** (wygenerowany / brak)
- **Sortowanie** po: imieniu, firmie, sile relacji, dacie dodania

Filtry beda przekazywane do `useContacts` i obslugiwane po stronie zapytania Supabase (tam gdzie to mozliwe) lub po stronie klienta (dla filtra po lejku -- wymaga joina z `deal_team_contacts`).

### 3. Konfiguracja widocznosci kolumn

Dodanie przycisku "Kolumny" (ikona szpaltek) otwierajacego popover z checkboxami:
- Imie i nazwisko (zawsze widoczne)
- Firma
- Lejki
- Telefon prywatny
- Email
- Grupa
- Profil AI
- Sila relacji

### 4. Zapamietywanie ustawien filtrow w `localStorage`

Klucz `contacts-table-settings` w localStorage przechowujacy:
- Widoczne kolumny
- Aktywne filtry (grupa, firma, lejek, kategoria)
- Sortowanie
- Rozmiar strony

Ustawienia beda odczytywane przy montowaniu komponentu i zapisywane przy kazdej zmianie.

## Szczegoly techniczne

### Nowy hook: `useContactsDealTeamsBulk`

```text
// Pobiera deal_team_contacts dla listy contact_id
// Zwraca Map<contact_id, ContactDealTeam[]>
useContactsDealTeamsBulk(contactIds: string[])
```

### Nowy hook: `useContactsTableSettings`

```text
// Odczyt/zapis ustawien tabeli z localStorage
// Zwraca { columns, filters, sort, pageSize, update }
useContactsTableSettings()
```

### Komponent `DealFunnelBadges`

Maly komponent wyswietlajacy liste badge'ow lejkowych + przycisk "+":

```text
<DealFunnelBadges contactId={...} dealTeams={[...]} onAdd={() => ...} />
```

### Komponent `ColumnConfigPopover`

Popover z checkboxami do wlaczania/wylaczania kolumn.

## Pliki do modyfikacji/utworzenia

| Plik | Zmiana |
|---|---|
| `src/hooks/useContactsDealTeamsBulk.ts` | NOWY -- hurtowe pobieranie lejkow dla kontaktow |
| `src/hooks/useContactsTableSettings.ts` | NOWY -- persystencja ustawien tabeli w localStorage |
| `src/components/contacts/DealFunnelBadges.tsx` | NOWY -- badge'e lejkowe + przycisk dodawania |
| `src/components/contacts/ColumnConfigPopover.tsx` | NOWY -- konfiguracja widocznosci kolumn |
| `src/components/contacts/ContactsTable.tsx` | Zamiana "Stanowisko" na "Lejki", dynamiczne kolumny, integracja z nowym hookiem |
| `src/components/contacts/ContactsHeader.tsx` | Dodanie filtrow po lejku/kategorii/profilu AI |
| `src/pages/Contacts.tsx` | Integracja nowych filtrow i ustawien z localStorage |

