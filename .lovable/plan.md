
# Naprawa zapisu numeru komorkowego

## Problem
Numer komorkowy z wizytowki jest tracony podczas scalania (merge) duplikatow. Konkretnie:

1. OCR rozpoznaje dwa numery: stacjonarny (`phone`) i komorkowy (`mobile`)
2. `toExtendedContact` poprawnie ustawia: `phone = mobile`, `phone_business = phone`
3. Ale `merge-contacts` edge function (linia 80-86) przekierowuje `newContactData.phone` do `phone_business` zamiast uzupelnic `phone`
4. Poniewaz `phone_business` juz istnieje -- numer komorkowy jest calkowicie odrzucany

Dodatkowy problem: edge function NIGDY nie aktualizuje `phone` -- nawet gdy jest pusty w istniejacym kontakcie.

## Rozwiazanie

### 1. Poprawka merge-contacts edge function

**Plik:** `supabase/functions/merge-contacts/index.ts`

Zmiana sekcji PHONE HANDLING (linie 77-92):

```
// PHONE HANDLING
// phone = numer prywatny/komorkowy (priorytet)
// phone_business = numer sluzbowy/stacjonarny

// Fill phone (mobile) if empty on existing contact
if (newContactData.phone && !existingContact.phone) {
  mergedData.phone = newContactData.phone;
}

// Fill phone_business if empty on existing contact
if (newContactData.phone_business && !existingContact.phone_business) {
  mergedData.phone_business = newContactData.phone_business;
}
```

Kluczowa zmiana: `phone` z nowych danych trafia do `phone` (nie do `phone_business`), a `phone_business` jest obslugiwany osobno.

### 2. Poprawka mapowania w useAIImport.ts

**Plik:** `src/hooks/useAIImport.ts`

W sekcji merge (linia 910-928) -- upewnienie sie ze `phone` i `phone_business` sa wysylane jako oddzielne pola, bez przekierowania:

```typescript
await mergeContacts(contact.duplicate_contact_id, {
  ...
  phone: contact.phone || undefined,
  phone_business: contact.phone_business || undefined,
  ...
});
```

To juz jest poprawne, wiec glowna zmiana jest w edge function.

## Pliki do modyfikacji

1. `supabase/functions/merge-contacts/index.ts` -- poprawka logiki scalania telefonow
