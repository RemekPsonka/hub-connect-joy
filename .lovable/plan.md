
# Brief AI dla prospektow -- analiza przed spotkaniem

## Opis
Dodanie przycisku "Analiza AI" na liscie Prospecting, ktory uruchamia edge function. Funkcja uzywa Perplexity do wyszukania informacji o osobie i firmie, a nastepnie Lovable AI do syntezy krotkiego briefu brokerskiego przed pierwszym spotkaniem. Brief jest zapisywany w bazie i wyswietlany w panelu bocznym.

## Perspektywa brokera
Brief jest pisany z perspektywy brokera ubezpieczeniowego przygotowujacego sie do pierwszego spotkania. Nie chodzi o sprzedaz, ale o:
- Wiedze o kliencie (kim jest, co robi, co posiada)
- Zrozumienie branzy i potencjalnych ryzyk ubezpieczeniowych
- Tematy do rozmowy (pasje, rodzina, zainteresowania)
- Kontekst biznesowy (lokalizacje, majatek, produkcja, kontrakty, handel)

## Zmiany

### 1. Migracja SQL
Dodanie kolumny `ai_brief` (TEXT) do tabeli `meeting_prospects`:
```text
ALTER TABLE public.meeting_prospects ADD COLUMN ai_brief TEXT DEFAULT NULL;
ALTER TABLE public.meeting_prospects ADD COLUMN ai_brief_generated_at TIMESTAMPTZ DEFAULT NULL;
```

### 2. Nowa edge function: `prospect-ai-brief`
Funkcja realizuje 3 kroki:

**Krok 1 -- Perplexity (2 zapytania rownolegle):**
- Zapytanie o osobe: kim jest, stanowisko, pasje, rodzina, inne firmy, obecnosc medialna
- Zapytanie o firme: dzialalnosc, branza, lokalizacje, majatek, produkcja/handel/budowlanka, kontrakty, strona WWW

**Krok 2 -- Lovable AI (synteza):**
System prompt jako broker ubezpieczeniowy, ktory przygotowuje sie do spotkania. Generuje strukturyzowany brief:
- Osoba (2-3 zdania: kim jest, co robi, pasje/rodzina)
- Firma (dzialalnosc, branza, lokalizacje, majatek)
- Kontekst ubezpieczeniowy (na co zwrocic uwage: mienie, OC, flota, cyber, pracownicy)
- Tematy do rozmowy (co mozna poruszyc na spotkaniu)

**Krok 3 -- Zapis do bazy** w kolumnie `ai_brief`

### 3. Hook `useMeetingProspects.ts`
- Dodanie `ai_brief` i `ai_brief_generated_at` do typu `MeetingProspect`
- Nowa mutacja `useGenerateProspectBrief` wywolujaca edge function

### 4. Komponent `ProspectingList.tsx`
- Przycisk "Analiza AI" (ikona Brain/Sparkles) w menu kontekstowym kazdego prospekta
- Po kliknieciu: loading spinner, wywolanie edge function
- Po zakonczeniu: brief wyswietlany pod nazwa prospekta (rozwijalny)
- Jesli brief juz istnieje: przycisk "Odswież brief"

### 5. Komponent `ProspectAIBriefDialog.tsx` (NOWY)
Dialog/Sheet wyswietlajacy pelny brief z formatowaniem markdown:
- Naglowek z imieniem i firma
- Tresc briefu renderowana przez react-markdown
- Data wygenerowania
- Przycisk "Generuj ponownie"

## Pliki do utworzenia / modyfikacji

| Plik | Zmiana |
|------|--------|
| Migracja SQL | Nowe kolumny `ai_brief`, `ai_brief_generated_at` |
| `supabase/functions/prospect-ai-brief/index.ts` | **NOWY** -- edge function |
| `src/hooks/useMeetingProspects.ts` | Typ + nowa mutacja |
| `src/components/deals-team/ProspectingList.tsx` | Przycisk AI, wyswietlanie briefu |
| `src/components/deals-team/ProspectAIBriefDialog.tsx` | **NOWY** -- dialog z briefem |

## Sekrety
Wszystkie potrzebne klucze API sa juz skonfigurowane:
- `PERPLEXITY_API_KEY` -- wyszukiwanie informacji
- `LOVABLE_API_KEY` -- synteza briefu
