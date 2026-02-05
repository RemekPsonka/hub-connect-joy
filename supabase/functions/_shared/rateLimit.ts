import { Redis } from 'npm:@upstash/redis@1.28.0';

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
      const oldestScore = (oldestEntry as { score: number }[])?.[0]?.score || now;
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
      error: 'Przekroczono limit zapytań. Spróbuj ponownie później.',
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
