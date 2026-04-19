import { useQuery } from '@tanstack/react-query';

export interface WeatherSnapshot {
  tempC: number;
  description: string;
  icon: string;
}

const CACHE_KEY = 'weather_warsaw_v1';
const CACHE_TTL_MS = 30 * 60 * 1000;

interface CachedWeather {
  data: WeatherSnapshot;
  ts: number;
}

function readCache(): WeatherSnapshot | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedWeather;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(data: WeatherSnapshot) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // ignore quota errors
  }
}

async function fetchWeather(): Promise<WeatherSnapshot | null> {
  const cached = readCache();
  if (cached) return cached;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch('https://wttr.in/Warsaw?format=j1', {
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = await res.json();
    const current = json?.current_condition?.[0];
    if (!current) return null;
    const snap: WeatherSnapshot = {
      tempC: Number(current.temp_C ?? 0),
      description: current.lang_pl?.[0]?.value ?? current.weatherDesc?.[0]?.value ?? '',
      icon: '🌤️',
    };
    writeCache(snap);
    return snap;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function useWeather() {
  return useQuery({
    queryKey: ['weather-warsaw'],
    queryFn: fetchWeather,
    staleTime: CACHE_TTL_MS,
    retry: false,
  });
}
