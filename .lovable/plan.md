
# Przycisk AI na liscie + Brief do pierwszej rozmowy + Export PDF

## Zmiany

### 1. Przycisk "Analiza AI" bezposrednio na karcie (nie w menu)
- Dodanie widocznego przycisku z ikona Sparkles obok przycisku menu (...)
- Jesli brief juz istnieje -- przycisk zmienia sie na "Brief" (otwiera dialog)
- Przycisk z loading spinner podczas generowania

### 2. Zmiana opisu
- "Brief AI" -> "Brief do pierwszej rozmowy" w dialogu i na liscie
- Tytul Sheet: "Brief do pierwszej rozmowy -- {imie}"

### 3. Checkboxy do zaznaczania prospektow + Export PDF
- Dodanie checkboxow na liscie do zaznaczania osob
- Przycisk "Eksportuj PDF" nad lista (widoczny gdy zaznaczono >= 1 osobe)
- Przycisk "Zaznacz wszystkie z briefem" do szybkiego zaznaczenia

### 4. Nowy plik: `src/utils/exportProspectBriefs.ts`
Export PDF -- 1 osoba = 1 strona A4, logiczne sekcje:

Kazda strona zawiera:
- **Naglowek**: Imie i nazwisko, firma, stanowisko, data wygenerowania briefu
- **Tresc briefu** renderowana z markdown na sekcje PDF:
  - Osoba (kim jest, pasje, rodzina)
  - Firma (dzialalnosc, branza, lokalizacje)
  - Kontekst ubezpieczeniowy (mienie, OC, flota, cyber)
  - Tematy do rozmowy
- **Stopka**: Zrodlo (wydarzenie), priorytet, status

Wykorzystuje wzorzec z `exportAgentProfile.ts`:
- Sanityzacja polskich znakow
- Pomocnicze funkcje checkPageBreak, addSectionHeader, addParagraph
- Parsowanie markdown (naglowki ##, listy -, pogrubienia **)

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/deals-team/ProspectingList.tsx` | Checkbox, przycisk AI na karcie, przycisk Export PDF, zmiana etykiet |
| `src/components/deals-team/ProspectAIBriefDialog.tsx` | Zmiana tytulu na "Brief do pierwszej rozmowy" |
| `src/utils/exportProspectBriefs.ts` | **NOWY** -- generowanie PDF z briefami (1 osoba = 1 strona) |

## Szczegoly techniczne

### ProspectingList.tsx
- Nowy state: `selectedIds: Set<string>` do sledzenia zaznaczonych
- Checkbox przy kazdym prospekcie (obok kropki priorytetu)
- Przycisk Sparkles/Loader2 obok menu (...) -- bezposrednio widoczny
- Nad filtrami: przycisk "Eksportuj brief PDF (N)" gdy selectedIds.size > 0
- Filtrowanie: export tylko tych co maja `ai_brief`

### exportProspectBriefs.ts
- Funkcja `exportProspectBriefsPDF(prospects: MeetingProspect[])`
- Iteracja po prospektach -- kazdy na nowej stronie
- Parsowanie markdown briefu na sekcje (split po `## `)
- Uzycie jsPDF + autoTable do formatowania
- Sanityzacja polskich znakow (wzorzec z exportAgentProfile)
- Nazwa pliku: `briefs-prospecting-{data}.pdf`
