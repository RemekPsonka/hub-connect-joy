

# Rozbudowa statusu tygodniowego i konwersji na klienta

## Co sie zmieni

### 1. Formularz statusu tygodniowego -- gruntowna przebudowa

Obecny formularz (`WeeklyStatusForm.tsx`) zostanie rozbudowany z prostego formularza na **narzedzie procesu ciagłego**:

**a) Kontekst z poprzedniego tygodnia**
- Na gorze formularza: podsumowanie ostatniego statusu (co bylo zaplanowane, jakie zadania)
- Sekcja "Status realizacji" -- checkboxy z poprzednimi "nastepnymi krokami" (wykonane/niewykonane)
- Automatyczne przeniesienie niewykonanych zadan do nowego statusu

**b) Rekomendacja kategorii -- nowe nazwy**
Zamiast obecnych generycznych opcji:
| Stare | Nowe |
|-------|------|
| Zostaw w obecnej kategorii | Zostaw w obecnej kategorii |
| Awansuj do wyzszej kategorii | HOT Lead (spotkanie umowione/w toku) |
| Degraduj do nizszej kategorii | COLD Lead (temat na pozniej) |
| Zamknij jako wygrany | Konwertuj na Klienta |
| Zamknij jako przegrany | Zamknij jako przegrany |

Dodana nowa opcja: **Odloz** (snooze z data powrotu)

**c) Tworzenie zadania z poziomu statusu**
Pod sekcja "Co dalej / nastepne kroki" -- nowa sekcja "Zadanie operacyjne":
- Tytul zadania (predefiniowane: "Zadzwonic", "Umowic spotkanie", "Wyslac oferte", "Przygotowac audyt" + wlasne)
- Przypisanie do osoby z zespolu (Select z `useTeamMembers`)
- Termin (input date)

**d) Konwersja na klienta -- okno danych finansowych**
Gdy uzytkownik wybierze "Konwertuj na Klienta":
- Formularz statusu NIE zamyka sie od razu
- Pod rekomendacja pojawia sie sekcja danych finansowych (inline, jak w `ClientProductsPanel`):
  - Grupa produktow (Select z `useProductCategories`)
  - Wartosc deala (PLN)
  - Prowizja (%)
- Po zapisaniu: automatyczne dodanie produktu + zmiana kategorii na `client` + status `won`

### 2. Przycisk "Konwertuj do klienta" w DealContactDetailSheet

Obecny przycisk w sekcji Actions od razu konwertuje bez pytania o dane. Zmiana:
- Klikniecie otwiera dialog z formularzem danych finansowych (skladka, prowizja, grupa produktow)
- Po wypelnieniu -- konwersja + dodanie produktu
- Dzialanie identyczne jak w statusie tygodniowym

### 3. Logika procesu ciaglego

Formularz statusu staje sie "aktywny" -- kazdy nowy status:
- Pokazuje co bylo zaplanowane w poprzednim tygodniu
- Wymaga oznaczenia co zrobiono (status realizacji)
- Wymusza zaplanowanie kolejnych krokow
- Moze generowac zadanie operacyjne dla osoby z zespolu

---

## Szczegoly techniczne

### Zmieniane pliki

| Plik | Zmiana |
|------|--------|
| `src/components/deals-team/WeeklyStatusForm.tsx` | Gruntowna przebudowa: kontekst poprzedniego statusu, nowe rekomendacje, sekcja zadania, sekcja finansowa przy konwersji |
| `src/hooks/useWeeklyStatuses.ts` | Rozszerzenie `SubmitWeeklyStatusInput` o pola zadania; po zapisie statusu opcjonalne tworzenie `deal_team_assignment` |
| `src/components/deals-team/DealContactDetailSheet.tsx` | Przycisk "Konwertuj do klienta" otwiera nowy dialog `ConvertToClientDialog` zamiast bezposredniej konwersji |
| `src/components/deals-team/ConvertToClientDialog.tsx` | NOWY -- dialog z formularzem danych finansowych (grupa produktow, wartosc, prowizja) + konwersja |

### Zmiany w `WeeklyStatusForm.tsx`

1. Props: dodanie `currentCategory` (zeby wiedziec skad konwertujemy)
2. Pobranie ostatniego statusu przez `useTeamContactWeeklyStatuses(teamContactId)` -- wyswietlenie kontekstu
3. Nowy schemat Zod:
   - `previousTasksDone` (string[]) -- checkboxy z poprzednich next_steps
   - `taskTitle` (string, opcjonalne)
   - `taskAssignedTo` (string, opcjonalne)
   - `taskDueDate` (string, opcjonalne)
   - `categoryRecommendation` -- nowe wartosci: `keep`, `hot`, `cold`, `snooze`, `convert_client`, `close_lost`
   - `snoozeUntil` (string, warunkowe -- jesli recommendation = snooze)
   - `productCategoryId`, `dealValue`, `commissionPercent` (warunkowe -- jesli recommendation = convert_client)
4. Po submicie:
   - Zapisz status (jak dotychczas)
   - Jesli `taskTitle + taskAssignedTo` -- stworz `deal_team_assignment`
   - Jesli `recommendation = snooze` -- zaktualizuj `snoozed_until` w `deal_team_contacts`
   - Jesli `recommendation = convert_client` -- zmien kategorie na `client`, status na `won`, dodaj produkt
   - Jesli `recommendation = hot` -- zmien kategorie na `hot`
   - Jesli `recommendation = cold` -- zmien kategorie na `cold`

### Nowy plik: `ConvertToClientDialog.tsx`

- Dialog z:
  - Select grupy produktow (`useProductCategories`)
  - Input wartosc deala
  - Input prowizja (%)
  - Przyciski: Anuluj / Konwertuj
- Po konwersji: `useConvertToClient` + `useAddClientProduct`
- Uzywany zarowno z `DealContactDetailSheet` jak i z `WeeklyStatusForm`

### Zmiany w `useWeeklyStatuses.ts`

- `SubmitWeeklyStatusInput` rozszerzony o opcjonalne pola zadania
- `useSubmitWeeklyStatus` -- po zapisie statusu:
  - Jesli sa dane zadania -> `insert` do `deal_team_assignments`
  - Jesli recommendation wymaga zmiany kategorii -> `update` w `deal_team_contacts`
  - Jesli recommendation = snooze -> `update` snoozed_until
  - Jesli recommendation = convert_client -> `update` category + status + opcjonalnie `insert` produktu

### Brak migracji SQL
Wszystkie potrzebne tabele juz istnieja (`deal_team_weekly_statuses`, `deal_team_assignments`, `deal_team_contacts`, `deal_team_client_products`).

### Kolejnosc implementacji

1. `ConvertToClientDialog.tsx` (nowy komponent)
2. `WeeklyStatusForm.tsx` (przebudowa)
3. `useWeeklyStatuses.ts` (rozszerzenie mutacji)
4. `DealContactDetailSheet.tsx` (podmiana przycisku konwersji)

