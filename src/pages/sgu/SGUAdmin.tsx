import { lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const SGUCommissionsAdmin = lazy(() => import('./SGUCommissionsAdmin'));

interface SGUAdminProps {
  section?: 'team' | 'products' | 'commissions';
}

const SECTION_LABELS: Record<string, string> = {
  team: 'Zarządzanie zespołem',
  products: 'Produkty',
  commissions: 'Konfiguracja prowizji',
};

export default function SGUAdmin({ section }: SGUAdminProps = {}) {
  const params = useParams<{ section?: string }>();
  const resolved = section ?? params.section ?? 'team';

  if (resolved === 'commissions') {
    return (
      <Suspense fallback={<Skeleton className="h-96 w-full max-w-4xl mx-auto" />}>
        <SGUCommissionsAdmin />
      </Suspense>
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
