
# Poprawki OCR, edycji kontaktu i scalania

## Problem

Z wizytówki Grzegorza Brachaczka:
- Telefon stacjonarny: +48 33 50 65 461
- Komórkowy: +48 660 919 504

W bazie danych:
- `phone`: +48338108428 (ZLE -- powinno byc +48 660 919 504)
- `phone_business`: +48 33 50 65 461 (OK)

Przyczyny:
1. **OCR prompt** -- AI poprawnie odczytuje `phone` i `mobile`, ale mapowanie w kodzie gubi `mobile` jesli `phone` istnieje
2. **useAIImport.ts linia 520** -- `phone: c.phone || c.mobile` zamiast rozdzielic oba numery
3. **ContactModal** -- brak pol `phone_business`, `email_secondary`, `address` w formularzu edycji
4. **ContactDetailHeader** -- wyswietla tylko `phone`, nie pokazuje `phone_business`

---

## Co zostanie naprawione

### 1. Poprawka mapowania OCR w useAIImport.ts

Linia 516-530: zmiana mapowania z batch OCR:
- `phone: c.mobile || c.phone` -- priorytet dla komorkowego (prywatny)
- `phone_business: c.phone || null` -- telefon sluzbowy (stacjonarny z wizytowki)
- Jesli OCR zwraca tylko jeden numer, trafia do `phone`

Linia 226: analogiczna poprawka w `toExtendedContact`:
- `phone_business: contact.phone_business || contact.phone || null` (telefon firmowy)
- `phone: contact.mobile || contact.phone || null` (prywatny / komorkowy)

### 2. Poprawka promptu OCR (edge function)

W `ocr-business-card/index.ts` -- ulepszenie instrukcji:
- Dodanie jasnej definicji: "phone = numer stacjonarny/firmowy, mobile = numer komorkowy (zaczynajacy sie od +48 5xx, 6xx, 7xx, 8xx)"
- Dodanie przykladu z wizytowka z dwoma numerami

### 3. Dodanie pol w formularzu edycji (ContactModal.tsx)

W zakladce "Dodatkowe" dodanie:
- **Telefon sluzbowy** (`phone_business`)
- **Email dodatkowy** (`email_secondary`)
- **Adres** (`address`)

Schema zod rozszerzona o te pola. Formularz laduje i zapisuje te wartosci.

### 4. Wyswietlanie dodatkowych danych w ContactDetailHeader

Pod istniejacym telefonem dodanie:
- `phone_business` z ikona `Phone` i etykieta "sluzb."
- `email_secondary` jesli istnieje

### 5. Poprawka merge (scalania) w import flow

Linia 904-920 w useAIImport.ts: rozdzielenie numerow przy scalaniu duplikatow:
- `phone_business` z OCR `phone` (stacjonarny)
- Zachowanie istniejacego `phone` (prywatnego) -- nigdy nie nadpisywany

---

## Pliki do modyfikacji

1. **`supabase/functions/ocr-business-card/index.ts`** -- ulepszenie promptu OCR
2. **`src/hooks/useAIImport.ts`** -- poprawka mapowania phone/mobile
3. **`src/components/contacts/ContactModal.tsx`** -- dodanie pol phone_business, email_secondary, address
4. **`src/components/contacts/ContactDetailHeader.tsx`** -- wyswietlanie phone_business i email_secondary

## Brak zmian w bazie danych
Kolumny `phone_business`, `email_secondary`, `address` juz istnieja w tabeli `contacts`.
