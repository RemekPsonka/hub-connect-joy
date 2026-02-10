
# Podglad wizytowki na karcie kontaktu

## Koncepcja

Kazda wizytowka zeskanowana w trybie batch (jedno zdjecie = wiele wizytowek) wymaga wyodrebnienia indywidualnego fragmentu obrazu. System bedzie dzialal nastepujaco:

1. **AI zwraca bounding box** -- prompt OCR zostanie rozszerzony o pole `bounding_box` (procentowe wspolrzedne x, y, width, height) dla kazdej wizytowki na zdjeciu
2. **Edge function wycina fragment** -- po otrzymaniu bounding boxow, edge function uzywa biblioteki do wycinania kazdej wizytowki z oryginalnego obrazu (canvas API w Deno lub Lovable AI image edit)
3. **Kompresja i zapis** -- wyciety fragment jest skalowany do miniaturki (~400px szerokosc, JPEG quality 70%) i uploadowany do Storage bucket `business-cards`
4. **Powiazanie z kontaktem** -- URL miniaturki zapisywany jest w nowej kolumnie `business_card_image_url` w tabeli `contacts`
5. **Wyswietlanie na karcie** -- maly podglad wizytowki widoczny na stronie szczegolowej kontaktu (np. w popoverze po kliknieciu ikonki)

## Podejscie do wycinania obrazu

Poniewaz Deno nie ma natywnego Canvas API, najlepszym podejsciem jest:

**Opcja A (rekomendowana): Wycinanie po stronie frontendu**
- Frontend juz ma obraz w pamieci (base64)
- Po otrzymaniu bounding boxow z AI, uzywa HTML Canvas do wycinania kazdej wizytowki
- Wyciety fragment jest kompresowany i uploadowany do Storage
- Zalety: zero dodatkowych zaleznosci, szybkie, nie obciaza edge function

**Opcja B: AI image edit**
- Uzycie Lovable AI z modelem Gemini do "crop this area" -- drogie i wolne, nie polecane

## Szczegoly techniczne

### 1. Nowa kolumna w bazie
```sql
ALTER TABLE contacts ADD COLUMN business_card_image_url TEXT;
```

### 2. Nowy Storage bucket
- Nazwa: `business-cards`  
- Publiczny odczyt, zapis tylko dla zalogowanych
- Struktura: `{tenant_id}/{contact_id}.jpg`

### 3. Zmiany w OCR prompt (edge function)
Dodanie do promptu:
```
- bounding_box: { x: procent_od_lewej, y: procent_od_gory, w: procent_szerokosci, h: procent_wysokosci }
```
AI zwroci przyblizone wspolrzedne kazdej wizytowki na zdjeciu.

### 4. Frontend: wycinanie i upload (useAIImport.ts)
Po otrzymaniu kontaktow z bounding boxami:
1. Dla kazdego kontaktu: uzyj Canvas do wyciecia fragmentu z oryginalnego obrazu
2. Skaluj do max 400px szerokosc
3. Konwertuj na JPEG (quality 0.7) -- ok 20-50KB na wizytowke
4. Upload do Storage bucket
5. Zapisz URL w polu `business_card_image_url` przy tworzeniu/merge kontaktu

### 5. Wyswietlanie (ContactDetailHeader.tsx)
- Mala ikonka wizytowki obok avatara lub w sekcji danych
- Po kliknieciu -- Popover/Dialog z powiekszonym podgladem
- Uzycie komponentu AspectRatio (juz zainstalowany) do zachowania proporcji

## Pliki do modyfikacji / utworzenia

1. **Migracja SQL** -- dodanie kolumny `business_card_image_url` + bucket `business-cards`
2. **`supabase/functions/ocr-business-cards-batch/index.ts`** -- rozszerzenie promptu o bounding_box
3. **`src/hooks/useAIImport.ts`** -- logika wycinania Canvas + upload do Storage
4. **`src/components/contacts/ContactDetailHeader.tsx`** -- wyswietlanie miniaturki wizytowki
5. **`src/hooks/useBusinessCardOCR.ts`** -- aktualizacja typow o bounding_box
6. **`supabase/functions/merge-contacts/index.ts`** -- obsluga pola business_card_image_url przy merge

## Szacowany rozmiar danych
- Miniaturka 400px JPEG: ~20-50KB
- 1000 wizytowek = ~30-50MB -- minimalne obciazenie Storage
