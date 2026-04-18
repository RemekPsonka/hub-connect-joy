/**
 * Sprint 01 — Czysty rate-limiter na Upstash REST (bez npm @upstash/redis).
 * Algorytm: liczba zapytań na okno czasu (per klucz). INCR + EXPIRE.
 *
 * Użycie:
 *   const { ok, remaining } = await checkRateLimit(authResult.user.id, "ai-chat", 30, 60);
 *   if (!ok) return new Response(JSON.stringify({ error: "rate_limited", remaining: 0 }), { status: 429, headers: ... });
 *
 * Brak Upstash w env → fail-open (dev / lokalne testy).
 */

const REST_URL = Deno.env.get("UPSTASH_REDIS_REST_URL");
const REST_TOKEN = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

interface RateLimitOk {
  ok: true;
  remaining: number;
}

interface RateLimitBlocked {
  ok: false;
  remaining: 0;
  resetIn: number;
}

export type RateLimitResult = RateLimitOk | RateLimitBlocked;

async function upstashPipeline(commands: string[][]): Promise<unknown[]> {
  if (!REST_URL || !REST_TOKEN) {
    throw new Error("Upstash REST credentials missing");
  }
  const res = await fetch(`${REST_URL}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REST_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  });
  if (!res.ok) {
    throw new Error(`Upstash REST error ${res.status}`);
  }
  const json = (await res.json()) as Array<{ result?: unknown; error?: string }>;
  return json.map((entry) => {
    if (entry.error) throw new Error(`Upstash command error: ${entry.error}`);
    return entry.result;
  });
}

/**
 * @param userId  identyfikator użytkownika (auth.uid)
 * @param key     klucz funkcji (np. "ai-chat")
 * @param limit   maksymalna liczba zapytań w oknie
 * @param windowSec  długość okna w sekundach
 */
export async function checkRateLimit(
  userId: string,
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  // Brak konfiguracji → fail-open (graceful), żeby dev nie wymagał Upstash.
  if (!REST_URL || !REST_TOKEN) {
    console.warn("[rateLimit] Upstash not configured — allowing request");
    return { ok: true, remaining: limit };
  }

  const redisKey = `rl:${key}:${userId}`;

  try {
    const [countRaw, _expireRaw] = await upstashPipeline([
      ["INCR", redisKey],
      ["EXPIRE", redisKey, String(windowSec), "NX"],
    ]);

    const count = typeof countRaw === "number" ? countRaw : Number(countRaw ?? 0);

    if (count > limit) {
      return { ok: false, remaining: 0, resetIn: windowSec };
    }
    return { ok: true, remaining: Math.max(0, limit - count) };
  } catch (err) {
    // Fail-open na błąd Upstash — lepiej przyjąć request niż wywalić feature.
    console.error("[rateLimit] Upstash error, allowing request:", err);
    return { ok: true, remaining: limit };
  }
}

export function rateLimitedResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: "rate_limited", remaining: 0 }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": "60",
      },
    },
  );
}
