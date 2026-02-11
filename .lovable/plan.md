

# Usuni&#x119;cie widoku "Kategoria" dla klient&#xf3;w + dodanie "Rozliczenie"

## Cel

Gdy kontakt ma kategori&#x119; `client`, nie jest ju&#x17c; w lejku sprzeda&#x17c;owym. Dlatego:
1. Ukrycie sekcji "KATEGORIA" (HOT/TOP/LEAD/COLD) dla klient&#xf3;w
2. Zamiana sekcji "Statusy tygodniowe" na "Rozliczenie" z wyborem cz&#x119;stotliwo&#x15b;ci: miesi&#x119;czne, kwartalne, p&#xf3;&#x142;roczne, roczne

## Zakres zmian

### 1. Migracja bazy danych

Dodanie kolumny `review_frequency` do tabeli `deal_team_contacts`:

```text
ALTER TABLE deal_team_contacts 
ADD COLUMN review_frequency text DEFAULT 'quarterly' 
CHECK (review_frequency IN ('monthly', 'quarterly', 'semi_annual', 'annual'));
```

Domy&#x15b;lna warto&#x15b;&#x107;: `quarterly` (kwartalne).

### 2. Modyfikacja `DealContactDetailSheet.tsx`

**Sekcja KATEGORIA (linie 247-283):**
- Owin&#x105;&#x107; warunkiem `{contact.category !== 'client' && (...)}` -- ukrycie dla klient&#xf3;w

**Sekcja STATUSY TYGODNIOWE (linie 362-410):**
- Dla klient&#xf3;w (`contact.category === 'client'`): zast&#x105;pi&#x107; nag&#x142;&#xf3;wek na "ROZLICZENIE" i wy&#x15b;wietli&#x107; selector cz&#x119;stotliwo&#x15b;ci:
  - Miesi&#x119;czne
  - Kwartalne
  - P&#xf3;&#x142;roczne
  - Roczne
- Zmiana cz&#x119;stotliwo&#x15b;ci zapisuje si&#x119; przez `updateContact.mutate` do nowej kolumny `review_frequency`
- Dla nie-klient&#xf3;w: bez zmian (dalej "Statusy tygodniowe")

### 3. Aktualizacja typu `DealTeamContact` w `src/types/dealTeam.ts`

Dodanie pola:
```text
review_frequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
```

### 4. Aktualizacja hooka `useUpdateTeamContact`

Dodanie obs&#x142;ugi pola `reviewFrequency` w mapowaniu na kolumn&#x119; `review_frequency`.

## Pliki do modyfikacji

| Plik | Zmiana |
|---|---|
| Migracja SQL | Dodanie kolumny `review_frequency` do `deal_team_contacts` |
| `src/components/deals-team/DealContactDetailSheet.tsx` | Ukrycie "Kategoria" dla klient&#xf3;w, zamiana "Statusy tygodniowe" na "Rozliczenie" z selectorem cz&#x119;stotliwo&#x15b;ci |
| `src/types/dealTeam.ts` | Dodanie pola `review_frequency` do interfejsu `DealTeamContact` |
| `src/hooks/useDealsTeamContacts.ts` | Dodanie `reviewFrequency` do `useUpdateTeamContact` |

## Szczeg&#xf3;&#x142;y techniczne

### UI sekcji Rozliczenie (dla klient&#xf3;w)

```text
ROZLICZENIE

[Miesi&#x119;czne] [Kwartalne] [P&#xf3;&#x142;roczne] [Roczne]
```

Przyciski dzia&#x142;aj&#x105; jak radio -- aktywny jest pod&#x15b;wietlony (variant="default"), pozosta&#x142;e outline. Klikni&#x119;cie zmienia `review_frequency` w bazie.

### Logika warunkowa w DealContactDetailSheet

```text
{contact.category !== 'client' && (
  // Sekcja KATEGORIA -- HOT/TOP/LEAD/COLD
)}

{contact.category === 'client' ? (
  // Sekcja ROZLICZENIE -- selector cz&#x119;stotliwo&#x15b;ci
) : (
  // Sekcja STATUSY TYGODNIOWE -- bez zmian
)}
```

