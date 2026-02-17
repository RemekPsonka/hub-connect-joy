
# Pomijanie kontaktow "bez nazwy" w algorytmie duplikatow

## Problem
Kontakty bez imienia i nazwiska ("bez nazwy") sa grupowane jako duplikaty, mimo ze to rozne kontakty. Dzieje sie tak, poniewaz:
- W grupowaniu po emailu/telefonie, gdy zaden kontakt nie ma imienia, `firstNames.size` wynosi 0 (wszystkie puste wartosci sa odfiltrowane), wiec warunek `> 1` nie blokuje grupy
- W grupowaniu po nazwisku, kontakty bez `first_name` i `last_name` nie sa brane pod uwage (to juz dziala poprawnie)

## Rozwiazanie
Dodac warunek: jesli **wszystkie** kontakty w grupie nie maja imienia (firstNames.size === 0), pomijamy grupe -- to sa rozne kontakty, nie duplikaty.

## Szczegoly techniczne

### Plik: `src/hooks/useDuplicateCheck.ts`

**Duplikaty po emailu (linia 233)** -- dodac warunek pomijania grup bez imion:
```typescript
// Obecny kod:
if (firstNames.size > 1) return;

// Nowy kod:
if (firstNames.size > 1) return;
if (firstNames.size === 0) return; // Brak imion = rozne kontakty, pomijaj
```

**Duplikaty po telefonie (linia 269)** -- ta sama zmiana:
```typescript
if (firstNames.size > 1) return;
if (firstNames.size === 0) return; // Brak imion = rozne kontakty, pomijaj
```

To wyeliminuje grupe 22 kontaktow "bez nazwy" z wynikow duplikatow.
