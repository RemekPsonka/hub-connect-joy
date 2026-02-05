
# Plan: Włączenie strictNullChecks w TypeScript

## Podsumowanie

Włączenie opcji `strictNullChecks` w konfiguracji TypeScript i naprawa wynikających błędów w 7 kluczowych plikach (hooks i context). Plik `src/lib/supabase.ts` nie istnieje - klient Supabase jest w `src/integrations/supabase/client.ts` (auto-generowany, nie do edycji).

---

## Krok 1: Modyfikacja tsconfig.app.json

```json
{
  "compilerOptions": {
    "strictNullChecks": true
    // reszta bez zmian
  }
}
```

---

## Krok 2: Analiza i naprawa plików

### 2.1 src/contexts/AuthContext.tsx

**Potencjalne błędy:**
- `director` i `assistant` mogą być `null` - już obsłużone w typach
- `session?.user` - już używa optional chaining
- `user.id` w callbacks - może wymagać null check

**Naprawy:**
```typescript
// Linia ~63: fetchDirector/fetchAssistant może zwracać null
// Już obsłużone poprawnie z async/await

// Linia ~100: director może być null przy sprawdzaniu MFA
// Dodać null check przed dostępem
```

---

### 2.2 src/hooks/useContacts.ts

**Potencjalne błędy:**
- `tenantId` może być `undefined` - już obsłużone przez `enabled: !!tenantId`
- `assistant?.allowed_group_ids` - już używa optional chaining
- `data` z query może być `null`

**Naprawy:**
```typescript
// Linia 90: count może być null
count: count ?? 0  // już tak jest

// Linia 477-485: company?.created check
// Już poprawnie z optional chaining
```

---

### 2.3 src/hooks/useCompanies.ts

**Potencjalne błędy:**
- `director?.tenant_id` - używane z optional chaining
- `companies?.find()` - może zwrócić undefined
- `contactsToUpdate?.length` - wymaga null check

**Naprawy:**
```typescript
// Linia 100: contactsData może być null
for (const contact of contactsData || []) {

// Linia 279: director?.tenant_id
if (!director?.tenant_id) return [];

// Linia 340: contactsToUpdate może być undefined
if (!contactsToUpdate?.length) return { updated: 0 };
```

---

### 2.4 src/hooks/useTasks.ts

**Potencjalne błędy:**
- `taskContacts?.forEach` - wymaga null check
- `crossTasksA?.forEach` - wymaga null check
- `directTasks?.forEach` - wymaga null check

**Naprawy:**
```typescript
// Linia 103-105: już używa optional chaining z ?.forEach
taskContacts?.forEach(tc => tc.task_id && allTaskIds.add(tc.task_id));

// Linia 334: directTasks?.forEach - już poprawne
directTasks?.forEach(tc => {

// Linia 371: sortowanie po dacie - created_at może być null
new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
```

---

### 2.5 src/hooks/useAnalytics.ts

**Potencjalne błędy:**
- Wszystkie `result.data || []` - już poprawne
- `director?.tenant_id` - już z optional chaining
- `response.data?.insights` - wymaga null check

**Naprawy:**
```typescript
// Linia 194-202: już poprawnie z || []
const contacts = contactsResult.data || [];

// Linia 311: response.data może być undefined
setAiInsights(response.data?.insights || []);
```

---

### 2.6 src/hooks/useSemanticSearch.ts

**Potencjalne błędy:**
- `user` może być null po getUser()
- `director` może być null
- `data` z rpc może być null

**Naprawy:**
```typescript
// Linia 46-50: user null check - już jest
if (!user) {
  setError('Wymagane zalogowanie');
  return [];
}

// Linia 55-58: director null check - już jest
if (!director) {
  setError('Nie znaleziono konta użytkownika');
  return [];
}

// Linia 90: data może być null
const searchResults: SearchResult[] = (data || []).map(...);
```

---

### 2.7 src/hooks/useInsuranceRisk.ts

**Potencjalne błędy:**
- `assessment?.id` - już z optional chaining
- `tenantId` może być undefined - obsłużone przez `enabled`
- `result` z invoke może być null

**Naprawy:**
```typescript
// Linia 130: result może być null
if (error) throw error;
return result as AIAnalysisResult | null;

// Linia 65: data z maybeSingle() może być null - już obsłużone
if (!data) return null;
```

---

## Krok 3: src/lib/supabase.ts

**Status:** Plik NIE ISTNIEJE. Klient Supabase znajduje się w `src/integrations/supabase/client.ts` i jest auto-generowany - nie wymaga edycji.

---

## Podsumowanie zmian

| # | Plik | Szacowana liczba błędów | Strategia |
|---|------|-------------------------|-----------|
| 1 | tsconfig.app.json | 0 | Dodanie flagi |
| 2 | AuthContext.tsx | 0-2 | Optional chaining już użyte |
| 3 | useContacts.ts | 0-3 | Nullish coalescing już użyte |
| 4 | useCompanies.ts | 2-5 | Nullish coalescing, optional chaining |
| 5 | useTasks.ts | 2-4 | Null checks dla created_at |
| 6 | useAnalytics.ts | 0-2 | Już poprawnie obsłużone |
| 7 | useSemanticSearch.ts | 0-2 | Już ma null checks |
| 8 | useInsuranceRisk.ts | 1-2 | Return type fix |

**Szacowana całkowita liczba błędów do naprawy:** 10-20 w tych plikach

---

## Strategia naprawy

1. **Preferowane:** `value ?? defaultValue` (nullish coalescing)
2. **Dla obiektów:** `obj?.property` (optional chaining)
3. **Dla warunków:** `if (value) { ... }` (explicit check)
4. **Ostateczność:** `value!` (non-null assertion) - tylko gdy 100% pewność

---

## Co pozostaje bez zmian

- `useSemanticSearch` - wyszukiwanie musi być fresh (bez staleTime)
- Wszystkie mutacje (`useMutation`) - nie dotyczą
- Edge Functions - nie ruszamy
- Baza danych - nie ruszamy
- Komponenty .tsx (oprócz AuthContext)
- `src/integrations/supabase/client.ts` - auto-generowany

---

## Uwaga

Po włączeniu `strictNullChecks` mogą pojawić się błędy w INNYCH plikach projektu (poza listą 7 plików). Te błędy zostaną zignorowane w tym kroku - naprawimy tylko core hooks i context. Pozostałe błędy wylistuję po zmianach.
