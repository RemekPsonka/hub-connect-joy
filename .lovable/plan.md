

# Plan: Zod Validation dla 5 Edge Functions (PROMPT 6.4)

## Cel
Dodanie walidacji Zod do kolejnych 5 edge functions dla bezpieczenstwa i lepszego error handlingu.

---

## Uwaga
Dwie funkcje z promptu nie istnieja w projekcie:
- `analyze-company-structure` - brak
- `update-contact-embeddings` - brak

Zastepuje je istniejacymi funkcjami o podobnym przeznaczeniu:
- `scrape-company-logo` 
- `generate-embedding`

---

## Zmiana 1: synthesize-company-profile/index.ts

**Linia 1** - Dodac import Zod:
```typescript
import { z } from "npm:zod@3.23.8";
```

**Przed Deno.serve()** - Dodac schema:
```typescript
const requestSchema = z.object({
  company_id: z.string().uuid("company_id musi byc poprawnym UUID"),
});
```

**Linia 358** - Zastapic obecna walidacje (przed auth check):
```typescript
// Po CORS check, PRZED auth:
const body = await req.json();
const validation = requestSchema.safeParse(body);

if (!validation.success) {
  return new Response(
    JSON.stringify({ error: "Invalid request", details: validation.error.format() }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

const { company_id } = validation.data;

// Verify authorization (existing code)
const authResult = await verifyAuth(req, supabase);
```

---

## Zmiana 2: create-tenant-user/index.ts

**Linia 1-2** - Dodac import Zod:
```typescript
import { z } from "npm:zod@3.23.8";
```

**Przed serve()** - Dodac schema:
```typescript
const requestSchema = z.object({
  email: z.string().email("Nieprawidlowy email"),
  fullName: z.string().min(2, "Imie min. 2 znaki").max(100, "Imie max 100 znakow"),
  role: z.enum(["director", "assistant"], { errorMap: () => ({ message: "Rola musi byc director lub assistant" }) }),
  tenantId: z.string().uuid("tenantId musi byc poprawnym UUID"),
});
```

**Linia 46-47** - Zastapic obecna walidacje:
```typescript
// Po auth check, przed logika:
const body = await req.json();
const validation = requestSchema.safeParse(body);

if (!validation.success) {
  return new Response(
    JSON.stringify({ error: "Invalid request", details: validation.error.format() }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

const { email, fullName, role, tenantId } = validation.data;
```

---

## Zmiana 3: scan-company-website/index.ts

**Linia 1** - Dodac import Zod:
```typescript
import { z } from "npm:zod@3.23.8";
```

**Przed Deno.serve()** - Dodac schema:
```typescript
const requestSchema = z.object({
  company_id: z.string().uuid("company_id musi byc poprawnym UUID"),
  url: z.string().url("Nieprawidlowy URL").optional(),
  max_pages: z.number().int().min(1).max(50).optional().default(20),
});
```

**Na poczatku serve()** - Dodac walidacje PRZED auth:
```typescript
// Po CORS check:
const body = await req.json();
const validation = requestSchema.safeParse(body);

if (!validation.success) {
  return new Response(
    JSON.stringify({ error: "Invalid request", details: validation.error.format() }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

const { company_id, url, max_pages } = validation.data;
```

---

## Zmiana 4: scrape-company-logo/index.ts

**Linia 1** - Dodac import Zod:
```typescript
import { z } from "npm:zod@3.23.8";
```

**Przed Deno.serve()** - Dodac schema:
```typescript
const requestSchema = z.object({
  companyWebsite: z.string().min(1, "URL strony jest wymagany"),
  companyId: z.string().uuid("companyId musi byc poprawnym UUID").optional(),
});
```

**Linia 28** - Zastapic obecna walidacje:
```typescript
// Po auth check:
const body = await req.json();
const validation = requestSchema.safeParse(body);

if (!validation.success) {
  return new Response(
    JSON.stringify({ error: "Invalid request", details: validation.error.format() }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

const { companyWebsite, companyId } = validation.data;
```

---

## Zmiana 5: generate-embedding/index.ts

**Linia 1-2** - Dodac import Zod:
```typescript
import { z } from "npm:zod@3.23.8";
```

**Przed serve()** - Zastapic interface schema Zod:
```typescript
// Usunac interface EmbeddingRequest, zastapic:
const requestSchema = z.object({
  type: z.enum(["contact", "need", "offer"]).optional(),
  id: z.string().uuid("id musi byc poprawnym UUID").optional(),
  text: z.string().min(3, "Tekst min. 3 znaki").max(10000, "Tekst max 10000 znakow").optional(),
}).refine(
  (data) => (data.text) || (data.type && data.id),
  { message: "Podaj 'text' dla trybu query, lub 'type' i 'id' dla trybu entity" }
);

type EmbeddingRequest = z.infer<typeof requestSchema>;
```

**Linia 43** - Zastapic walidacje:
```typescript
const body = await req.json();
const validation = requestSchema.safeParse(body);

if (!validation.success) {
  return new Response(
    JSON.stringify({ error: "Invalid request", details: validation.error.format() }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

const { type, id, text: providedText } = validation.data;
```

---

## Podsumowanie zmian

| Plik | Walidacja | Kluczowe pola |
|------|-----------|---------------|
| `synthesize-company-profile` | UUID | `company_id` |
| `create-tenant-user` | Email + role enum | `email`, `fullName`, `role`, `tenantId` |
| `scan-company-website` | UUID + optional URL | `company_id`, `url`, `max_pages` |
| `scrape-company-logo` | URL + optional UUID | `companyWebsite`, `companyId` |
| `generate-embedding` | Conditional refine | `type`, `id`, `text` |

---

## Wazne zasady (te same co w 6.3)

1. **Walidacja PRZED auth** - oszczedzamy zasoby
2. **400 Bad Request** - z pelnym Zod error format w `details`
3. **safeParse** - nie rzuca wyjatku
4. **Zachowujemy istniejacy interface** - uzywamy `z.infer<typeof schema>` dla kompatybilnosci
5. **NIE zmieniamy logiki** - tylko walidacja na wejsciu

