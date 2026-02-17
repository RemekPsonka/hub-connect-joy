
# Poprawa algorytmu wyszukiwania duplikatow

## Problem
Algorytm grupuje kontakty jako duplikaty na podstawie samego emaila lub telefonu, ignorujac roznice w imionach. Przyklad: "Piotr Frycz" i "Pawel Frycz" maja ten sam email `pfrycz@chemet.com.pl`, ale to rozne osoby -- nie powinny byc traktowane jako duplikaty.

## Rozwiazanie
Dodac warunek: kontakty z tym samym emailem/telefonem sa duplikatami **tylko jesli maja takie samo imie** (lub jedno z nich nie ma imienia). Jesli imiona sie roznia, pomijamy grupe.

## Szczegoly techniczne

### Plik: `src/hooks/useDuplicateCheck.ts`

**Duplikaty po emailu (linie 153-164)**: Po zgrupowaniu kontaktow po emailu, przed dodaniem grupy do wynikow, odfiltrowac grupy gdzie kontakty maja rozne imiona:

```typescript
emailMap.forEach((contactList, email) => {
  if (contactList.length > 1) {
    // Sprawdz czy wszystkie kontakty maja to samo imie (lub brak imienia)
    const firstNames = new Set(
      contactList
        .map(c => c.first_name?.toLowerCase().trim())
        .filter(Boolean)
    );
    // Jesli sa rozne imiona -> to nie duplikaty
    if (firstNames.size > 1) return;

    const key = `email:${email}`;
    if (!processedKeys.has(key)) {
      processedKeys.add(key);
      duplicateGroups.push({ type: 'email', key: email, contacts: contactList });
    }
  }
});
```

**Duplikaty po telefonie (analogiczna zmiana, ok. linia 182-200)**: Ten sam warunek -- jesli kontakty z tym samym telefonem maja rozne imiona, pomijamy grupe.

**Duplikaty po nazwisku (linie ~210-230)**: Tu nie trzeba zmieniac -- grupowanie po pelnym imieniu i nazwisku z definicji wymaga zgodnosci imion.

## Efekt
- "Piotr Frycz" i "Pawel Frycz" z tym samym emailem nie beda juz pokazywani jako duplikaty
- Kontakty z identycznym imieniem i emailem/telefonem nadal beda wykrywane
- Kontakty bez imienia beda nadal dopasowywane (brak imienia nie blokuje)
