
# Plan: Centralizacja funkcji do czyszczenia stringów

## Cel
Przenieść wszystkie funkcje `safeString`, `safeArray`, `safeNumber`, `safeAwardArray` oraz `normalizeNotes` do centralnego pliku `src/lib/utils.ts` i zaktualizować importy we wszystkich plikach.

---

## Zakres zmian

### 1. Rozszerzenie `src/lib/utils.ts`

Dodanie wszystkich funkcji z `src/components/company/utils.ts` + nowej funkcji `normalizeNotes`:

| Funkcja | Opis |
|---------|------|
| `safeString` | Uniwersalna wersja obsługująca null, tablice i obiekty |
| `safeArray` | Konwersja do tablicy stringów |
| `safeNumber` | Konwersja do liczby z obsługą polskiego formatowania |
| `safeAwardArray` | Specjalna obsługa nagród/certyfikatów |
| `normalizeNotes` | Normalizacja null/undefined do pustego stringa |

### 2. Aktualizacja importów

| Plik | Zmiana |
|------|--------|
| `src/components/company/utils.ts` | Usunięcie pliku (pełna zawartość przeniesiona) |
| `src/components/company/SourceDataViewer.tsx` | Usunięcie lokalnej `safeString`, import z `@/lib/utils` |
| `src/components/company/sections/BasicInfoSection.tsx` | Zmiana importu na `@/lib/utils` |
| `src/components/company/sections/ManagementSection.tsx` | Zmiana importu na `@/lib/utils` |
| `src/components/company/sections/OfferSection.tsx` | Zmiana importu na `@/lib/utils` |
| `src/components/company/sections/FinancialDashboard.tsx` | Zmiana importu na `@/lib/utils` |
| `src/components/contacts/ContactNotesTab.tsx` | Usunięcie lokalnej `normalizeNotes`, import z `@/lib/utils` |
| `src/components/consultations/ConsultationNotesSection.tsx` | Usunięcie lokalnej `normalizeNotes`, import z `@/lib/utils` |

### 3. Specjalny przypadek: SourceDataViewer.tsx

Lokalna wersja `safeString` w tym pliku ma inne zachowanie (zwraca `null` zamiast `""`). 

**Rozwiązanie:** Utworzenie lokalnej funkcji `extractKrsField` która używa centralnej `safeString` jako fallback:

```typescript
// Specjalna ekstrakcja dla KRS - sprawdza klucze specyficzne dla KRS
const extractKrsField = (value: any): string | null => {
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    return value?.sposobReprezentacji || value?.opis || value?.nazwa || null;
  }
  return null;
};
```

---

## Szczegóły techniczne

### Nowy plik `src/lib/utils.ts`:

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely converts values that might be objects from KRS API to strings
 */
export const safeString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  // ... (pełna implementacja z company/utils.ts)
};

export const safeArray = (value: unknown): string[] => { ... };
export const safeNumber = (value: unknown): number | undefined => { ... };
export const safeAwardArray = (value: unknown): string[] => { ... };

/**
 * Normalizes null/undefined to empty string for form comparisons
 */
export const normalizeNotes = (value: string | null | undefined): string => value || '';
```

---

## Pliki do modyfikacji

| # | Plik | Akcja |
|---|------|-------|
| 1 | `src/lib/utils.ts` | Dodanie funkcji |
| 2 | `src/components/company/utils.ts` | Usunięcie |
| 3 | `src/components/company/SourceDataViewer.tsx` | Usunięcie lokalnej funkcji, rename do `extractKrsField` |
| 4 | `src/components/company/sections/BasicInfoSection.tsx` | Zmiana importu |
| 5 | `src/components/company/sections/ManagementSection.tsx` | Zmiana importu |
| 6 | `src/components/company/sections/OfferSection.tsx` | Zmiana importu |
| 7 | `src/components/company/sections/FinancialDashboard.tsx` | Zmiana importu |
| 8 | `src/components/contacts/ContactNotesTab.tsx` | Usunięcie lokalnej funkcji, import z utils |
| 9 | `src/components/consultations/ConsultationNotesSection.tsx` | Usunięcie lokalnej funkcji, import z utils |

---

## Poza zakresem (zgodnie z instrukcją)

- Edge Functions (`supabase/functions/`) - bez zmian
- Baza danych - bez zmian
- Funkcje `sanitizePolish` i `s()` w plikach eksportu PDF - pozostają lokalne (specyficzne dla PDF, używają jsPDF)

---

## Ryzyko

**Niskie** — zmiana dotyczy tylko organizacji kodu, bez zmiany logiki biznesowej.
