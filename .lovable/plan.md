

# Wzbogacenie Briefu AI o dane z Business Interview (BI)

## Problem

Funkcja `prospect-ai-brief` generuje brief wylacznie na podstawie danych z Perplexity (wyszukiwanie zewnetrzne). Jezeli kontakt ma juz wypelniony arkusz Business Interview w systemie, te cenne dane (strategia, potrzeby, inwestycje, hobby, organizacje, rodzina) sa ignorowane.

## Rozwiazanie

Po pobraniu danych kontaktu, edge function sprawdzi czy istnieje rekord w `business_interviews` dla danego `contact_id`. Jezeli tak -- wyciagnie kluczowe dane z sekcji BI i doda je do promptu syntezy AI jako dodatkowy kontekst.

### Logika w edge function

```text
1. Pobierz contact_id (dla deal_contact -- juz mamy; dla prospect -- szukamy po full_name + company)
2. SELECT z business_interviews WHERE contact_id = X AND status != 'draft' (najnowsza wersja)
3. Jezeli rekord istnieje -- wyciagnij dane z sekcji:
   - section_a_basic: branza, zrodlo kontaktu, status relacji
   - section_c_company_profile: zakres dzialalnosci, rynki, produkty, rola, udzialy
   - section_d_scale: przychody, pracownicy, pojazdy, liczba spolek, kraje
   - section_f_strategy: cele strategiczne, szanse, ryzyka
   - section_g_needs: top3 priorytety, wyzwanie, czego poszukuje
   - section_h_investments: ostatnie/planowane inwestycje
   - section_l_personal: miasto, hobby, cele prywatne, rodzina
   - section_m_organizations: fundacje, organizacje branzowe, izby
4. Sformatuj jako blok tekstu "DANE Z BUSINESS INTERVIEW"
5. Dodaj do promptu syntezy AI -- przed sekcjami Perplexity
```

### Zmiany w prompcie syntezy

Dodanie nowej sekcji w prompcie:

```text
DANE Z WEWNETRZNEGO SYSTEMU CRM (Business Interview):
[sformatowane dane z BI]

WAZNE: Dane z Business Interview to ZWERYFIKOWANE informacje uzyskane bezposrednio 
od klienta lub z wewnetrznych zrodel. Maja WYZSZY priorytet niz dane z wyszukiwania 
internetowego. Uwzglednij je w briefie i oznacz jako potwierdzone.
```

### Obsluga obu zrodel (prospect vs deal_contact)

| Zrodlo | Jak znalezc contact_id |
|---|---|
| `deal_contact` | Juz mamy `dtc.contact_id` z zapytania |
| `prospect` | Szukamy w tabeli `contacts` po `full_name` i `company` (opcjonalnie). Jezeli brak dopasowania -- pomijamy BI |

### Plik do modyfikacji

| Plik | Zmiana |
|---|---|
| `supabase/functions/prospect-ai-brief/index.ts` | Dodanie zapytania do `business_interviews`, formatowanie danych BI, wzbogacenie promptu syntezy |

### Szczegoly techniczne

Funkcja pomocnicza `formatBIData(bi)` zamieni sekcje JSONB na czytelny tekst:

```text
formatBIData(bi) -> string:
  result = ""
  if section_a_basic:
    result += "Branza: " + branza.join(", ")
    result += "Zrodlo kontaktu: " + zrodlo_kontaktu
    result += "Status relacji: " + status_relacji
  if section_c_company_profile:
    result += "Zakres dzialalnosci: " + zakres_dzialalnosci
    result += "Produkty/uslugi: " + produkty_uslugi.join(", ")
    result += "Rola: " + tytul_rola
    ...
  if section_l_personal:
    result += "Miasto: " + miasto_bazowe
    result += "Hobby: " + hobby.join(", ")
    result += "Rodzina: " + ...
  ...
  return result
```

Jezeli BI nie istnieje lub jest w statusie `draft` -- blok "DANE Z BUSINESS INTERVIEW" nie pojawi sie w prompcie (brak zmian w dzialaniu).

