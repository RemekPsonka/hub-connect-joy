import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { Fragment } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const routeLabels: Record<string, string> = {
  '': 'Dashboard',
  'my-day': 'Mój Dzień',
  'calendar': 'Kalendarz',
  'sovra': 'Sovra',
  'contacts': 'Kontakty',
  'companies': 'Firmy',
  'consultations': 'Konsultacje',
  'meetings': 'Spotkania',
  'tasks': 'Zadania',
  'ai': 'AI Chat',
  'search': 'Wyszukiwanie',
  'matches': 'Dopasowania',
  'analytics': 'Analityka',
  'network': 'Sieć kontaktów',
  'pipeline': 'Ofertowanie',
  'projects': 'Projekty',
  'deals': 'Deals',
  'deals-team': 'Zespół Deals',
  'settings': 'Ustawienia',
  'notifications': 'Powiadomienia',
  'owner': 'Zarządzanie',
  'superadmin': 'Superadmin',
  'representatives': 'Przedstawiciele',
  'bug-reports': 'Zgłoszenia',
  'forgot-password': 'Odzyskiwanie hasła',
};

const UUID_RE = /^[0-9a-f-]{20,}$/i;

/**
 * Try to resolve a UUID segment to a human-readable name
 * by looking up React Query cache for known entity patterns.
 */
function useEntityName(id: string, parentSegment: string | undefined): string | null {
  const queryClient = useQueryClient();

  // Map parent route segment to cache key patterns
  const cacheKeys: string[][] = [];
  switch (parentSegment) {
    case 'projects':
      cacheKeys.push(['project', id]);
      break;
    case 'contacts':
      cacheKeys.push(['contact', id]);
      break;
    case 'companies':
      cacheKeys.push(['company', id]);
      break;
    case 'deals':
      cacheKeys.push(['deal', id]);
      break;
    case 'consultations':
      cacheKeys.push(['consultation', id]);
      break;
    case 'meetings':
      cacheKeys.push(['meeting', id]);
      break;
    default:
      // Try all common patterns
      cacheKeys.push(['project', id], ['contact', id], ['company', id]);
  }

  for (const key of cacheKeys) {
    const data = queryClient.getQueryData(key) as Record<string, unknown> | undefined;
    if (data) {
      const name = (data.name || data.full_name || data.title) as string | undefined;
      if (name) return name;
    }
  }

  return null;
}

export function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  // Don't show on root
  if (segments.length === 0) return null;

  return (
    <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumbs">
      <Link
        to="/"
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>

      {segments.map((segment, index) => {
        const path = '/' + segments.slice(0, index + 1).join('/');
        const isLast = index === segments.length - 1;
        const isId = UUID_RE.test(segment);
        const parentSegment = index > 0 ? segments[index - 1] : undefined;

        return (
          <Fragment key={path}>
            <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
            {isLast ? (
              <span className="text-foreground font-medium truncate max-w-[200px]">
                {isId ? <EntityLabel id={segment} parentSegment={parentSegment} /> : (routeLabels[segment] || segment)}
              </span>
            ) : (
              <Link
                to={path}
                className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[150px]"
              >
                {isId ? <EntityLabel id={segment} parentSegment={parentSegment} /> : (routeLabels[segment] || segment)}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}

/** Small component to resolve entity names from cache */
function EntityLabel({ id, parentSegment }: { id: string; parentSegment: string | undefined }) {
  const name = useEntityName(id, parentSegment);
  return <>{name || 'Szczegóły'}</>;
}
