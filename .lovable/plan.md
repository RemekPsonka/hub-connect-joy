

# Wyszukiwanie kontaktów w "Dodaj kontakt do zespołu" — naprawa

## Problem
User dodał Krzysztofa Kentlę do bazy kontaktów, ale w dialogu "Dodaj kontakt do zespołu" (Deals Team) wyszukiwarka nie znajduje go po wpisaniu "kentla".

## Hipotezy do sprawdzenia
1. Query filtruje po `is_active = true` — może kontakt został dodany z `is_active = false` lub kolumna ma inną wartość
2. Wyszukiwanie idzie tylko po `full_name`/`company` przez `ilike` — jeśli `full_name` nie jest wypełnione (a tylko `first_name`/`last_name`), nie znajdzie
3. Filtr `tenant_id` — kontakt mógł być dodany do innego tenanta
4. Kontakt może już być w zespole i jest filtrowany jako "już dodany"

## Plan działania

### Krok 1: Diagnostyka (przed planem zmian)
Sprawdzić bazę:
```sql
SELECT id, first_name, last_name, full_name, is_active, tenant_id, created_at 
FROM contacts 
WHERE last_name ILIKE '%kentla%' OR first_name ILIKE '%krzysztof%kentla%';
```

Sprawdzić plik dialogu "Dodaj kontakt do zespołu" (prawdopodobnie `AddContactToTeamDialog.tsx` lub podobny) — jak konstruuje query.

### Krok 2: Naprawa
Najpewniej trzeba rozszerzyć query o `first_name` i `last_name`:
```ts
.or(`full_name.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%,company.ilike.%${q}%`)
```
Oraz upewnić się, że `full_name` jest auto-generowane przy dodawaniu kontaktu (trigger lub computed w insert).

## Pliki do zmiany (wstępnie)
1. `src/components/deals-team/AddContactToTeamDialog.tsx` (lub podobny) — rozszerzenie wyszukiwania o `first_name`/`last_name`
2. Ewentualnie migracja bazy: backfill `full_name` dla kontaktów gdzie jest puste

Zacznę od diagnostyki kodu i bazy, żeby wskazać dokładny powód i minimalną poprawkę.

