const LOGO_CACHE_PREFIX = 'logo_';
const LOGO_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CachedLogo {
  url: string | null;
  cachedAt: number;
}

/**
 * Get cached logo URL for a domain.
 * @returns string = cached URL, null = confirmed not found, undefined = not in cache
 */
export function getCachedLogo(domain: string): string | null | undefined {
  try {
    const raw = localStorage.getItem(LOGO_CACHE_PREFIX + domain);
    if (!raw) return undefined;

    const cached: CachedLogo = JSON.parse(raw);
    if (Date.now() - cached.cachedAt > LOGO_CACHE_TTL) {
      localStorage.removeItem(LOGO_CACHE_PREFIX + domain);
      return undefined;
    }

    return cached.url;
  } catch {
    return undefined;
  }
}

export function setCachedLogo(domain: string, url: string | null): void {
  try {
    const entry: CachedLogo = { url, cachedAt: Date.now() };
    localStorage.setItem(LOGO_CACHE_PREFIX + domain, JSON.stringify(entry));
  } catch {
    // localStorage full — clear expired entries and retry
    clearExpiredLogos();
  }
}

export function clearExpiredLogos(): void {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(LOGO_CACHE_PREFIX));
    for (const key of keys) {
      try {
        const cached: CachedLogo = JSON.parse(localStorage.getItem(key) || '');
        if (Date.now() - cached.cachedAt > LOGO_CACHE_TTL) {
          localStorage.removeItem(key);
        }
      } catch {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // Safari private mode or other storage issues — silently ignore
  }
}

export function extractDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    let clean = url.trim().toLowerCase();
    if (!clean.startsWith('http')) clean = 'https://' + clean;
    const hostname = new URL(clean).hostname.replace(/^www\./, '');
    return hostname || null;
  } catch {
    return null;
  }
}

export function getLogoUrl(domain: string, size = 64): string {
  return `https://logo.clearbit.com/${domain}?size=${size}&format=png`;
}
