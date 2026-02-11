
# Dodanie "Cofnij na Prospecting" i Brief AI na karcie Deal Contact

## Problem

Na panelu bocznym kontaktu w Kanbanie (DealContactDetailSheet) brakuje dwoch funkcji:
1. **Brak przycisku "Cofnij na liste Prospecting"** -- nie mozna przeniesc kontaktu z powrotem na liste prospektow
2. **Brak analizy AI (Brief)** -- nie mozna wygenerowac briefu do pierwszej rozmowy, a jezeli brief istnieje, nie ma gdzie go zobaczyc

## Rozwiazanie

### 1. Nowe kolumny w bazie: `deal_team_contacts`

Dodanie `ai_brief` (text) i `ai_brief_generated_at` (timestamptz) do tabeli `deal_team_contacts` -- analogicznie jak w `meeting_prospects`.

### 2. Modyfikacja edge function `prospect-ai-brief`

Obecna funkcja dziala tylko z tabela `meeting_prospects`. Rozszerzenie o parametr `source`:
- `source: "prospect"` + `prospectId` -- obecna logika (odczyt/zapis z `meeting_prospects`)
- `source: "deal_contact"` + `dealContactId` -- nowa logika (odczyt z `deal_team_contacts` JOIN `contacts`, zapis do `deal_team_contacts`)

Prompty Perplexity i synteza AI pozostaja identyczne -- zmienia sie tylko skad pobieramy dane osoby i gdzie zapisujemy brief.

### 3. Nowy hook: `useGenerateDealContactBrief`

W `useMeetingProspects.ts` (lub nowy plik) -- mutation analogiczny do `useGenerateProspectBrief`, ale wysylajacy `source: "deal_contact"` i `dealContactId`.

### 4. Nowy hook: `useRevertToProspecting`

Mutation ktory:
- Pobiera dane kontaktu z `contacts` (full_name, company, position, industry, email, phone, linkedin)
- Tworzy nowy rekord w `meeting_prospects` z tymi danymi i `is_prospecting: true`, `prospecting_status: 'new'`
- Usuwa rekord z `deal_team_contacts`
- Loguje akcje w activity log

### 5. UI w DealContactDetailSheet

Dodanie dwoch nowych sekcji:

**Sekcja "Brief AI"** (miedzy Notatki a Statusy tygodniowe):
- Przycisk "Generuj Brief AI" (ikona Sparkles) -- uruchamia `useGenerateDealContactBrief`
- Jezeli brief istnieje: wyswietla tresc w markdown + date generowania + przycisk "Odswiez"
- Klikniecie w tytul otwiera `ProspectAIBriefDialog` z pelna trescia

**Przycisk "Cofnij na Prospecting"** (obok "Usun z zespolu"):
- AlertDialog z potwierdzeniem
- Po kliknieciu: tworzy prospect, usuwa z Kanbana, zamyka panel

## Pliki do modyfikacji

| Plik | Zmiana |
|---|---|
| Migracja SQL | Dodanie `ai_brief`, `ai_brief_generated_at` do `deal_team_contacts` |
| `supabase/functions/prospect-ai-brief/index.ts` | Obsluga `source: "deal_contact"` obok istniejacego `source: "prospect"` |
| `src/hooks/useDealsTeamContacts.ts` | Nowe hooki: `useGenerateDealContactBrief`, `useRevertToProspecting` |
| `src/components/deals-team/DealContactDetailSheet.tsx` | Sekcja Brief AI + przycisk Cofnij na Prospecting |

## Logika cofania na Prospecting

```text
1. Pobierz dane z contacts (full_name, company, position, industry)
2. INSERT do meeting_prospects (team_id, tenant_id, dane osoby, is_prospecting=true, status='new')
3. DELETE z deal_team_contacts
4. INSERT do deal_team_activity_log (action='contact_removed', note='Cofnieto na liste prospecting')
5. Invalidate queries
```

## Logika Brief AI na Deal Contact

```text
1. Frontend wywoluje edge function z { source: "deal_contact", dealContactId }
2. Edge function: SELECT z deal_team_contacts JOIN contacts WHERE id = dealContactId
3. Pobiera full_name, company, position, industry z kontaktu
4. 4x Perplexity queries (identyczne jak dla prospekta)
5. Synteza AI (identyczna)
6. UPDATE deal_team_contacts SET ai_brief = ..., ai_brief_generated_at = now()
7. Zwraca brief do frontendu
```
