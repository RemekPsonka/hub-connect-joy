
# Naprawa parsowania listy poszukiwanych (AI zwraca pustą odpowiedź)

## Problem
Edge function `parse-wanted-list` otrzymuje status 200 z AI gateway, ale pole `choices[0].message.content` jest puste (length: 0). Model `google/gemini-3-flash-preview` nie generuje odpowiedzi dla tego promptu.

## Rozwiazanie

### Zmiany w `supabase/functions/parse-wanted-list/index.ts`:

1. **Zmiana modelu** z `google/gemini-3-flash-preview` na `google/gemini-2.5-flash` -- sprawdzony, stabilny model
2. **Dodanie `response_format: { type: "json_object" }`** -- wymuszenie odpowiedzi JSON od modelu
3. **Dodanie logowania pelnej odpowiedzi AI** na wypadek dalszych problemow (`console.log` calego obiektu `aiResponse`)
4. **Fallback**: jesli `content` jest pusty, zalogowac cala odpowiedz i zwrocic czytelny blad zamiast "Nie udalo sie sparsowac"

### Szczegoly techniczne

Zmiana w linii 117:
- `model: "google/gemini-3-flash-preview"` -> `model: "google/gemini-2.5-flash"`

Dodanie po linii 116:
- `response_format: { type: "json_object" }`

Dodanie po pobraniu `responseText` (ok. linia 155):
- Log pelnej odpowiedzi AI jesli `responseText` jest pusty
- Rzucenie czytelnego bledu zamiast cichego fallbacku

Zaden inny plik nie wymaga zmian.
