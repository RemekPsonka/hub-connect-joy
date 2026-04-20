import { lazy, Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, UserCog, UserPlus, Package, DollarSign, Calculator } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const SGUCommissionsAdmin = lazy(() => import('./SGUCommissionsAdmin'));

interface SGUAdminProps {
  section?: 'team' | 'products' | 'commissions' | 'representatives' | 'assignments' | 'case-d';
}

const SECTION_LABELS: Record<string, string> = {
  team: 'Zarządzanie zespołem',
  representatives: 'Przedstawiciele',
  assignments: 'Przypisania klientów',
  products: 'Produkty',
  commissions: 'Konfiguracja prowizji',
  'case-d': 'Case D — wyrównania',
};

interface AdminTile {
  key: string;
  url: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

const ADMIN_TILES: AdminTile[] = [
  { key: 'team', url: '/sgu/admin/team', title: 'Zespół', description: 'Skład zespołu SGU i role.', icon: Users },
  { key: 'representatives', url: '/sgu/admin/representatives', title: 'Przedstawiciele', description: 'Lista PH, zaproszenia, ustawienia.', icon: UserCog },
  { key: 'assignments', url: '/sgu/admin/assignments', title: 'Przypisania', description: 'Przypisania klientów do PH.', icon: UserPlus },
  { key: 'products', url: '/sgu/admin/products', title: 'Produkty', description: 'Katalog produktów SGU.', icon: Package },
  { key: 'commissions', url: '/sgu/admin/commissions', title: 'Prowizje', description: 'Konfiguracja prowizji i podziałów.', icon: DollarSign },
  { key: 'case-d', url: '/sgu/admin/commissions/case-d', title: 'Case D', description: 'Wyrównania prowizji – Case D.', icon: Calculator },
];

export default function SGUAdmin({ section }: SGUAdminProps = {}) {
  const params = useParams<{ section?: string }>();
  const navigate = useNavigate();
  const resolved = section ?? params.section;

  if (resolved === 'commissions') {
    return (
      <Suspense fallback={<Skeleton className="h-96 w-full max-w-4xl mx-auto" />}>
        <SGUCommissionsAdmin />
      </Suspense>
    );
  }

  // Hub view: brak section → pokaż 6 kafelków
  if (!resolved) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Admin SGU</h1>
          <p className="text-sm text-muted-foreground">Zarządzanie zespołem, produktami i prowizjami.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ADMIN_TILES.map((tile) => {
            const Icon = tile.icon;
            return (
              <button
                key={tile.key}
                onClick={() => navigate(tile.url)}
                className="text-left rounded-xl border bg-card p-5 transition-all hover:shadow-md hover:border-primary/40"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold">{tile.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{tile.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Admin SGU — {SECTION_LABELS[resolved] ?? resolved}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Implementacja: Sprint SGU-06.</p>
        </CardContent>
      </Card>
    </div>
  );
}
