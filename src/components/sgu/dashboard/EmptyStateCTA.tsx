import { Link } from 'react-router-dom';
import { Building2, FileUp, UserPlus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface CTATile {
  icon: typeof UserPlus;
  title: string;
  description: string;
  to: string;
  cta: string;
}

const TILES: CTATile[] = [
  {
    icon: UserPlus,
    title: 'Dodaj pierwszego klienta',
    description: 'Ręcznie utwórz kontakt i przypisz go do lejka sprzedaży.',
    to: '/sgu/sprzedaz',
    cta: 'Dodaj kontakt',
  },
  {
    icon: FileUp,
    title: 'Import CSV',
    description: 'Wgraj listę kontaktów z pliku CSV i przypisz do zespołu.',
    to: '/contacts?import=csv',
    cta: 'Importuj plik',
  },
  {
    icon: Building2,
    title: 'Uruchom AI KRS',
    description: 'Automatycznie wzbogać firmy danymi z rejestrów KRS/CEIDG.',
    to: '/sgu/admin/team',
    cta: 'Uruchom AI',
  },
];

export function EmptyStateCTA() {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-lg font-semibold">Zacznij od pierwszego kroku</h2>
          <p className="text-sm text-muted-foreground">
            Twoja baza kontaktów jest pusta. Wybierz jak chcesz zacząć.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {TILES.map((tile) => (
            <div
              key={tile.title}
              className="rounded-lg border bg-card p-4 flex flex-col gap-3"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <tile.icon className="h-5 w-5" />
                </span>
                <h3 className="text-sm font-semibold">{tile.title}</h3>
              </div>
              <p className="text-xs text-muted-foreground flex-1">
                {tile.description}
              </p>
              <Button asChild size="sm" variant="outline" className="w-full">
                <Link to={tile.to}>{tile.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
