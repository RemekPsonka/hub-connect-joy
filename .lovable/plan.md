
# Plan: Zod Validation dla 5 Edge Functions

## Cel
Dodanie walidacji Zod do 5 najczesciej uzywanych edge functions dla bezpieczenstwa i lepszego error handlingu.

---

## Uwaga wstepna - Import Zod w Deno

W edge functions Deno, Zod importujemy bezposrednio z npm:

```typescript
import { z } from "npm:zod@3.23.8";
```

Nie trzeba modyfikowac import_map.json ani instalowac Zod osobno.

---

## Zmiana 1: generate-contact-profile/index.ts

**Linia 1-3** - Dodac import Zod:
```typescript
import { z } from "npm:zod@3.23.8";
```

**Linia 146-155** - Zastapic obecna walidacje Zod schema:

```typescript
// Dodac przed serve():
const requestSchema = z.object({
  contact_id: z.string().uuid("contact_id musi byc poprawnym UUID"),
  force_regenerate: z.boolean().optional(),
});

// W serve(), po CORS:
const body = await req.json();
const validation = requestSchema.safeParse(body);

if (!validation.success) {
  return new Response(
    JSON.stringify({ 
      error: "Invalid request", 
      details: validation.error.format() 
    }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

const { contact_id, force_regenerate } = validation.data;
```

---

## Zmiana 2: ai-chat/index.ts

**Linia 1-3** - Dodac import Zod:
```typescript
import { z } from "npm:zod@3.23.8";
```

**Linia 26-57** - Dodac schema i walidacje:

```typescript
// Dodac przed serve():
const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(50000),
});

const requestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1, "At least one message required"),
  context: z.object({
    contactId: z.string().uuid().optional(),
    meetingId: z.string().uuid().optional(),
    includeContacts: z.boolean().optional(),
    includeNeeds: z.boolean().optional(),
    includeOffers: z.boolean().optional(),
  }).optional(),
});

// W serve(), po auth check:
const body = await req.json();
const validation = requestSchema.safeParse(body);

if (!validation.success) {
  return new Response(
    JSON.stringify({ error: "Invalid request", details: validation.error.format() }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

const { messages, context } = validation.data;
```

---

## Zmiana 3: parse-contacts-list/index.ts

**Linia 1-3** - Dodac import Zod:
```typescript
import { z } from "npm:zod@3.23.8";
```

**Linia 55-62** - Dodac schema z refinement:

```typescript
// Dodac przed serve():
const requestSchema = z.object({
  content: z.string().min(1, "Content is required").max(5_000_000, "Content too large (max 5MB)"),
  contentType: z.enum(["csv", "xlsx", "pdf", "image", "text"]).optional().default("text"),
  fileName: z.string().max(255).optional(),
});

// W serve(), po auth check:
const body = await req.json();
const validation = requestSchema.safeParse(body);

if (!validation.success) {
  return new Response(
    JSON.stringify({ error: "Invalid request", details: validation.error.format() }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

const { content, contentType, fileName } = validation.data;
```

---

## Zmiana 4: remek-chat/index.ts

**Linia 1-2** - Dodac import Zod:
```typescript
import { z } from "npm:zod@3.23.8";
```

**Linia 106-115** - Zastapic interface RemekRequest schema Zod:

```typescript
// Zastapic interface RemekRequest:
const requestSchema = z.object({
  message: z.string().min(1, "Message is required").max(5000, "Message too long (max 5000 chars)"),
  sessionId: z.string().uuid().optional(),
  context: z.object({
    module: z.string().max(100).optional(),
    pageUrl: z.string().max(500).optional(),
    contactId: z.string().uuid().optional(),
    companyId: z.string().uuid().optional(),
  }).optional(),
});

type RemekRequest = z.infer<typeof requestSchema>;

// W serve(), po auth check (linia 135):
const body = await req.json();
const validation = requestSchema.safeParse(body);

if (!validation.success) {
  return new Response(
    JSON.stringify({ error: "Invalid request", details: validation.error.format() }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

const { message, context, sessionId: rawSessionId } = validation.data;
let sessionId = rawSessionId;
```

---

## Zmiana 5: background-sync-runner/index.ts

**Linia 1** - Dodac import Zod:
```typescript
import { z } from "npm:zod@3.23.8";
```

**Linia 17-26** - Dodac schema i walidacje:

```typescript
// Dodac przed Deno.serve():
const requestSchema = z.object({
  job_id: z.string().uuid("job_id musi byc poprawnym UUID"),
  tenant_id: z.string().uuid("tenant_id musi byc poprawnym UUID"),
  batch_size: z.number().int().min(1).max(100).optional().default(10),
  skip_errors: z.boolean().optional().default(true),
});

// W serve(), zamiast obecnej walidacji:
const body = await req.json().catch(() => ({}));
const validation = requestSchema.safeParse(body);

if (!validation.success) {
  return new Response(
    JSON.stringify({ error: "Invalid request", details: validation.error.format() }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

const { job_id, tenant_id, batch_size, skip_errors } = validation.data;
```

---

## Podsumowanie zmian

| Plik | Walidacja | Kluczowe pola |
|------|-----------|---------------|
| `generate-contact-profile` | UUID + optional boolean | `contact_id`, `force_regenerate` |
| `ai-chat` | Array messages + context | `messages[]`, `context` |
| `parse-contacts-list` | Content + enum contentType | `content`, `contentType`, `fileName` |
| `remek-chat` | Message + optional context | `message`, `sessionId`, `context` |
| `background-sync-runner` | UUID job + tenant | `job_id`, `tenant_id`, `batch_size` |

---

## Wazne zasady

1. **Walidacja PRZED auth** - oszczedzamy zasoby (nie autoryzujemy blednych requestow)
2. **400 Bad Request** - z pelnym Zod error format w `details`
3. **safeParse** - nie rzuca wyjatku, zwraca `success: boolean`
4. **Zod import** - `npm:zod@3.23.8` dziala natywnie w Deno
5. **NIE zmieniamy logiki** - tylko dodajemy walidacje na wejsciu

---

## Testowanie

Po wdrozeniu mozna testowac invalid payloads:

```bash
# Test invalid UUID
curl -X POST https://xxx.supabase.co/functions/v1/generate-contact-profile \
  -H "Authorization: Bearer XXX" \
  -d '{"contact_id": "not-a-uuid"}'

# Oczekiwana odpowiedz:
# {"error":"Invalid request","details":{"contact_id":{"_errors":["contact_id musi byc poprawnym UUID"]}}}
```
