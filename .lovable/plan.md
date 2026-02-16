
# Naprawa przypisywania grupy do kontaktow z wizytowek

## Problem
33 kontakty zostaly dodane z wizytowek (15:41-15:42 dzis), ale **zadnemu nie przypisano grupy** -- pole `primary_group_id` jest `NULL`. Grupa "Wizytowki Pawel" istnieje, ale kontakty nie sa do niej przypisane. Dlatego filtrujac po tej grupie widzisz "Brak kontaktow".

## Przyczyna
W kodzie importu wizytowek (`useAIImport.ts`), pole `group_id` jest domyslnie ustawiane na `null` (linia 236). Przypisanie grupy zalezy od recznego wyboru w UI przez uzytkownika (funkcja `applyDefaultsToAll`). Jesli Pawel nie wybral grupy w kroku potwierdzenia importu, wszystkie kontakty zostaly zapisane bez grupy.

## Plan naprawy

### 1. Natychmiastowa naprawa danych (migracja SQL)
Przypisanie 33 kontaktow (dodanych dzis o 15:41-15:42 bez grupy) do grupy "Wizytowki Pawel" (`ed71cd23-ce85-45bd-89e5-516753451e08`):

```text
UPDATE contacts 
SET primary_group_id = 'ed71cd23-ce85-45bd-89e5-516753451e08'
WHERE tenant_id = 'dd293205-6dc1-438e-ad8e-4fd7cdf8f6e5'
  AND primary_group_id IS NULL
  AND created_at >= '2026-02-16 15:41:00'
  AND created_at <= '2026-02-16 15:43:00';
```

### 2. Poprawa kodu -- automatyczne ustawianie grupy przy imporcie wizytowek

#### Plik: `src/hooks/useAIImport.ts`
W funkcji `parseBatchBusinessCards` (okolo linii 585-590), po ustawieniu `setParsedContacts`, sprawdzic czy istnieje aktywny filtr grupy lub domyslna grupa uzytkownika i automatycznie ja przypisac do kazdego kontaktu.

Konkretnie -- po linii 534 (koniec mapowania `rawContacts`), dodac logike:
- Jesli uzytkownik ma aktywny filtr grupy w UI (np. przegladal grupe "Wizytowki Pawel"), uzyc tego ID jako domyslnego `group_id`
- Alternatywnie: przekazac `defaultGroupId` jako parametr do `parseBatchBusinessCards`

#### Zmiana w komponencie wywolujacym import
Znalezc komponent, ktory wywoluje `parseBatchBusinessCards` i przekazac do niego aktualnie wybrany `groupId` z filtra lub z dedykowanego selektora grupy, aby kontakty od razu mialy przypisana grupe.
