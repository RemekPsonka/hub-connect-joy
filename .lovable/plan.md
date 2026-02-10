
# Wylaczenie pobierania skanow wizytowek

## Zakres zmian
Calkowite usuniecie logiki wycinania, uploadowania i wyswietlania podgladu wizytowek. Kolumna w bazie zostaje (bezpieczniej), ale kod przestaje z niej korzystac.

## Pliki do modyfikacji

### 1. `src/hooks/useAIImport.ts`
- Usunac funkcje `cropAndUploadBusinessCard` (linie 158-216)
- Usunac pola `bounding_box` i `business_card_image_url` z interfejsu `ParsedContact`
- Usunac blok "Crop and upload business card images" (linie 602-618)
- Usunac ustawianie `business_card_image_url` przy tworzeniu/merge kontaktow (linie 1013, 1109)
- Usunac mapowanie `bounding_box` z parsowania (linie 315-316, 595)

### 2. `src/components/contacts/ContactDetailHeader.tsx`
- Usunac import `BusinessCardPreview` i blok warunkowy wyswietlajacy podglad wizytowki (linie 173-177)

### 3. `supabase/functions/ocr-business-cards-batch/index.ts`
- Usunac z promptu AI instrukcje dotyczace `bounding_box` (opis pola, przyklad, format JSON)

### 4. `src/components/contacts/BusinessCardPreview.tsx`
- Usunac caly plik (komponent juz nie bedzie uzywany)

## Co zostaje
- Kolumna `business_card_image_url` w bazie danych -- nie ruszamy (bezpieczna, pusta kolumna TEXT)
- Bucket Storage `business-cards` -- zostaje (moze byc uzywany w przyszlosci)
