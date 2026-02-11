
# Poprawa AI uzupelniania BI z notatki

## Problem
Obecna edge function `bi-fill-from-note` ma kilka istotnych brakow:

1. **Niekompletny schemat** -- brakuje ok. 20 pol z typow BI (sukcesja, partner, dzieci, lista_wspolnikow, ebitda, izby_handlowe, horyzont_czasowy, priorytet, branza_tagi, i inne)
2. **Perplexity wysyla 1 ogolne zapytanie** zamiast targetowanych pytan o konkretne brakujace dane
3. **AI nie wnioskuje** -- np. z notatki o sukcesji powinno wywnioskowac `sukcesja: true`, z "siostra Monika" -> rodzina, z "300 mln" -> `przychody_ostatni_rok: "300_500mln"`, z "Opole" -> `miasto_bazowe`
4. **Brak przekazywania existingData do AI** -- AI nie wie ktore pola juz sa uzupelnione
5. **Bledne wykrywanie firmy** -- uzywa `zakres_dzialalnosci` zamiast nazwy firmy z kontaktu

## Przyklad: notatka o Michale Matejce

Z podanej notatki AI powinno wypelnic:

| Sekcja | Pole | Wartosc |
|--------|------|---------|
| A | branza | ["produkcja mięsa", "wędliny", "dania gotowe", "rolnictwo", "handel detaliczny"] |
| A | branza_tagi | ["FMCG", "food", "agro", "retail"] |
| C | zakres_dzialalnosci | "Rodzinna grupa kapitałowa zintegrowana pionowo – od hodowli, przez produkcję mięsa i wędlin, po własną sieć detaliczną" |
| C | rynki | "Polska, region opolski, planowana ekspansja na Śląsk" |
| C | produkty_uslugi | ["rozbiór wieprzowiny i wołowiny", "wędliny wieprzowe i drobiowe", "dania gotowe/garmaz", "sklepy mięsne", "supermarkety spożywcze"] |
| C | tytul_rola | "Współwłaściciel / następca" |
| C | ceo_operacyjny | true |
| C | wspolnicy | true |
| C | lista_wspolnikow | [{ nazwa: "Monika (siostra)", procent: 0 }] |
| D | przychody_ostatni_rok | "300_500mln" |
| D | pracownicy | "350" |
| D | liczba_spolek | 5+ (gospodarstwa + spolki operacyjne) |
| D | glowna_vs_holding | true |
| D | inne_branze | ["rolnictwo", "handel detaliczny"] |
| D | skala_pl | "ok. 300 mln zł łącznie" |
| F | cele_strategiczne | "Ekspansja na Śląsk (M&A), skalowanie garmażu/dań gotowych, profesjonalizacja struktur zarządczych" |
| F | szanse | "Rosnący rynek convenience/ready-to-eat, możliwości M&A" |
| F | ryzyka | "Rosnące koszty sieci detalicznej, presja płacowa, brak technologa" |
| G | top3_priorytety | ["Model sprzedaży dań gotowych", "Ekspansja na Śląsk (M&A)", "Rekrutacja technologa"] |
| G | najwieksze_wyzwanie | "Optymalizacja modelu sprzedaży dań gotowych i rentowności m² sklepów" |
| G | czego_poszukuje | ["ekspansja", "ma", "hr", "optymalizacja"] |
| G | jakich_kontaktow | "Sieci do przejęcia na Śląsku, technolog mięsa, eksperci convenience/ready-to-eat" |
| H | planowane_projekty | "Budowa zakładu garmażu, przejęcie sieci na Śląsku, ekspansja zagraniczna" |
| H | ostatnie_typ | "Budowa zakładu garmażu / dań gotowych" |
| H | status | "w_trakcie" |
| H | czego_brakuje_typ | ["kontakt"] |
| J | knowhow | "Integracja pionowa w branży mięsnej, zarządzanie siecią detaliczną, sukcesja rodzinna" |
| J | zasoby | "43 sklepy + 18 supermarketów, 7000 ha gruntów rolnych" |
| L | miasto_bazowe | "Opole" |
| L | sukcesja | true |
| L | sukcesja_opis | "Rodzice odchodzą na emeryturę, biznes przejmowany z siostrą Moniką. Konstytucja rodzinna wdrożona ~6 miesięcy temu. Budowa struktur zarządczych." |

Perplexity powinno dodatkowo poszukac:
- NIP i strona www firmy Matejka
- Organizacje branzowe (izby handlowe, stowarzyszenia mięsne)
- Hobby, aktywnosc publiczna Michala
- Dokładna liczba spolek w grupie
- Inne informacje o rodzinie

## Zmiany

### 1. Edge function `bi-fill-from-note` -- pelna przebudowa

**Schemat** -- dodanie WSZYSTKICH brakujacych pol:
- `section_a_basic`: + `branza_tagi`, `email_asystenta`, `telefon_asystenta`
- `section_c_company_profile`: + `lista_wspolnikow` (array of objects), `poziom_decyzyjnosci`
- `section_d_scale`: + `ebitda_ostatni`, `ebitda_plan`, `glowna_vs_holding`, `skala_pl`, `skala_zagranica`
- `section_g_needs`: + `horyzont_czasowy`, `priorytet`, `jakich_rekomendacji`
- `section_h_investments`: + `ostatnie_doradcy`, `ostatnie_decydenci`, `czego_brakuje`, `czego_brakuje_typ`
- `section_j_value_for_cc`: caly (brakuje w schemacie)
- `section_k_engagement`: caly (brakuje w schemacie)
- `section_l_personal`: + `sukcesja`, `sukcesja_opis`, `partner`, `dzieci`
- `section_m_organizations`: + `izby_handlowe`

**Prompt ekstrakcji** -- instrukcja do wnioskowania:
- "Jeśli notatka mówi o sukcesji, ustaw sukcesja=true i opisz w sukcesja_opis"
- "Mapuj przychody na predefiniowane przedziały: do_10mln, 10_50mln, ..., powyzej_1mld"
- "Wyciągnij członków rodziny do partner/dzieci"
- "Wnioskuj czego_poszukuje z opisanych wyzwań"
- Przekazywanie `existingData` do promptu aby AI wiedzialo czego NIE uzupelniac

**Perplexity** -- 2 targetowane zapytania zamiast 1 ogolnego:
1. Zapytanie o firme: NIP, www, dokladna struktura, organizacje branzowe, dane finansowe
2. Zapytanie o osobe: aktywnosc publiczna, organizacje, hobby, wywiady

**Synteza** -- lepszy prompt z instrukcja mapowania na enum values (REVENUE_PRESETS, SEEKING_CATEGORIES)

### 2. BITab.tsx -- poprawka wykrywania firmy

Zamiast `zakres_dzialalnosci` uzyc nazwy firmy z kontaktu (props lub z contacts table).

## Pliki do modyfikacji

| Plik | Zmiana |
|--------|--------|
| `supabase/functions/bi-fill-from-note/index.ts` | Pelna przebudowa: kompletny schemat, lepsze prompty, 2 zapytania Perplexity, wnioskowanie |
| `src/components/bi/BITab.tsx` | Poprawka przekazywania nazwy firmy do handleFillFromNote |

## Szczegoly techniczne

### Nowy schemat BI_SECTIONS_SCHEMA

Kompletny schemat pokrywajacy 100% pol z typow BI, wlacznie z obiektami zagniezdzonym (lista_wspolnikow, partner, dzieci).

### Nowy prompt ekstrakcji

Kluczowe instrukcje dla AI:
- Lista enumow do mapowania (REVENUE_PRESETS, SEEKING_CATEGORIES, status_relacji, horyzont_czasowy, priorytet)
- Zasady wnioskowania (sukcesja -> sukcesja=true, wyzwania -> czego_poszukuje)
- Mapowanie lokalizacji na miasto_bazowe
- Ekstrakcja czlonkow rodziny z kontekstu

### Perplexity -- 2 zapytania

Zapytanie 1 (firma):
```text
"{companyName}" Polska: NIP, strona www, właściciele, struktura grupy kapitałowej, 
organizacje branżowe, izby handlowe, dane finansowe KRS, liczba spółek
```

Zapytanie 2 (osoba):
```text
"{contactName}" "{companyName}": aktywność publiczna, organizacje, stowarzyszenia, 
fundacje, hobby, wywiady prasowe, media społecznościowe
```

Wyniki obu zapytan przekazywane do syntezy.

### Przekazywanie existingData

Edge function otrzymuje `existingData` i przekazuje do promptu AI:
- "Pola juz uzupelnione (NIE NADPISUJ): {lista pol z wartosciami}"
- AI skupia sie tylko na pustych polach
