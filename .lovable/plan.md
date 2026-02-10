
# Sprawdzanie w bazie i uzupelnianie danych AI dla poszukiwanych

## Co sie zmieni

Na kartach poszukiwanych (zarowno w formularzu dodawania jak i w imporcie listy) pojawia sie dwa nowe przyciski:

1. **"Sprawdz w bazie"** (ikona Database/Search) -- wyszukuje w tabeli `contacts` i `companies` osoby/firmy o podobnej nazwie. Jesli znajdzie -- pokazuje wyniki z mozliwoscia dopasowania.
2. **"Uzupelnij dane AI"** (ikona Sparkles/Globe) -- wywoluje istniejaca edge function `enrich-person-data` (Perplexity + Firecrawl), zwraca uzupelnione dane i krotki opis osoby. Dane trafiaja do pol karty -- uzytkownik musi zatwierdzic.

## Zmiany w plikach

### 1. `src/components/wanted/WantedContactModal.tsx`

- Dodac dwa przyciski w sekcji "Kogo szukamy":
  - **"Sprawdz w bazie"**: wywoluje `check-duplicate-contact` z `person_name` (split na first/last) + `company_name`. Wyswietla wynik inline pod formularzem (alert z linkiem do kontaktu lub "nie znaleziono").
  - **"Uzupelnij dane AI"**: wywoluje `enrich-person-data` z `first_name`, `last_name`, `company`. Wynik uzupelnia pola: `person_position`, `person_context`, `company_industry`. Pokazuje opis osoby w polu `person_context` lub nowym polu podgladu. Uzytkownik widzi zmiany i moze je edytowac przed zapisaniem.
- Nowe stany: `isChecking`, `checkResult`, `isEnriching`, `enrichResult`
- Wynik sprawdzenia bazy: zielony badge "Znaleziono: Jan Kowalski (ABC Sp. z o.o.)" z linkiem, lub szary "Nie znaleziono w bazie"
- Wynik wzbogacania AI: pola formularza zostaja automatycznie wypelnione danymi z AI, toast "Uzupelniono dane z AI"

### 2. `src/components/wanted/ImportWantedDialog.tsx`

- Na kazdej karcie review (etap 2) dodac dwa przyciski obok "Odrzuc"/"Zatwierdz":
  - **"Sprawdz"** (ikona Search): ten sam mechanizm co wyzej
  - **"AI"** (ikona Sparkles): wywoluje `enrich-person-data`, uzupelnia pola karty
- Wyniki wyswietlane inline na karcie:
  - Sprawdzenie bazy: maly alert pod kartą z wynikiem
  - AI: pola karty aktualizowane automatycznie + description dodane do `person_context`
- Nowe pola w `ReviewItem`: `_checkResult`, `_isChecking`, `_isEnriching`, `_enrichResult`

### 3. Nowy komponent: `src/components/wanted/WantedCheckActions.tsx`

Wspolny komponent z dwoma przyciskami (uzyty i w modalu i w imporcie):
- Props: `personName`, `companyName`, `onCheckResult`, `onEnrichResult`, `isChecking`, `isEnriching`
- Przycisk "Sprawdz w bazie": split `personName` na first/last, invoke `check-duplicate-contact`
- Przycisk "Uzupelnij AI": invoke `enrich-person-data` z danymi
- Wyswietlanie wynikow: inline pod przyciskami

## Logika sprawdzania w bazie

```text
1. Split person_name na first_name + last_name
2. Invoke check-duplicate-contact({ contact: { first_name, last_name } })
3. Jesli isDuplicate === true: pokazac dane existingContact (imie, firma, link)
4. Jesli nie: szukac po company_name w tabeli companies (ilike)
5. Wyswietlic wynik
```

## Logika uzupelniania AI

```text
1. Invoke enrich-person-data({ first_name, last_name, company })
2. Z odpowiedzi wyciagnac: position, bio (summary), industry
3. Uzupelnic pola formularza:
   - person_position <- enriched position (jesli puste)
   - person_context <- enriched bio/summary
   - company_industry <- enriched industry (jesli puste)
4. Toast "Uzupelniono dane"
5. Uzytkownik widzi zmiany i moze edytowac
```

## Szczegoly UI

### Przyciski na karcie (Import)
```text
[Sprawdz w bazie] [Uzupelnij AI]  ...  [Odrzuc] [Zatwierdz]
```

### Przyciski w modalu (Dodawanie)
Dodane pod sekcja "Kogo szukamy", przed "Dodatkowe":
```text
[Sprawdz w naszej bazie]  [Uzupelnij dane AI]
```

### Wynik sprawdzenia (inline)
- Znaleziono: zielony banner z imieniem i firma, link "Zobacz kontakt"
- Nie znaleziono: szary tekst "Nie znaleziono podobnego kontaktu w bazie"

### Wynik AI (inline)
- Pola formularza zostaja zaktualizowane (podswietlenie zmian opcjonalne)
- Krotki opis osoby wstawiony do `person_context`
- Toast potwierdzajacy

## Kolejnosc implementacji

```text
1. WantedCheckActions.tsx (wspolny komponent)
2. WantedContactModal.tsx (integracja w formularzu dodawania)
3. ImportWantedDialog.tsx (integracja na kartach review)
```
