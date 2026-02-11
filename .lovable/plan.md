

# Szersze okno briefu z sekcjami jak w PDF

## Zmiany

Plik `ProspectAIBriefDialog.tsx` zostanie zmodyfikowany:

1. **Szersze okno** -- zmiana `sm:max-w-lg` na `sm:max-w-2xl` (z ~32rem na ~42rem)
2. **Sekcje wizualne** -- zamiast renderowac caly brief jako surowy Markdown, parsujemy go na sekcje (po naglowkach `##`) i wyswietlamy kazda sekcje w osobnej karcie z kolorowym naglowkiem, zgodnie ze stylem PDF:
   - Fioletowy -- Osoba
   - Niebieski -- Firma
   - Pomaranczowy -- Ubezpieczenia
   - Zielony -- Tematy do rozmowy
   - Szary -- pozostale

## Szczegoly techniczne

Wykorzystamy istniejaca logike parsowania z `exportProspectBriefs.ts` (`parseMarkdownBrief` i `getSectionColor`) -- ale zamiast kopiowac, zaimplementujemy prosty parser inline w komponencie.

Struktura sekcji w UI:

```text
[Kolorowy pasek naglowka: "OSOBA -- MICHAL MATEJKA"]
  Kariera i rola
  Michal Franciszek Matejka (ur. ok. 1991 r.)...
  ...

[Kolorowy pasek naglowka: "FIRMA -- EMMA MARKET"]
  ...
```

Kazda sekcja to `div` z:
- Kolorowym `bg-*` naglowkiem (rounded-t)
- Bialym/szarym tlem z prosem do renderowania Markdown wewnatrz sekcji
- Marginesem miedzy sekcjami

Plik do modyfikacji: `src/components/deals-team/ProspectAIBriefDialog.tsx`
