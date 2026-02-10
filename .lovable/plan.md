
# Import poszukiwanych z listy z rozpoznaniem AI

## Opis

Uzytkownik wkleja dowolna liste (tekst, CSV, notatki ze spotkania) do textarea. AI rozpoznaje kogo szukamy i mapuje na pola wanted_contacts. Wynik wyswietlany jako lista kart do przejrzenia -- uzytkownik moze edytowac kazda pozycje i zatwierdzic ja pojedynczo lub wszystkie naraz.

## Przeplyw

```text
1. Uzytkownik klika "Importuj liste" na stronie /wanted
2. Otwiera sie dialog z textarea + wybor "Kto szuka" (wymagane)
3. Uzytkownik wkleja liste (np. "Jan Kowalski, CEO z ABC Sp. z o.o., szukamy bo potrzebujemy dostawce IT")
4. Klikniecie "Analizuj" wysyla tekst do edge function parse-wanted-list
5. AI zwraca tablice poszukiwanych z polami: person_name, person_position, person_context, company_name, company_nip, company_industry, company_context, search_context, urgency
6. Wyswietlane jako lista kart z edytowalnymi polami
7. Kazda karta ma przycisk "Zatwierdz" (zapisuje do bazy) i "Odrzuc" (usuwa z listy)
8. Przycisk "Zatwierdz wszystkie" na gorze
```

## Nowe pliki

### 1. Edge function: `supabase/functions/parse-wanted-list/index.ts`

Wzorowana na istniejacym `parse-contacts-list`, ale z innym promptem i struktura wyjsciowa:

- Wejscie: `{ content: string, contentType: "text" }`
- AI prompt: rozpoznaj osoby/firmy/role do poszukiwania, wyodrebnij person_name, person_position, person_context, company_name, company_nip, company_industry, company_context, search_context, sugerowana urgency
- Wyjscie: `{ items: ParsedWantedItem[], metadata: { totalParsed, warnings } }`
- Auth: weryfikacja przez `verifyAuth` (ten sam pattern co inne funkcje)
- Model: `google/gemini-3-flash-preview`

### 2. Komponent: `src/components/wanted/ImportWantedDialog.tsx`

Dialog z dwoma etapami:

**Etap 1 -- Wklejanie:**
- ConnectionContactSelect: "Kto szuka" (wymagane, wspolne dla calej listy)
- Textarea: wklej liste (placeholder z przykladami)
- Przycisk "Analizuj z AI"

**Etap 2 -- Przegladanie wynikow:**
- Lista kart z rozpoznanymi pozycjami
- Kazda karta pokazuje wypelnione pola (person_name, company_name, itp.) z mozliwoscia edycji inline
- Kazda karta: przycisk "Zatwierdz" (zielony) i "Odrzuc" (czerwony)
- Na gorze: "Zatwierdz wszystkie (N)" i "Odrzuc wszystkie"
- Po zatwierdzeniu pozycji -- `useCreateWantedContact` z wybranym "Kto szuka" i polami z karty
- Zatwierdzone karty znikaja z listy (lub oznaczane jako done)

### 3. Hook/util (w komponencie lub osobny)

Wywolanie edge function `parse-wanted-list` przez `supabase.functions.invoke`.

## Zmiany w istniejacych plikach

### `src/pages/WantedContacts.tsx`

- Dodac przycisk "Importuj liste" obok "Dodaj"
- Dodac state i renderowanie `ImportWantedDialog`

### `supabase/config.toml`

- Dodac sekcje `[functions.parse-wanted-list]` z `verify_jwt = false`

## Szczegoly techniczne

### Prompt AI (parse-wanted-list)

Prompt instruuje model aby z dowolnego tekstu wyodrebnil liste poszukiwanych kontaktow/firm/rol i zmapowal na strukture:

```text
{
  items: [{
    person_name: string | null,
    person_position: string | null,
    person_context: string | null,
    company_name: string | null,
    company_nip: string | null,
    company_industry: string | null,
    company_context: string | null,
    search_context: string | null,
    urgency: "low" | "normal" | "high" | "critical"
  }]
}
```

### UI karty do przegladania

Kazda karta ma:
- Edytowalne pola (Input/Textarea) wypelnione danymi z AI
- Badge z sugerowana pilnoscia (edytowalny)
- Ikona statusu: oczekuje / zatwierdzona / odrzucona
- Przycisk "Zatwierdz" wywoluje `useCreateWantedContact.mutate(...)` z polami z karty + wspolnym `requested_by_contact_id`

## Kolejnosc implementacji

```text
1. Edge function parse-wanted-list (+ config.toml)
2. ImportWantedDialog.tsx (oba etapy)
3. WantedContacts.tsx (przycisk "Importuj liste")
```
