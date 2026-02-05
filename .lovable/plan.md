
# Plan: TypeScript Strict Mode dla Core Files

## Cel
Wlaczenie strict mode dla katalogow `src/lib/` i `src/utils/` oraz naprawienie bledow kompilacji.

---

## Zmiana 1: tsconfig.app.json

**Plik:** `tsconfig.app.json`

Zmiana flag kompilacji:

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true
    // reszta bez zmian
  }
}
```

**Uwaga:** strict mode zostanie wlaczony globalnie, ale poprawki robimy tylko dla `src/lib/` i `src/utils/`. Bledy w innych katalogach beda widoczne, ale nie bedziemy ich naprawiac w tym sprincie.

---

## Zmiana 2: src/lib/utils.ts (linia 22)

Zamiana `as any` na bezpieczne typowanie:

**PRZED:**
```typescript
return (first as any).nazwa || (first as any).wartosc || (first as any).value || String(first);
```

**PO:**
```typescript
const obj = first as Record<string, unknown>;
return String(obj.nazwa ?? obj.wartosc ?? obj.value ?? first);
```

---

## Zmiana 3: src/utils/exportAgentProfile.ts

### Linia 307, 357, 388, 418, 446
Zamiana `(doc as any).lastAutoTable` na poprawny typ:

**Dodac na poczatku pliku (po importach):**
```typescript
interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: { finalY: number };
}
```

**Zmienic tworzenie doc:**
```typescript
const doc = new jsPDF({...}) as jsPDFWithAutoTable;
```

---

## Zmiana 4: src/utils/exportCompanyAnalysis.ts

### Linia 59 - formatMergers
**PRZED:**
```typescript
function formatMergers(mergers: any): string {
```

**PO:**
```typescript
interface MergerRecord {
  year?: number | string;
  details?: string;
  type?: string;
}

function formatMergers(mergers: string | string[] | MergerRecord[] | undefined): string {
```

### Linia 115 - parseProducts
**PRZED:**
```typescript
function parseProducts(products: any): Array<{ name: string; description?: string }> {
```

**PO:**
```typescript
interface ProductRecord {
  name?: string;
  description?: string;
}

function parseProducts(products: string | string[] | ProductRecord[] | undefined): Array<{ name: string; description?: string }> {
```

### Linia 127 - parseManagement
**PRZED:**
```typescript
function parseManagement(management: any): Array<{ name: string; position: string }> {
```

**PO:**
```typescript
interface ManagementRecord {
  name?: string;
  position?: string;
  role?: string;
}

function parseManagement(management: string | string[] | ManagementRecord[] | undefined): Array<{ name: string; position: string }> {
```

### Linia 139 - parseCompetitors
**PRZED:**
```typescript
function parseCompetitors(competitors: any): Array<{ name: string; strength?: string; weakness?: string }> {
```

**PO:**
```typescript
interface CompetitorRecord {
  name?: string;
  company_name?: string;
  strength?: string;
  strengths?: string;
  weakness?: string;
  weaknesses?: string;
}

function parseCompetitors(competitors: CompetitorRecord[] | undefined): Array<{ name: string; strength?: string; weakness?: string }> {
```

### Linia 154 - parseLocations
**PRZED:**
```typescript
function parseLocations(locations: any): Array<{ type: string; city: string; address?: string }> {
```

**PO:**
```typescript
interface LocationRecord {
  type?: string;
  location_type?: string;
  city?: string;
  address?: string;
}

function parseLocations(locations: string[] | LocationRecord[] | undefined): Array<{ type: string; city: string; address?: string }> {
```

### Linia 169 - parseNews
**PRZED:**
```typescript
function parseNews(news: any): Array<{ date?: string; title: string; summary?: string }> {
```

**PO:**
```typescript
interface NewsRecord {
  date?: string;
  published_at?: string;
  title?: string;
  headline?: string;
  summary?: string;
  description?: string;
}

function parseNews(news: string | string[] | NewsRecord[] | undefined): Array<{ date?: string; title: string; summary?: string }> {
```

### Linia 185 - parseTimeline
**PRZED:**
```typescript
function parseTimeline(timeline: any): Array<{ year: string; event: string }> {
```

**PO:**
```typescript
interface TimelineRecord {
  year?: number | string;
  date?: string;
  event?: string;
  description?: string;
  title?: string;
}

function parseTimeline(timeline: TimelineRecord[] | undefined): Array<{ year: string; event: string }> {
```

---

## Pliki BEZ ZMIAN

Nastepujace pliki juz maja poprawne typowanie:
- `src/utils/bugFixPrompt.ts`
- `src/utils/crossTaskStatus.ts`
- `src/utils/exportReports.ts`
- `src/utils/passwordValidation.ts`
- `src/utils/exportInsuranceBrief.ts`

---

## Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `tsconfig.app.json` | Wlaczenie `strict: true`, `noImplicitAny: true` |
| `src/lib/utils.ts` | Zamiana `as any` na `Record<string, unknown>` |
| `src/utils/exportAgentProfile.ts` | Dodanie interfejsu `jsPDFWithAutoTable` |
| `src/utils/exportCompanyAnalysis.ts` | Zdefiniowanie 6 interfejsow dla funkcji parsujacych |

---

## Wazne uwagi

1. Po wlaczeniu strict mode moga pojawic sie bledy w innych katalogach (components, hooks, pages) - to jest oczekiwane i bedzie naprawione w kolejnych sprintach
2. Uzywamy `unknown` zamiast `any` gdzie to mozliwe
3. Dla obiektow z zewnetrznych API (KRS, jsPDF) definiujemy wlasne interfejsy
4. Kompilacja `src/lib/` i `src/utils/` musi przejsc bez bledow
