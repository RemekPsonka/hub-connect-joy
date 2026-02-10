
# Poprawa wyswietlania bledow OCR wizytowek

## Problem
Gdy AI Gateway zwraca blad 402 (brak kredytow), edge function poprawnie zwraca szczegolowy komunikat bledu: "Obraz 1: Wymagana platnosc - dodaj srodki do konta". Jednak frontend nadpisuje ten komunikat generycznym tekstem "Nie udalo sie wyodrebnic zadnych kontaktow ze zdjec wizytowek", ukrywajac prawdziwa przyczyne problemu.

## Przyczyna
W `src/hooks/useAIImport.ts` linia 590-594:
- `data.errors` (zawierajace prawdziwe bledy z API) jest zapisywane do `metadata.warnings` 
- Ale gdy `contacts.length === 0`, ustawiany jest generyczny blad, ktory zaslaniana informacje z API

## Rozwiazanie

### Plik: `src/hooks/useAIImport.ts`

Zmiana w liniach 593-594: zamiast generycznego komunikatu, wyswietlic bledy zwrocone z API (jesli istnieja):

```typescript
if (contacts.length === 0) {
  if (data.errors && data.errors.length > 0) {
    setErrors(data.errors);
  } else {
    setErrors(['Nie udalo sie wyodrebnic zadnych kontaktow ze zdjec wizytowek.']);
  }
}
```

Dzieki temu uzytkownik zobaczy konkretny blad, np. "Obraz 1: Wymagana platnosc - dodaj srodki do konta", zamiast generycznego komunikatu.

Zmiana dotyczy tylko jednego pliku, kilku linii kodu.
