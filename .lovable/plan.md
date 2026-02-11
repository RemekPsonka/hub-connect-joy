

# Smart BI -- konsolidacja arkusza pierwszej rozmowy

## Filozofia zmiany

Obecne 11 sekcji to za duzo na arkusz **pierwszej rozmowy**. Wiele pol nigdy nie zostanie wypelnionych reczenie -- powinny byc uzupelniane automatycznie przez AI/Perplexity. Proponuje zagregowac 11 sekcji do **6 smart sekcji**, gdzie uzytkownik skupia sie na tym, co slyszy na spotkaniu, a reszta wypelnia sie z AI.

## Nowy uklad: 6 sekcji zamiast 11

| Nowa sekcja | Co laczy | Stare sekcje |
|---|---|---|
| **1. Kontekst spotkania** | Status relacji, sila, brief, zrodlo, rozw. aplikacje CC | A (kontekst) |
| **2. Firma i skala** | Profil firmy, rola, wlasnosc, przychody, pracownicy, spolki, inne biznesy | C + D |
| **3. Strategia i potrzeby** | Cele strategiczne, wyzwania, czego szuka, priorytety, inwestycje | F + G + H |
| **4. Wartość i zaangażowanie** | Wartosc dla CC + zaangazowanie w CC | J + K |
| **5. Sfera prywatna** | Rodzina, hobby, sukcesja, organizacje, czlonkostwa | L + M |
| **6. Follow-up** | Ustalenia, pytania, terminy | N |

Sekcja A (dane kontaktowe: email, telefon, NIP, www) -- te pola **usuwamy z BI** bo juz istnieja na glownej karcie kontaktu. Nie ma sensu duplikowac. Branze takze -- to dane firmowe z AI profilu.

## Kluczowe zasady "smart"

1. **Pola auto-fill z AI** oznaczone ikonka (Sparkles) -- uzytkownik wie, ze AI je uzupelni
2. **Sekcje domyslnie zwiniete** jezeli puste -- otwarte tylko te z danymi lub kluczowe (1, 3, 6)
3. **Wskaznik wypelnienia** na kazdej sekcji -- np. "3/8 pol" jako Badge
4. **Brief z prospectingu** automatycznie zasilany -- przy konwersji prospect -> contact, `ai_brief` i `prospecting_notes` trafiaja do BI jako zrodlo danych (do pola `podpowiedzi_brief` + AI parsuje je tak samo jak notatke)

## Integracja z prospectingiem

Przy konwersji prospekta na kontakt CRM (ProspectingConvertDialog):
- `ai_brief` z `meeting_prospects` zapisywany jest w nowo utworzonym BI jako `podpowiedzi_brief` w sekcji A
- `prospecting_notes` dolaczane do notatki
- Edge function `bi-fill-from-note` uruchamiana automatycznie z trescia brief + notes
- Wynik: nowy kontakt ma juz czesciowo uzupelnione BI zanim ktokolwiek otworzy formularz

## Szczegoly techniczne

### Zmiany w typach (`types.ts`)

Typy JSONB w bazie sie NIE zmieniaja -- dane pozostaja w tych samych polach. Zmienia sie tylko UI -- jak sa prezentowane. Dzieki temu:
- Brak migracji bazy danych
- Brak utraty istniejacych danych
- Kompatybilnosc wsteczna z edge functions

### Nowe komponenty sekcji

| Nowy komponent | Zastepuje |
|---|---|
| `SmartSectionContext.tsx` | SectionABasic (tylko kontekst, bez danych kontaktowych) |
| `SmartSectionCompany.tsx` | SectionCCompanyProfile + SectionDScale (polaczone) |
| `SmartSectionStrategy.tsx` | SectionFStrategy + SectionGNeeds + SectionHInvestments |
| `SmartSectionValue.tsx` | SectionJValueForCC + SectionKEngagement |
| `SmartSectionPersonal.tsx` | SectionLPersonal + SectionMOrganizations |
| `SmartSectionFollowup.tsx` | SectionNFollowup (bez zmian) |

### Komponent `SectionProgressBadge`

Maly badge pokazujacy ile pol jest uzupelnionych w sekcji:

```text
[3/8] -- szary
[6/8] -- zielony
[8/8] -- zielony z checkmark
```

Wyswietlany obok nazwy sekcji w AccordionTrigger.

### Logika auto-open sekcji w `BITab.tsx`

Zamiast statycznej listy `['section-a', 'section-c', 'section-g', 'section-n']`:
- Sekcja otwarta jezeli: ma dane LUB jest kluczowa (1-Kontekst, 3-Strategia, 6-Follow-up)
- Sekcja zwinieta jezeli: pusta i nie-kluczowa

### Integracja z ProspectingConvertDialog

W `ProspectingConvertDialog.tsx`, po udanej konwersji:
1. Jezeli prospect ma `ai_brief` lub `prospecting_notes`:
   - Utworz rekord w `business_interviews` z `section_a_basic.podpowiedzi_brief = ai_brief`
   - Wywolaj edge function `bi-fill-from-note` z trescia `ai_brief + prospecting_notes`
2. Dane z brief automatycznie trafiaja do odpowiednich sekcji BI

### Pliki do modyfikacji

| Plik | Zmiana |
|---|---|
| `src/components/bi/sections/SmartSectionContext.tsx` | NOWY -- sekcja 1 |
| `src/components/bi/sections/SmartSectionCompany.tsx` | NOWY -- sekcja 2 (C+D) |
| `src/components/bi/sections/SmartSectionStrategy.tsx` | NOWY -- sekcja 3 (F+G+H) |
| `src/components/bi/sections/SmartSectionValue.tsx` | NOWY -- sekcja 4 (J+K) |
| `src/components/bi/sections/SmartSectionPersonal.tsx` | NOWY -- sekcja 5 (L+M) |
| `src/components/bi/sections/SmartSectionFollowup.tsx` | NOWY -- sekcja 6 (N) |
| `src/components/bi/sections/SectionProgressBadge.tsx` | NOWY -- badge postępu |
| `src/components/bi/sections/index.ts` | Aktualizacja exportow |
| `src/components/bi/BITab.tsx` | Uzycie nowych 6 sekcji, smart auto-open |
| `src/components/deals-team/ProspectingConvertDialog.tsx` | Auto-tworzenie BI z brief |
| Stare pliki sekcji (SectionA..N) | Pozostaja -- nie usuwamy, ale nie sa juz uzywane w BITab |

### Uklad wewnatrz polaczonych sekcji

Kazda polaczona sekcja uzywa wewnetrznych separatorow z labelkami (jak juz teraz robi SectionC z "Profil dzialalnosci" / "Rola w firmie" / "Struktura wlasnosci"). Dzieki temu sekcja jest dluzsza, ale logicznie podzielona.

Przyklad sekcji 3 (Strategia i potrzeby):
```text
--- Cele i kierunki ---
  cele_strategiczne (textarea)
  szanse / ryzyka (2 textareas side-by-side)
  
--- Potrzeby biznesowe ---
  top3_priorytety (tags)
  najwieksze_wyzwanie (textarea)
  czego_poszukuje (badge multi-select)
  jakich_kontaktow (textarea)
  
--- Inwestycje ---
  planowane_projekty (textarea)
  status (select)
  czego_brakuje_typ (badges)
```

To daje 1 sekcje zamiast 3, ale z czytelnym wewnetrznym podzialem.

