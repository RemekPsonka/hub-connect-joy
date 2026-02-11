
# Rozbudowa rekomendacji AI 1x1 -- brief AI dla prospektow, min 3 max 5, badge, wyszukiwanie kontaktow

## Zakres zmian

### 1. Frontend -- `MeetingRecommendationsTab.tsx`

**Lista uczestnikow -- wszyscy z grupowaniem:**
- Wyswietlic WSZYSTKICH uczestnikow spotkania pogrupowanych na:
  - "Moi czlonkowie" (is_member=true)
  - "Pozostali uczestnicy" (is_member=false, prospect_id=null)
  - "Prospekty" (prospect_id != null)
- Kazdy uczestnik z checkboxem + badge (uzycie istniejacego `ParticipantBadge`)
- Przycisk "Zaznacz wszystkich czlonkow" dla wygody
- Checkboxy tylko przy "Moi czlonkowie" -- rekomendacje generujemy DLA czlonkow

**Wyswietlanie wynikow:**
- Badge statusu rekomendacji z mozliwoscia zmiany (pending -> accepted/rejected/completed) -- istniejace przyciski + dodatkowy dropdown/przyciski dla wszystkich statusow
- Badge typu dopasowania (need-offer, synergy, networking itp.)
- Przy rekomendowanej osobie -- badge z `ParticipantBadge` (Prospect / Czlonek CC / Nowy)

**Wyszukiwanie kontaktow -- jezeli AI nie rozpoznal osoby:**
- Przy kazdej rekomendacji z nieznanym kontaktem (prospect bez powiazania) -- przycisk "Wyszukaj w bazie" otwierajacy dialog wyszukiwania
- Dialog uzywa `ConnectionContactSelect` (istniejacy komponent server-side search) do wyszukania kontaktu w bazie
- Po wybraniu kontaktu -- aktualizacja `recommended_contact_id` w rekomendacji (zamiast tworzenia duplikatu)

### 2. Backend -- `generate-meeting-recommendations/index.ts`

**Rozszerzone pobieranie danych:**
- `business_interviews` -- sekcje: `section_g_needs`, `section_j_value_for_cc`, `section_f_strategy`, `section_c_company_profile`, `section_l_personal`
- `meeting_prospects` -- dane prospektow: full_name, company, position, industry, ai_brief, prospecting_notes
- `one_on_one_meetings` -- historia spotkan 1:1 miedzy uczestnikami (wszystkie spotkania grupowe)
- `contacts` -- pelny profil: profile_summary, notes, tags

**AI Brief prospektow:**
- Dla uczestnikow z `prospect_id` -- pobranie `ai_brief` z tabeli `meeting_prospects`
- Wlaczenie briefu do kontekstu AI jako dodatkowe zrodlo informacji

**Logika AI -- rozszerzony prompt:**
- PRIORYTET NAJWYZSZY: Czlonek + Prospect (min 3, max 5 rekomendacji)
- PRIORYTET WYSOKI: Czlonek + Nie-czlonek (gosc CC)
- ZAKAZANE: NIE rekomendowac czlonek-czlonek
- Historia spotkan: "Osoby X i Y spotkaly sie juz N razy" -- unikaj powtorzek
- Minimum 3, maksimum 5 rekomendacji na czlonka
- Uzasadnienie 2-3 zdania po polsku

**Tool calling -- wymuszenie min 3:**
- `minItems: 3, maxItems: 5` w schemacie narzedzia
- Fallback: jezeli AI zwroci mniej niz 3, dopelnic losowymi prospektami/goscmi

### 3. Zmiana statusu rekomendacji -- pelna obsluga

Dodanie przyciskow/dropdown do zmiany statusu miedzy: pending, accepted, rejected, completed (nie tylko accept/reject).

## Pliki do modyfikacji

| Plik | Zmiana |
|---|---|
| `src/components/meetings/MeetingRecommendationsTab.tsx` | Wszyscy uczestnicy z grupowaniem, badge ParticipantBadge, zmiana statusu, wyszukiwanie kontaktow |
| `supabase/functions/generate-meeting-recommendations/index.ts` | Pobieranie BI/prospect AI brief/historii 1:1, rozszerzony prompt, priorytet prospect>gosc, zakaz czlonek-czlonek, min 3 max 5 |

## Szczegoly techniczne

### Backend -- pobieranie danych prospektow z AI briefem

```text
// Pobranie prospect_id z meeting_participants
const participantsWithProspects = participants.filter(p => p.prospect_id);
const prospectIds = participantsWithProspects.map(p => p.prospect_id);

// Pobranie AI briefow prospektow
const { data: prospects } = await supabase
  .from('meeting_prospects')
  .select('id, full_name, company, position, industry, ai_brief, prospecting_notes')
  .in('id', prospectIds);
```

### Backend -- historia spotkan 1:1

```text
const { data: pastMeetings } = await supabase
  .from('one_on_one_meetings')
  .select('contact_a_id, contact_b_id')
  .or(`contact_a_id.in.(${ids}),contact_b_id.in.(${ids})`);

// Budowa mapy: "contactA_contactB" -> count
```

### Backend -- rozszerzony prompt AI

```text
ZASADY:
1. PRIORYTET: Lacze CZLONKOW z PROSPEKTAMI (najwazniejsze!)
2. DOZWOLONE: Czlonek + Gosc CC
3. ZAKAZANE: NIE rekomenduj czlonek-czlonek
4. Minimum 3, maksimum 5 rekomendacji
5. Unikaj par ktore juz sie spotkaly (historia ponizej)

HISTORIA SPOTKAN 1:1:
- Jan Kowalski spotkal sie z: Adam Nowak (2x), ...

DANE BI CZLONKA:
- Potrzeby biznesowe: [z section_g_needs]
- Wartosc dla CC: [z section_j_value_for_cc]
- Strategia: [z section_f_strategy]

PROSPECT AI BRIEF:
[Pelny ai_brief z meeting_prospects -- pasje, rodzina, organizacje, notatki prasowe]
```

### Frontend -- wyszukiwanie kontaktu w bazie

Przy rekomendacji gdzie recommended_contact nie istnieje w bazie (prospect):
- Przycisk "Szukaj w bazie" otwiera dialog z `ConnectionContactSelect`
- Po wybraniu kontaktu -- update `meeting_recommendations.recommended_contact_id` na wybrany kontakt
- Zapobiega tworzeniu duplikatow -- uzywa istniejacego rekordu

### Frontend -- badge i zmiana statusu

Kazda rekomendacja wyswietla:
- Badge z `ParticipantBadge` przy rekomendowanej osobie (Prospect/Czlonek CC/Nowy)
- Przyciski zmiany statusu: Accept (zielony check), Reject (czerwony X), Complete (niebieski)
- Po zaakceptowaniu/odrzuceniu -- mozliwosc zmiany na inny status
