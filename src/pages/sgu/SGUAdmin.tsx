import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
