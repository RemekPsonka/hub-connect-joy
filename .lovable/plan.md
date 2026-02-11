
# Naprawa wyswietlania danych prospektow na liscie uczestnikow

## Problem

Prospekty zaimportowane z PDF maja prawidlowe dane (imie, nazwisko, firma, branza) zapisane w tabeli `meeting_prospects`. Jednak rekord w `meeting_participants` ma tylko `prospect_id` (bez `contact_id`). Zapytanie pobierajace uczestnikow laczy sie wylacznie z tabela `contacts` -- dla prospektow to zwraca null, wiec UI pokazuje "Nieznany kontakt" i brak firmy.

## Rozwiazanie

### 1. Rozszerzenie zapytania w `src/hooks/useMeetings.ts`

Dodanie joina z tabela `meeting_prospects` obok istniejacego joina z `contacts`:

```text
.select(`
  *,
  contact:contacts(id, full_name, company, email, primary_group_id),
  prospect:meeting_prospects(id, full_name, company, position, industry)
`)
```

### 2. Aktualizacja UI w `src/components/meetings/MeetingParticipantsTab.tsx`

Fallback na dane prospekta gdy `contact` jest null:

```text
// Imie i nazwisko
{participant.contact?.full_name ?? participant.prospect?.full_name ?? 'Nieznany kontakt'}

// Firma
{participant.contact?.company ?? participant.prospect?.company ?? '---'}
```

### 3. Aktualizacja UI w `src/components/meetings/MeetingRecommendationsTab.tsx`

Analogiczny fallback na dane prospekta w sekcji rekomendacji -- przy wyswietlaniu listy uczestnikow do zaznaczenia.

## Pliki do modyfikacji

| Plik | Zmiana |
|---|---|
| `src/hooks/useMeetings.ts` | Dodanie joina `prospect:meeting_prospects(...)` do zapytania `useMeetingParticipants` |
| `src/components/meetings/MeetingParticipantsTab.tsx` | Fallback na `participant.prospect?.full_name` i `prospect?.company` |
| `src/components/meetings/MeetingRecommendationsTab.tsx` | Analogiczny fallback na dane prospekta w listach uczestnikow |
