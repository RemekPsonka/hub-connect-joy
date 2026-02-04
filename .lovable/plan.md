
# Plan: Naprawienie nawigacji dla wyników wyszukiwania need/offer

## Podsumowanie

Naprawić nawigację po kliknięciu na wynik typu "need" lub "offer" w wyszukiwarce, tak aby przenosiła do strony kontaktu z automatycznie otwartą odpowiednią zakładką.

---

## Zakres zmian

### 1. Modyfikacja `src/pages/Search.tsx`

**Zmiana w funkcji `handleResultClick`** (linia 74-84):

```typescript
// PRZED:
const handleResultClick = (result: SearchResult) => {
  switch (result.type) {
    case 'contact':
      navigate(`/contacts/${result.id}`);
      break;
    case 'need':
    case 'offer':
      // TODO: Navigate to specific need/offer
      break;
  }
};

// PO:
const handleResultClick = (result: SearchResult) => {
  switch (result.type) {
    case 'contact':
      navigate(`/contacts/${result.id}`);
      break;
    case 'need':
      if (result.contactId) {
        navigate(`/contacts/${result.contactId}?tab=needs-offers`);
      }
      break;
    case 'offer':
      if (result.contactId) {
        navigate(`/contacts/${result.contactId}?tab=needs-offers`);
      }
      break;
  }
};
```

**Uwaga**: Zakładka w ContactDetail nazywa się `needs-offers` (linia 107), nie osobne `needs` i `offers`.

---

### 2. Modyfikacja `src/pages/ContactDetail.tsx`

**Dodanie importu `useSearchParams`**:

```typescript
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
```

**Dodanie odczytu parametru `tab` z URL**:

```typescript
const [searchParams] = useSearchParams();
const tabFromUrl = searchParams.get('tab');
```

**Zmiana `defaultValue` w `Tabs`**:

```typescript
// PRZED:
<Tabs defaultValue={isAssistant ? "agent" : "overview"} className="w-full">

// PO:
const getDefaultTab = () => {
  // Jeśli jest parametr ?tab w URL, użyj go
  if (tabFromUrl && !isAssistant) {
    // Walidacja - sprawdź czy to dozwolona zakładka
    const validTabs = ['overview', 'bi', 'agent', 'ownership', 
                       'needs-offers', 'consultations', 'history', 'tasks', 'notes'];
    if (validTabs.includes(tabFromUrl)) {
      return tabFromUrl;
    }
  }
  // Domyślnie: agent dla asystentów, overview dla dyrektorów
  return isAssistant ? "agent" : "overview";
};

<Tabs defaultValue={getDefaultTab()} className="w-full">
```

---

## Mapowanie zakładek

| Typ wyniku | Parametr URL | Zakładka |
|------------|--------------|----------|
| `need` | `?tab=needs-offers` | "Potrzeby i Oferty" |
| `offer` | `?tab=needs-offers` | "Potrzeby i Oferty" |

Obie nawigują do tej samej zakładki `needs-offers`, ponieważ potrzeby i oferty są wyświetlane razem w jednej zakładce (`ContactNeedsOffersTab`).

---

## Pliki do modyfikacji

| # | Plik | Opis zmiany |
|---|------|-------------|
| 1 | `src/pages/Search.tsx` | Dodanie nawigacji dla `need` i `offer` |
| 2 | `src/pages/ContactDetail.tsx` | Odczyt parametru `?tab` z URL i automatyczne przełączenie zakładki |

---

## Co pozostaje bez zmian

- Logika wyszukiwania (`useSemanticSearch`)
- Scoring i sortowanie wyników
- Edge Functions
- Baza danych
- Pozostałe komponenty

---

## Szczegóły techniczne

### Struktura SearchResult

Hook `useSemanticSearch` już zwraca `contactId` dla wyników typu `need` i `offer`:
```typescript
contactId: item.contact_id || (item.type === 'contact' ? item.id : undefined)
```

### Walidacja zakładki

Dodajemy walidację parametru `tab` aby zapobiec błędom gdy ktoś wpisze nieprawidłową wartość w URL.

### Obsługa asystentów

Asystenci mają ograniczony widok (tylko zakładka "Agent AI"), więc dla nich ignorujemy parametr `?tab` z URL.
