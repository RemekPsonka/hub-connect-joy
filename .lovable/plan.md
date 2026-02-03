

# Plan naprawy scrollowania w oknie AI Remek

## Zidentyfikowany problem

Radix UI ScrollArea wymaga poprawnej struktury wysokości:
- **Root** (`ScrollAreaPrimitive.Root`) - musi mieć stałą wysokość
- **Viewport** - dziedziczy wysokość z Root

Obecny kod ma problem:
```tsx
<ScrollArea className="flex-1 h-[450px] overflow-y-auto">
```

`flex-1` sprawia, że element rozciąga się w kontenerze flexbox, ale `h-[450px]` jest nadpisywane. Dodatkowo `overflow-y-auto` na Root nie działa, bo scrollowanie obsługuje Viewport.

---

## Rozwiązanie

Zamiast używać Radix ScrollArea, użyjemy prostego `div` z natywnym scrollowaniem CSS. To rozwiąże problem i będzie działać poprawnie:

### Zmiana w kodzie

**Linia 148 - przed:**
```tsx
<ScrollArea ref={scrollAreaRef} className="flex-1 h-[450px] overflow-y-auto">
```

**Po:**
```tsx
<div 
  ref={scrollAreaRef} 
  className="flex-1 overflow-y-auto"
  style={{ maxHeight: '450px' }}
>
```

### Zmiana w scroll-to-bottom (linie 43-49)

**Przed:**
```tsx
const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
if (scrollContainer) {
  scrollContainer.scrollTop = scrollContainer.scrollHeight;
}
```

**Po:**
```tsx
scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
```

### Usunięcie niepotrzebnego importu

Usunięcie `ScrollArea` z importów (linia 6), ponieważ nie będzie już używany w tym komponencie.

---

## Dlaczego to zadziała

1. **Natywne scrollowanie CSS** - `overflow-y: auto` + `max-height` to sprawdzony pattern
2. **Bezpośredni ref** - nie trzeba szukać Radix Viewport
3. **Prostsze rozwiązanie** - mniej warstw abstrakcji = mniej potencjalnych błędów

---

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/remek/RemekChatWidget.tsx` | Zamiana ScrollArea na div z overflow-y-auto |

