
# Przyciski "To ta osoba" / "To nie ta osoba" przy sugestiach AI

## Cel
Przy kazdej sugestii AI (np. "Marek Warzecha (Ponar wadowice)") dodac dwa przyciski akcji:
- **"To ta osoba!"** -- natychmiast dopasowuje kontakt z bazy do wpisu wanted (zmienia status na `fulfilled`, ustawia `matched_contact_id`)
- **"To nie ta osoba"** -- ukrywa sugestie z listy (lokalnie), zeby nie przeszkadzala

Dzieki temu uzytkownik moze szybko potwierdzic lub odrzucic sugestie AI bez otwierania osobnego dialogu. Nawet jesli kontakt jest "zimny", dopasowanie oznacza ze wiemy kto to jest -- dalsze ocieplanie to oddzielny krok.

## Zmiany

### 1. `src/components/wanted/WantedAISuggestions.tsx`
- Dodac stan `dismissedIds: Set<string>` do przechowywania odrzuconych sugestii (lokalnie, na czas sesji)
- Przy kazdej sugestii dodac dwa przyciski:
  - **Zielony check** ("To ta osoba!") -- wywoluje `useMatchWantedContact()` z `wantedId` i `contactId` sugestii
  - **Szary X** ("To nie ta osoba") -- dodaje ID do `dismissedIds`, sugestia znika z listy
- Filtrowac sugestie przez `dismissedIds` przed renderowaniem
- Po kliknieciu "To ta osoba!" pokazac krotki loading spinner na przycisku

### 2. Szczegoly techniczne

Obecny wyglad wiersza sugestii:
```
Marek Warzecha (Ponar wadowice)     [b/d]
```

Nowy wyglad:
```
Marek Warzecha (Ponar wadowice)  [v To ta!] [x Nie] [b/d]
```

Kod w `WantedAISuggestions.tsx`:
```tsx
// Nowe importy
import { useMatchWantedContact } from '@/hooks/useWantedContacts';
import { Check, X, Loader2 } from 'lucide-react';

// Nowe stany
const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
const [matchingId, setMatchingId] = useState<string | null>(null);
const matchMutation = useMatchWantedContact();

// Filtrowanie
const visibleSuggestions = suggestions.filter(s => !dismissedIds.has(s.id));

// Handler dopasowania
const handleQuickMatch = (contactId: string) => {
  setMatchingId(contactId);
  matchMutation.mutate(
    { wantedId, contactId },
    { onSettled: () => setMatchingId(null) }
  );
};

// Handler odrzucenia
const handleDismiss = (id: string) => {
  setDismissedIds(prev => new Set(prev).add(id));
};
```

Wiersz sugestii:
```tsx
<div key={s.id} className="flex items-center justify-between gap-2 text-xs">
  <span className="min-w-0 truncate">
    <Link ...>{s.full_name}</Link>
    {s.company && <span>({s.company})</span>}
  </span>
  <div className="flex items-center gap-1 shrink-0">
    <Button size="sm" variant="ghost"
      className="h-6 px-1.5 text-[10px] text-green-600 hover:bg-green-50"
      onClick={() => handleQuickMatch(s.id)}
      disabled={matchingId === s.id}>
      {matchingId === s.id
        ? <Loader2 className="h-3 w-3 animate-spin" />
        : <><Check className="h-3 w-3" /> To ta!</>}
    </Button>
    <Button size="sm" variant="ghost"
      className="h-6 px-1.5 text-[10px] text-muted-foreground"
      onClick={() => handleDismiss(s.id)}>
      <X className="h-3 w-3" />
    </Button>
    <Badge variant="outline" className="text-[10px]">{s.position || 'b/d'}</Badge>
  </div>
</div>
```

- Aktualizacja licznika w naglowku: uzyc `visibleSuggestions.length` zamiast `suggestions.length`
- Jesli `visibleSuggestions.length === 0`, ukryc cala sekcje

### 3. Usuniecie nieuzywanych elementow
- `MatchWantedDialog` w `WantedAISuggestions` nie jest aktualnie uzywany (stan `matchOpen` nigdy nie jest ustawiany na `true` przez UI). Mozna go usunac z tego komponentu -- jest juz w `WantedContactCard`.

## Pliki do zmiany
1. `src/components/wanted/WantedAISuggestions.tsx` -- dodanie przyciskow, stanow, logiki dopasowania/odrzucania
