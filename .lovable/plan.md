

# Dodanie dialogu "Awansuj do AUDYT" z data i osoba

## Problem
Klikniecie przycisku AUDYT w sekcji Kategoria zmienia kategorie kontaktu natychmiast, bez zadawania pytania o date spotkania i osobe, ktora je odbedzie. Nie ma mechanizmu wymuszenia podania tych danych.

## Rozwiazanie
Wykorzystanie istniejacego komponentu `PromoteDialog` - rozszerzenie go o obsluge kategorii `audit`. Dialog bedzie wymagal podania daty spotkania i osoby odpowiedzialnej (analogicznie do awansu do HOT).

## Zmiany w plikach

### 1. `src/components/deals-team/PromoteDialog.tsx`
- Rozszerzenie `targetCategory` o `'audit'`
- Dodanie warunku `isToAudit` obok istniejacych `isToTop`, `isToHot`
- Formularz AUDYT: data spotkania (wymagana) + kto idzie na spotkanie (wymagane) - reuse pol z HOT
- Tytul dialogu: "Umow audyt/spotkanie robocze 📅"
- Walidacja: obie pola wymagane
- Przy zapisie: ustawienie `nextMeetingDate`, `nextMeetingWith` i `category: 'audit'`

### 2. `src/components/deals-team/DealContactDetailSheet.tsx`
- Zmiana obslugi klikniecia przycisku AUDYT: zamiast bezposredniego `updateContact.mutate(...)`, otwieranie `PromoteDialog` z `targetCategory='audit'`
- Dodanie `'audit'` do warunku: `if (cat === 'top' || cat === 'hot' || cat === 'audit')` -> `setPromoteTarget(cat)`
- Aktualizacja typu `promoteTarget` z `'lead' | 'top' | 'hot' | null` na `'lead' | 'top' | 'hot' | 'audit' | null`

## Przeplyw uzytkownika

```text
1. Uzytkownik otwiera kontakt w lejku
2. Klika przycisk "AUDYT" w sekcji Kategoria
3. Otwiera sie dialog z polami:
   - Data spotkania * (kalendarz)
   - Kto idzie na spotkanie * (dropdown czlonkow zespolu)
4. Po wypelnieniu i zatwierdzeniu:
   - Kontakt przenosi sie do kolumny AUDYT
   - Data i osoba zapisuja sie w deal_team_contacts (next_meeting_date, next_meeting_with)
```

## Szczegoly techniczne
- Tabela `deal_team_contacts` juz posiada kolumny `next_meeting_date` i `next_meeting_with` - nie trzeba zmieniac schematu bazy
- Hook `useUpdateTeamContact` juz obsluguje te pola
- Brak zmian w bazie danych - czysto frontendowa zmiana
