
# Uproszczenie formularza WantedContactModal

## Zmiany

Plik: `src/components/wanted/WantedContactModal.tsx`

1. **Usunac taby Osoba/Firma** -- wszystkie pola w jednym oknie, bez przelaczania
2. **Usunac pola**: Email, Telefon, LinkedIn (oraz ich state)
3. **Usunac nieuzywane importy**: `Tabs, TabsContent, TabsList, TabsTrigger`, ikony `User, Building2`

Nowy uklad formularza (jedno okno):
- **Kto szuka** (ConnectionContactSelect)
- **Kogo szukamy** (sekcja):
  - Imie i nazwisko + Stanowisko (grid 2 kolumny)
  - Opis osoby (textarea)
  - NIP + REGON (grid 2 kolumny, z auto-lookup)
  - Nazwa firmy + Branza (grid 2 kolumny)
  - Opis roli w firmie (textarea)
- **Dodatkowe**:
  - Kontekst poszukiwania (textarea)
  - Pilnosc (select)
  - Notatki wewnetrzne (textarea)

Walidacja: przynajmniej `personName` lub `companyName` musi byc wypelnione (bez zmian w logice).

Hook `useCreateWantedContact` -- pola `person_email`, `person_phone`, `person_linkedin` wysylane jako `null` (kolumny w bazie zostaja, po prostu nie uzywane w formularzu).
