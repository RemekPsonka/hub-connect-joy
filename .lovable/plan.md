

# Naprawa przewijania w oknie "Znajdz i scal duplikaty"

## Problem
Komponent `ScrollArea` z Radix UI nie przewija zawartosci, poniewaz jego wewnetrzny `Viewport` nie otrzymuje ograniczenia wysokosci. Klasa `flex-1 min-h-0` nie dziala poprawnie z architektura Radix ScrollArea.

## Rozwiazanie
Zastapic `ScrollArea` zwyklym `div` z `overflow-y-auto` i ograniczeniem wysokosci. To najprostsze i najbardziej niezawodne podejscie.

## Szczegoly techniczne

### Plik: `src/components/contacts/FindDuplicatesModal.tsx`

**Linia 169**: Zamienic:
```tsx
<ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
```
na:
```tsx
<div className="overflow-y-auto -mx-6 px-6" style={{ maxHeight: 'calc(80vh - 200px)' }}>
```

**Linia 298**: Zamienic zamykajacy tag:
```tsx
</ScrollArea>
```
na:
```tsx
</div>
```

Usuniecie nieuzywanych importow `ScrollArea` z poczatku pliku (linia 12), jezeli nie jest uzywany nigdzie indziej w tym pliku.

To da przewijalny kontener z wysokoscia dopasowana do okna dialogowego (80vh minus ~200px na naglowek, statystyki i przyciski).

