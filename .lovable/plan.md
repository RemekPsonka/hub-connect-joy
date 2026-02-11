

# Wzmocnienie briefu pierwszej rozmowy -- glebokie wyszukiwanie osoby i firmy

## Problem

Obecne prompty Perplexity sa zbyt ogolne i krotkie. Wynik: "Brak danych o pasjach, rodzinie czy zainteresowaniach" -- bo Perplexity nie dostaje wystarczajaco precyzyjnych instrukcji wyszukiwania. Brief jest powierzchowny.

## Rozwiazanie

Zmiana w jednym pliku: `supabase/functions/prospect-ai-brief/index.ts`

### 1. Perplexity: z 2 zapytan na 4 rownolegle

Zamiast 2 ogolnych zapytan (osoba + firma), rozbijamy na 4 wyspecjalizowane:

| Zapytanie | Cel |
|---|---|
| **Osoba -- profil zawodowy** | Rola, historia kariery, inne firmy, zarzady, rady nadzorcze, KRS |
| **Osoba -- prywatnie** | Pasje, hobby, rodzina, organizacje, fundacje, wywiady, wypowiedzi medialne, social media |
| **Firma -- profil** | Dzialalnosc, lokalizacje, majatek, skala, przychody, zatrudnienie, www |
| **Firma -- aktualnosci** | Notki prasowe, przetargi, inwestycje, nagrody, eventy, kontrakty, zmiany wlascicielskie |

Wszystkie 4 zapytania lecą rownolegle przez `Promise.all`.

### 2. Prompty Perplexity -- znacznie bardziej szczegolowe

Kazdy prompt bedzie zawieral konkretne instrukcje wyszukiwania, np.:

**Osoba -- prywatnie:**
- Szukaj wynikow typu: "imie nazwisko + wywiad", "imie nazwisko + pasja", "imie nazwisko + fundacja"
- Sprawdz LinkedIn, Golden.com, social media
- Rodzina: partner/zona/maz, dzieci (jezeli publicznie dostepne)
- Organizacje: izby handlowe, stowarzyszenia, kluby biznesowe, rotary, lions
- Cytaty z wywiadow, wypowiedzi na konferencjach

**Firma -- aktualnosci:**
- Notki prasowe z ostatnich 2 lat
- Przetargi publiczne (TED, BIP)
- Nagrody, wyroznienia, rankingi
- Zmiany w KRS, nowi wspolnicy, podwyzszenie kapitalu
- Eventy, sponsoring, targi branżowe

### 3. Prompt syntezy AI -- rozbudowany

Sekcja **Osoba** z "2-3 zdan" na pelny profil z podsekcjami:
- Kariera i rola
- Inne firmy i zarzady
- Pasje, zainteresowania, hobby
- Rodzina (jezeli znane)
- Organizacje, fundacje, CSR
- Cytaty / wypowiedzi medialne

Sekcja **Firma** z pelnym rozbudowaniem:
- Profil i dzialalnosc
- Lokalizacje i majatek
- Skala (przychody, zatrudnienie)
- Aktualnosci: ostatnie inwestycje, przetargi, notki prasowe
- Spolki powiazane, grupa kapitalowa

### 4. Upgrade modelu Perplexity

Zmiana z `sonar` na `sonar-pro` -- model z wielokrokowym rozumowaniem i 2x wiecej cytatow. Lepiej radzi sobie ze znajdowaniem ukrytych informacji.

### 5. Usuniecie filtra czasowego

Obecny `search_recency_filter: "year"` ogranicza wyniki do ostatniego roku. Dla zapytan o osobe (kariera, rodzina) to za malo. Filtr roczny pozostaje tylko dla zapytania o aktualnosci firmy.

## Zmiana w pliku

| Plik | Zmiana |
|---|---|
| `supabase/functions/prospect-ai-brief/index.ts` | Nowe 4 prompty Perplexity, nowy prompt syntezy, model sonar-pro |

## Efekt

Brief bedzie zawieral znacznie wiecej "smaczkow" -- cytaty z wywiadow, informacje o rodzinie, pasjach, organizacjach, ostatnich inwestycjach firmy, notkach prasowych. Kazdy znaleziony fakt pojawi sie w briefie.

