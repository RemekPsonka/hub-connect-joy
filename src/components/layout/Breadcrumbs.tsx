import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { Fragment } from 'react';

const routeLabels: Record<string, string> = {
  '': 'Dashboard',
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
        const label = routeLabels[segment] || segment;
        // Skip UUID-like segments from display label
        const isId = /^[0-9a-f-]{20,}$/i.test(segment);

        return (
          <Fragment key={path}>
            <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
            {isLast ? (
              <span className="text-foreground font-medium truncate max-w-[200px]">
                {isId ? 'Szczegóły' : label}
              </span>
            ) : (
              <Link
                to={path}
                className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[150px]"
              >
                {isId ? 'Szczegóły' : label}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
