

# Uzupelnij z notatki -- AI wypelnia arkusz BI na podstawie notatki

## Opis
Nowy przycisk "Uzupelnij z notatki" w pasku akcji BIActionBar. Po kliknieciu otwiera sie dialog z polem tekstowym, w ktore uzytkownik wkleja notatke ze spotkania (luźny tekst). Edge function analizuje notatke, wyciaga dane do poszczegolnych sekcji BI, a brakujace informacje uzupelnia przez Perplexity (np. dane firmy, branza, lokalizacje). Wynik jest mergowany z istniejacymi danymi formularza.

## Przeplyw uzytkownika

1. Uzytkownik klika "Uzupelnij z notatki" w pasku akcji BI
2. Otwiera sie dialog z duzym polem tekstowym
3. Uzytkownik wkleja/pisze notatke ze spotkania
4. Klika "Analizuj i uzupelnij"
5. Edge function:
   - Parsuje notatke i mapuje dane na sekcje BI (A-N)
   - Identyfikuje nazwe firmy, osobe, branze
   - Odpala Perplexity dla brakujacych danych (firma, branza, lokalizacje, majatek)
   - Zwraca ustrukturyzowane dane JSON mapowane na sekcje BI
6. Frontend merguje wynik z formularzem (nie nadpisuje istniejacych danych)
7. Uzytkownik widzi uzupelnione pola i moze je poprawic przed zapisem

## Zmiany

### 1. Nowa edge function: `bi-fill-from-note`

Przyjmuje:
- `note` (string) -- tresc notatki
- `contactName` (string) -- imie i nazwisko kontaktu
- `companyName` (string, opcjonalnie) -- firma kontaktu
- `existingData` (object) -- aktualne dane BI (zeby nie duplikowac)

Kroki:
- **Krok 1 -- Ekstrakcja z notatki (Lovable AI):** Parsowanie notatki na strukturyzowane pola BI (tool calling dla JSON output)
- **Krok 2 -- Perplexity:** Dla zidentyfikowanej firmy/osoby szuka brakujacych danych (lokalizacje, majatek, branza, skala, kontrakty)
- **Krok 3 -- Synteza (Lovable AI):** Lacze dane z notatki i Perplexity, zwraca pelny JSON mapowany na sekcje BI

Output -- JSON z kluczami odpowiadajacymi sekcjom BI:
```text
{
  "section_a_basic": { ... },
  "section_c_company_profile": { ... },
  "section_d_scale": { ... },
  "section_f_strategy": { ... },
  "section_g_needs": { ... },
  "section_h_investments": { ... },
  "section_l_personal": { ... },
  "section_m_organizations": { ... },
  "section_n_followup": { ... },
  "ai_notes": "co AI znalazlo / czego nie udalo sie uzupelnic"
}
```

### 2. Nowy komponent: `BIFillFromNoteDialog.tsx`

Dialog z:
- Duze pole tekstowe (Textarea) na notatke
- Przycisk "Analizuj i uzupelnij" z loading state
- Po zakonczeniu: podsumowanie co zostalo uzupelnione (lista sekcji)
- Przycisk "Zastosuj" ktory merguje dane z formularzem

### 3. Modyfikacja `BIActionBar.tsx`

- Nowy przycisk "Uzupelnij z notatki" (ikona NotebookPen) obok "Opracuj AI"
- Otwiera `BIFillFromNoteDialog`

### 4. Modyfikacja `BITab.tsx`

- State do otwierania dialogu
- Handler `handleFillFromNote` ktory merguje zwrocone dane z `formData`
- Merge logika: nowe dane uzupelniaja tylko puste pola (nie nadpisuja istniejacych)

### 5. Hook: `useFillBIFromNote`

Mutacja wywolujaca edge function `bi-fill-from-note` i zwracajaca ustrukturyzowane dane.

## Pliki do utworzenia / modyfikacji

| Plik | Zmiana |
|------|--------|
| `supabase/functions/bi-fill-from-note/index.ts` | **NOWY** -- edge function |
| `src/components/bi/BIFillFromNoteDialog.tsx` | **NOWY** -- dialog z polem na notatke |
| `src/components/bi/BIActionBar.tsx` | Nowy przycisk "Uzupelnij z notatki" |
| `src/components/bi/BITab.tsx` | State dialogu, handler merge danych |
| `src/hooks/useBusinessInterview.ts` | Nowa mutacja `useFillBIFromNote` |
| `supabase/config.toml` | Rejestracja nowej edge function |

## Logika merge danych

Kluczowa zasada: AI uzupelnia tylko puste/undefined pola. Istniejace dane nie sa nadpisywane.

```text
dla kazdej sekcji:
  dla kazdego pola w sekcji:
    jesli pole jest puste/undefined w formData -> uzupelnij z AI
    jesli pole ma juz wartosc -> zachowaj istniejaca
```

Dla tablic (np. branze, hobby, kraje): AI dolacza nowe elementy do istniejacych.

## Sekrety
Wszystkie potrzebne klucze juz skonfigurowane:
- `PERPLEXITY_API_KEY` -- wyszukiwanie danych o firmie/osobie
- `LOVABLE_API_KEY` -- parsowanie notatki i synteza

