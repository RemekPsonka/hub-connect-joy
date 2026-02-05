

# Plan: Rate Limiting z Upstash Redis

## Cel
Dodanie rate limiting dla kosztownych operacji AI uzywajac Upstash Redis aby zapobiec naduzywaniu zasobow i kontrolowac koszty.

---

## Krok 1: Konfiguracja Upstash (wymagana akcja uzytkownika)

Przed implementacja potrzebne sa dwie zmienne srodowiskowe:

1. Zaloz konto na https://upstash.com (free tier - 10k requests/day)
2. Utworz Redis database (region: Frankfurt lub najblizszy do Supabase)
3. Skopiuj z dashboard:
   - `UPSTASH_REDIS_REST_URL` (np. `https://xxx.upstash.io`)
   - `UPSTASH_REDIS_REST_TOKEN`

Dodaj secrets przez Lovable Cloud:
- Dodaj secret `UPSTASH_REDIS_REST_URL`
- Dodaj secret `UPSTASH_REDIS_REST_TOKEN`

---

## Krok 2: Utworzenie helpera rateLimit.ts

**Nowy plik: `supabase/functions/_shared/rateLimit.ts`**

```typescript
import { Redis } from 'https://esm.sh/@upstash/redis@1.28.0';

interface RateLimitConfig {
  max: number;      // max requests
  window: number;   // window in seconds
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  
  const url = Deno.env.get('UPSTASH_REDIS_REST_URL');
  const token = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');
  
  if (!url || !token) {
    console.warn('[RateLimit] UPSTASH credentials not configured, skipping rate limit');
    return null;
  }
  
  redis = new Redis({ url, token });
  return redis;
}

export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const redisClient = getRedis();
  
  // If Redis not configured, allow all (graceful degradation)
  if (!redisClient) {
    return { allowed: true, remaining: config.max, resetAt: new Date() };
  }

  const now = Date.now();
  const windowStart = now - config.window * 1000;
  
  try {
    // Remove expired entries
    await redisClient.zremrangebyscore(key, 0, windowStart);
    
    // Count current requests
    const current = await redisClient.zcard(key);
    
    if (current >= config.max) {
      const oldestEntry = await redisClient.zrange(key, 0, 0, { withScores: true });
      const oldestScore = oldestEntry?.[0]?.score || now;
      const resetAt = new Date(oldestScore + config.window * 1000);
      
      return { allowed: false, remaining: 0, resetAt };
    }
    
    // Add current request
    await redisClient.zadd(key, { score: now, member: `${now}-${Math.random()}` });
    await redisClient.expire(key, config.window);
    
    return {
      allowed: true,
      remaining: config.max - current - 1,
      resetAt: new Date(now + config.window * 1000),
    };
  } catch (error) {
    console.error('[RateLimit] Redis error:', error);
    // On error, allow request (fail-open for better UX)
    return { allowed: true, remaining: config.max, resetAt: new Date() };
  }
}

export function rateLimitResponse(
  resetAt: Date,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({ 
      error: 'Przekroczono limit zapytan. Sprobuj ponownie pozniej.',
      resetAt: resetAt.toISOString(),
    }), 
    { 
      status: 429,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': resetAt.toISOString(),
        'Retry-After': Math.ceil((resetAt.getTime() - Date.now()) / 1000).toString(),
      } 
    }
  );
}
```

---

## Krok 3: Dodanie rate limiting do funkcji

### 3.1 generate-contact-profile/index.ts

Po linii 191 (po auth check), dodac:

```typescript
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';

// Po: const { tenantId } = authResult;
// Dodac:
const rateLimit = await checkRateLimit(
  `contact-profile:${authResult.user.id}`,
  { max: 20, window: 3600 }  // 20 profili na godzine
);
if (!rateLimit.allowed) {
  return rateLimitResponse(rateLimit.resetAt, corsHeaders);
}
```

### 3.2 ai-chat/index.ts

Po linii 52 (po auth check), dodac:

```typescript
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';

// Po: console.log(`[ai-chat] Authorized user: ${authResult.user.id}...`);
// Dodac:
const rateLimit = await checkRateLimit(
  `ai-chat:${authResult.user.id}`,
  { max: 100, window: 3600 }  // 100 wiadomosci na godzine
);
if (!rateLimit.allowed) {
  return rateLimitResponse(rateLimit.resetAt, corsHeaders);
}
```

### 3.3 remek-chat/index.ts

Po linii 149 (po auth check), dodac:

```typescript
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';

// Po: const { tenantId, directorId, assistantId } = authResult;
// Dodac:
const rateLimit = await checkRateLimit(
  `remek:${authResult.user.id}`,
  { max: 50, window: 3600 }  // 50 pytan na godzine
);
if (!rateLimit.allowed) {
  return rateLimitResponse(rateLimit.resetAt, corsHeaders);
}
```

### 3.4 parse-contacts-list/index.ts

Po linii 56 (po auth check), dodac:

```typescript
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';

// Po: console.log(`[parse-contacts-list] Authorized user...`);
// Dodac:
const rateLimit = await checkRateLimit(
  `parse-contacts:${authResult.user.id}`,
  { max: 10, window: 3600 }  // 10 importow na godzine
);
if (!rateLimit.allowed) {
  return rateLimitResponse(rateLimit.resetAt, corsHeaders);
}
```

### 3.5 synthesize-company-profile/index.ts

Po auth check (okolo linii 360), dodac:

```typescript
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';

// Po weryfikacji auth, dodac:
const rateLimit = await checkRateLimit(
  `company-profile:${authResult.user.id}`,
  { max: 15, window: 3600 }  // 15 syntez na godzine
);
if (!rateLimit.allowed) {
  return rateLimitResponse(rateLimit.resetAt, corsHeaders);
}
```

---

## Rate Limit Configs - Podsumowanie

| Funkcja | Max | Window | Klucz Redis | Uzasadnienie |
|---------|-----|--------|-------------|--------------|
| `generate-contact-profile` | 20 | 1h | `contact-profile:{userId}` | Kosztowne: Perplexity + Firecrawl |
| `ai-chat` | 100 | 1h | `ai-chat:{userId}` | Normalny chat |
| `remek-chat` | 50 | 1h | `remek:{userId}` | Help queries |
| `parse-contacts-list` | 10 | 1h | `parse-contacts:{userId}` | Heavy AI processing |
| `synthesize-company-profile` | 15 | 1h | `company-profile:{userId}` | Multi-step analysis |

---

## Kluczowe decyzje projektowe

1. **Rate limit per USER** (nie per tenant) - sprawiedliwe uzycie, zapobiega monopolizacji przez jednego uzytkownika

2. **Graceful degradation** - jesli Redis niedostepny, przepuszcza request (fail-open)

3. **Sliding window** - uzywa sorted set z timestampami, bardziej sprawiedliwy niz fixed window

4. **Response headers**:
   - `X-RateLimit-Remaining` - ile requestow zostalo
   - `X-RateLimit-Reset` - kiedy limit sie resetuje (ISO timestamp)
   - `Retry-After` - ile sekund czekac

5. **Free tier Upstash** - 10k commands/day, wystarczy na MVP (kazdy rate limit check = ~3-4 commands)

---

## Testowanie

Po wdrozeniu mozna testowac:

```bash
# Wywolaj funkcje wielokrotnie az do limitu
for i in {1..25}; do
  curl -X POST https://xxx.supabase.co/functions/v1/generate-contact-profile \
    -H "Authorization: Bearer XXX" \
    -d '{"contact_id": "valid-uuid"}'
  echo "Request $i"
done

# Oczekiwany wynik po 20 requestach:
# 429 Too Many Requests
# {"error":"Przekroczono limit zapytan...","resetAt":"2024-..."}
```

