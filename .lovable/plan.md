
# Plan: Zachowanie stanu widżetu AI Remek przy nawigacji

## Problem
Gdy otworzysz widżet AI Remka i przejdziesz na inną stronę, widget się zamyka. Dzieje się tak dlatego, że stan "otwarty/zamknięty" jest zapisywany lokalnie w komponencie i resetuje się przy każdej zmianie strony.

## Rozwiązanie
Stworzymy globalny kontekst, który zapamiętuje czy widget jest otwarty. Dzięki temu nawigując między stronami, widget pozostanie w tym samym stanie.

---

## Kroki implementacji

### Krok 1: Utworzenie kontekstu dla widżetu Remka
Nowy plik: `src/contexts/RemekWidgetContext.tsx`

Kontekst będzie zarządzał:
- Czy widget jest otwarty (`isOpen`)
- Funkcje do otwierania/zamykania

Stan będzie dodatkowo zapisywany w `sessionStorage`, żeby przetrwał nawet odświeżenie strony w trakcie sesji.

### Krok 2: Dodanie providera do aplikacji
Plik: `src/App.tsx`

Opakujemy całą aplikację w `RemekWidgetProvider`, żeby kontekst był dostępny wszędzie.

### Krok 3: Aktualizacja widżetu Remka
Plik: `src/components/remek/RemekChatWidget.tsx`

Zamiast lokalnego `useState(false)`, komponent użyje globalnego stanu z kontekstu.

---

## Szczegóły techniczne

```text
┌─────────────────────────────────────────────┐
│               App.tsx                        │
│  ┌─────────────────────────────────────┐    │
│  │     RemekWidgetProvider             │    │
│  │  ┌───────────────────────────────┐  │    │
│  │  │       AppLayout               │  │    │
│  │  │  ┌─────────────────────────┐  │  │    │
│  │  │  │   <Outlet /> (strony)   │  │  │    │
│  │  │  └─────────────────────────┘  │  │    │
│  │  │  ┌─────────────────────────┐  │  │    │
│  │  │  │   RemekChatWidget       │  │  │    │
│  │  │  │   (czyta isOpen z       │  │  │    │
│  │  │  │    kontekstu)           │  │  │    │
│  │  │  └─────────────────────────┘  │  │    │
│  │  └───────────────────────────────┘  │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

### Nowy plik kontekstu:
```typescript
// src/contexts/RemekWidgetContext.tsx
const RemekWidgetContext = createContext({ isOpen: false, ... });

export function RemekWidgetProvider({ children }) {
  // Stan zapisywany w sessionStorage
  const [isOpen, setIsOpen] = useState(() => {
    return sessionStorage.getItem('remek_widget_open') === 'true';
  });
  
  // Synchronizacja z sessionStorage
  useEffect(() => {
    sessionStorage.setItem('remek_widget_open', String(isOpen));
  }, [isOpen]);
  
  return (
    <RemekWidgetContext.Provider value={{ isOpen, setIsOpen, toggle }}>
      {children}
    </RemekWidgetContext.Provider>
  );
}
```

### Zmiany w widżecie:
```typescript
// RemekChatWidget.tsx
export function RemekChatWidget() {
  // Zamiast: const [isOpen, setIsOpen] = useState(false);
  const { isOpen, setIsOpen } = useRemekWidget(); // ← z kontekstu
  
  // Reszta kodu bez zmian...
}
```

---

## Pliki do modyfikacji

| Plik | Akcja |
|------|-------|
| `src/contexts/RemekWidgetContext.tsx` | **Utworzyć** - nowy kontekst |
| `src/App.tsx` | **Edytować** - dodać provider |
| `src/components/remek/RemekChatWidget.tsx` | **Edytować** - użyć kontekstu |

---

## Efekt końcowy
Po wdrożeniu:
- Otwierasz Remka na stronie kontaktów
- Przechodzisz na Dashboard
- Widget Remka pozostaje otwarty
- Rozmowa jest kontynuowana (historia ładowana z bazy)
- Nawet po odświeżeniu strony widget pozostanie otwarty (sessionStorage)
