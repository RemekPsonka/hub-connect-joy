
## Plan: Implementacja funkcji "Opracuj AI" dla arkusza BI

### Problem
Kliknięcie przycisku "Opracuj AI" w arkuszu Business Interview nic nie robi - pokazuje tylko toast "Przetwarzanie AI zostanie dodane wkrótce". Funkcjonalność AI nie została zaimplementowana.

### Co powinno się wydarzyć:
1. **Krok 1 - Wzbogacenie danych**: AI powinno poprawić i uzupełnić dane z arkusza BI (np. rozwinąć skróty, poprawić błędy, uzupełnić brakujące informacje)
2. **Krok 2 - Generowanie propozycji**: AI powinno wygenerować:
   - Listę pytań o brakujące informacje
   - Propozycje potrzeb/ofert do dodania
   - Propozycje zadań follow-up
   - Rekomendacje połączeń z innymi kontaktami

---

## Szczegóły implementacji

### 1. Nowa Edge Function: `process-bi-ai/index.ts`

Funkcja która:
1. Pobiera dane kontaktu i Business Interview
2. Pobiera dane firmy (jeśli przypisana)
3. Wysyła do AI z prośbą o:
   - Uzupełnienie i poprawienie danych BI
   - Wygenerowanie `missing_info` (max 10 pytań)
   - Wygenerowanie `needs_offers` propozycji
   - Wygenerowanie `task_proposals`
   - Wygenerowanie `connection_recommendations` (szukanie pasujących kontaktów w bazie)
4. Zapisuje wyniki do tabeli `bi_ai_outputs`
5. Aktualizuje status BI na `ai_processed`
6. Opcjonalnie aktualizuje dane osobowe kontaktu (imię, email, telefon itd.)

**Struktura Edge Function:**
```typescript
// Główne kroki:
// 1. Autoryzacja
// 2. Pobranie BI + kontaktu + firmy
// 3. Pobranie innych kontaktów do matchowania
// 4. Wywołanie AI z promptem
// 5. Parsowanie odpowiedzi
// 6. Zapis do bi_ai_outputs
// 7. Opcjonalnie: aktualizacja kontaktu
// 8. Zwrot wyniku
```

### 2. Aktualizacja `BITab.tsx`

Zmiana funkcji `handleProcessAI`:

```typescript
// Obecny kod (placeholder):
const handleProcessAI = async () => {
  setIsProcessingAI(true);
  try {
    // TODO: Call process-bi-ai edge function
    toast.info('Przetwarzanie AI zostanie dodane wkrótce');
  } finally {
    setIsProcessingAI(false);
  }
};

// Nowy kod:
const processBI = useProcessBIWithAI();

const handleProcessAI = async () => {
  if (!biData?.id) {
    toast.error('Najpierw zapisz dane BI');
    return;
  }
  
  setIsProcessingAI(true);
  try {
    const result = await processBI.mutateAsync({ biId: biData.id });
    toast.success('AI przeanalizowało dane');
    // Opcjonalnie: wyświetl wyniki
  } catch (error) {
    toast.error('Błąd przetwarzania AI');
    console.error(error);
  } finally {
    setIsProcessingAI(false);
  }
};
```

### 3. Prompt AI - kluczowe elementy

```text
## ZADANIA:
1. UZUPEŁNIJ DANE: Na podstawie dostępnych informacji uzupełnij puste pola w sekcjach BI
2. POPRAW BŁĘDY: Popraw literówki, rozwiń skróty, ustandaryzuj formaty
3. WYGENERUJ PYTANIA: Zidentyfikuj max 10 najważniejszych brakujących informacji
4. PROPOZYCJE POTRZEB/OFERT: Na podstawie danych wygeneruj propozycje
5. PROPOZYCJE ZADAŃ: Zaproponuj konkretne działania follow-up
6. REKOMENDACJE POŁĄCZEŃ: Znajdź pasujące kontakty z sieci

## DANE KONTAKTU
[imię, nazwisko, stanowisko, firma, email, telefon...]

## DANE FIRMY (jeśli dostępne)
[nazwa, branża, przychody, produkty, usługi...]

## DANE Z ARKUSZA BI
[wszystkie sekcje A-N]

## INNI KONTAKTY DO MATCHOWANIA
[lista kontaktów z potrzebami/ofertami które mogą pasować]
```

---

## Podsumowanie zmian w plikach

| Plik | Typ zmiany | Opis |
|------|------------|------|
| `supabase/functions/process-bi-ai/index.ts` | **NOWY** | Edge function do przetwarzania BI przez AI |
| `src/components/bi/BITab.tsx` | Modyfikacja | Podłączenie hooka `useProcessBIWithAI` i wywołanie edge function |

---

## Przepływ danych

```text
[Użytkownik klika "Opracuj AI"]
          ↓
[BITab.tsx wywołuje processBI.mutateAsync()]
          ↓
[Edge function process-bi-ai]
    ├── Pobiera: kontakt, firma, BI, inne kontakty
    ├── Wysyła do AI (Gemini)
    ├── Parsuje odpowiedź JSON
    ├── Zapisuje do bi_ai_outputs
    └── Zwraca wynik
          ↓
[Toast "AI przeanalizowało dane"]
          ↓
[Odświeżenie queryClient - nowe dane widoczne]
```

---

## Oczekiwany rezultat

Po kliknięciu "Opracuj AI":
1. Pojawi się animacja ładowania
2. AI przetworzy dane BI
3. Wyniki zostaną zapisane w bazie
4. Status BI zmieni się na "AI przetworzony"
5. Użytkownik zobaczy wygenerowane propozycje do akceptacji/odrzucenia
