import { useState, useEffect, useMemo } from 'react';
import {
  extractDomain,
  getCachedLogo,
  setCachedLogo,
  getLogoUrl,
} from '@/lib/logoCache';

interface UseCompanyLogoResult {
  logoUrl: string | null;
  isLoading: boolean;
  initials: string;
}

export function useCompanyLogo(
  companyName: string | null,
  websiteOrDomain: string | null | undefined,
  overrideLogoUrl?: string | null,
): UseCompanyLogoResult {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const domain = useMemo(() => extractDomain(websiteOrDomain), [websiteOrDomain]);

  const initials = useMemo(() => {
    if (!companyName) return '?';
    return companyName
      .split(' ')
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase();
  }, [companyName]);

  useEffect(() => {
    // If an override URL is provided (e.g. from DB), use it directly
    if (overrideLogoUrl) {
      setLogoUrl(overrideLogoUrl);
      return;
    }

    if (!domain) {
      setLogoUrl(null);
      return;
    }

    const cached = getCachedLogo(domain);
    if (cached !== undefined) {
      setLogoUrl(cached);
      return;
    }

    // Probe via Image to check if logo exists (avoids CORS issues)
    setIsLoading(true);
    const img = new Image();
    const url = getLogoUrl(domain);

    img.onload = () => {
      setCachedLogo(domain, url);
      setLogoUrl(url);
      setIsLoading(false);
    };
    img.onerror = () => {
      setCachedLogo(domain, null);
      setLogoUrl(null);
      setIsLoading(false);
    };
    img.src = url;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [domain, overrideLogoUrl]);

  return { logoUrl, isLoading, initials };
}

/**
 * Batch preload logos for a list of companies.
 * Max 20 per batch, skips already-cached domains.
 */
export function usePreloadLogos(
  companies: Array<{ name: string; website?: string | null }> | undefined,
) {
  useEffect(() => {
    if (!companies?.length) return;

    const toPreload = companies
      .map(c => extractDomain(c.website))
      .filter((d): d is string => d !== null)
      .filter(d => getCachedLogo(d) === undefined)
      .slice(0, 20);

    toPreload.forEach(domain => {
      const img = new Image();
      const url = getLogoUrl(domain);
      img.onload = () => setCachedLogo(domain, url);
      img.onerror = () => setCachedLogo(domain, null);
      img.src = url;
    });
  }, [companies]);
}
