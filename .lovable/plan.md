
# Implementacja: Poprawa AI na karcie BI

## Zmiany w plikach

### 1. `supabase/functions/bi-fill-from-note/index.ts` -- pelna przebudowa

Kompletny schemat BI_SECTIONS_SCHEMA pokrywajacy WSZYSTKIE pola z typow BI:
- section_a_basic: + branza_tagi, email_asystenta, telefon_asystenta, rozwaza_aplikacje_cc
- section_c_company_profile: + lista_wspolnikow (array of objects z nazwa/procent), poziom_decyzyjnosci
- section_d_scale: + ebitda_ostatni, ebitda_plan, glowna_vs_holding, skala_pl, skala_zagranica (z enum dla przychodow)
- section_g_needs: + horyzont_czasowy (enum), priorytet (enum), jakich_rekomendacji
- section_h_investments: + ostatnie_doradcy, ostatnie_decydenci, czego_brakuje, czego_brakuje_typ
- section_j_value_for_cc: CALA SEKCJA (kontakty, knowhow, zasoby) -- brakuje w obecnym schemacie
- section_k_engagement: CALA SEKCJA (mentoring, leadership, edukacja, filantropia, integracja + opisy)
- section_l_personal: + sukcesja (boolean), sukcesja_opis, partner (object), dzieci (array of objects)
- section_m_organizations: + izby_handlowe
- section_n_followup: + wizyta_cc, email_podsumowanie

**Nowy prompt ekstrakcji** z instrukcjami wnioskowania:
- Sukcesja: "rodzice na emeryture" -> sukcesja=true + opis
- Rodzina: "siostra Monika" -> lista_wspolnikow + kontekst rodzinny
- Przychody: "300 mln zl" -> mapowanie na enum "300_500mln"
- Wyzwania: "szuka sieci do przejecia" -> czego_poszukuje=["ma","ekspansja"]
- Lokalizacje: "Opole" -> miasto_bazowe
- Tagi: produkcja miesa -> branza_tagi=["FMCG","food"]
- Wartosc dla CC: wnioskowanie knowhow/zasoby z opisu biznesu

**Funkcja buildExistingDataContext** -- buduje liste juz uzupelnionych pol i przekazuje do promptu AI, zeby nie nadpisywalo.

**Perplexity -- 2 targetowane zapytania** (rownolegle):
1. Firma: NIP, www, struktura grupy, organizacje branzowe, izby handlowe, KRS, finanse
2. Osoba: aktywnosc publiczna, organizacje, hobby, wywiady, rodzina, nagrody

**Obsluga pustej notatki** -- jesli note jest puste/brak, wszystko pobierane z Perplexity.

**Obsluga bledow** -- 429 (rate limit) i 402 (brak srodkow) z czytelnymi komunikatami.

### 2. `src/components/bi/BITab.tsx` -- poprawka nazwy firmy

Linia 147-149: zamiast uzywac `zakres_dzialalnosci` jako companyName, dodac prop `companyName` do BITab.

### 3. `src/components/contacts/MeetingsTab.tsx` -- przekazanie companyName

Dodanie propa `companyName` i przekazanie go do BITab.

### 4. `src/pages/ContactDetail.tsx` -- przekazanie companyName

Przekazanie `contact.companies?.name` do MeetingsTab.

## Przeplyw danych firmy

```text
ContactDetail (contact.companies?.name)
  -> MeetingsTab (companyName prop)
    -> BITab (companyName prop)
      -> handleFillFromNote (companyName do edge function)
```

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| supabase/functions/bi-fill-from-note/index.ts | Pelna przebudowa edge function |
| src/components/bi/BITab.tsx | Uzycie propa companyName zamiast zakres_dzialalnosci |
| src/components/contacts/MeetingsTab.tsx | Dodanie propa companyName |
| src/pages/ContactDetail.tsx | Przekazanie contact.companies?.name |
