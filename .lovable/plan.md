
# Plan naprawy okna AI Remek

## Zidentyfikowane problemy

Na podstawie screenshota i kodu widać:

1. **Brak scrollowania** — okno ma stałą wysokość `h-80` (320px), ale ScrollArea nie działa poprawnie
2. **Za wąskie okno** — obecna szerokość to `w-96` (384px)
3. **Brak aktywnych linków** — ReactMarkdown nie renderuje linków jako klikalne elementy z nawigacją

---

## Planowane zmiany

### 1. Poszerzenie okna o ~30%

```
Obecna szerokość: w-96 (384px)
Nowa szerokość:   w-[500px] (~30% więcej)
```

### 2. Zwiększenie wysokości obszaru wiadomości

```
Obecna wysokość: h-80 (320px)  
Nowa wysokość:   h-[450px] (lepszy scroll)
```

### 3. Naprawienie ScrollArea

- Dodanie `overflow-y-auto` jako fallback
- Upewnienie się, że viewport ma poprawną wysokość

### 4. Aktywne linki w tekście

Dodanie do ReactMarkdown komponentu `a` (link), który:
- Rozpoznaje linki wewnętrzne (np. `/contacts`, `/companies`)
- Używa `useNavigate()` do nawigacji bez przeładowania strony
- **NIE zamyka okna czatu** po kliknięciu
- Linki zewnętrzne otwiera w nowej karcie

```typescript
a: ({ href, children }) => {
  const navigate = useNavigate();
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (href?.startsWith('/')) {
      // Nawigacja wewnętrzna - bez zamykania okna
      navigate(href);
    } else if (href) {
      // Link zewnętrzny - nowa karta
      window.open(href, '_blank');
    }
  };
  
  return (
    <a 
      href={href} 
      onClick={handleClick}
      className="text-primary underline hover:text-primary/80 cursor-pointer"
    >
      {children}
    </a>
  );
}
```

### 5. Mapowanie słów kluczowych na linki

AI Remek będzie mógł używać markdown linków w odpowiedziach:
- `[Kontakty](/contacts)` → klikalne "Kontakty" 
- `[Ubezpieczenia](/pipeline)` → klikalne "Ubezpieczenia"
- `[Ustawienia](/settings)` → klikalne "Ustawienia"

---

## Plik do modyfikacji

`src/components/remek/RemekChatWidget.tsx`

---

## Zmiany w kodzie

| Element | Przed | Po |
|---------|-------|-----|
| Szerokość panelu | `w-96` | `w-[500px]` |
| Wysokość ScrollArea | `h-80` | `h-[450px]` |
| Linki w markdown | brak | aktywne z nawigacją |
| Import | — | `+ useNavigate` |

---

## Zachowanie po zmianach

1. ✅ Okno szersze o ~30% (500px vs 384px)
2. ✅ Obszar wiadomości wyższy i scrollowalny
3. ✅ Kliknięcie w link np. "Kontakty" → nawigacja do `/contacts`
4. ✅ Okno AI pozostaje otwarte po kliknięciu w link
5. ✅ Zamknięcie tylko przez X w headerze
