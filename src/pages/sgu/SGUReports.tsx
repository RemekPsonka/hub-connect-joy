import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SGUReportsProps {
  period?: 'weekly' | 'monthly';
}

export default function SGUReports({ period }: SGUReportsProps = {}) {
  const params = useParams<{ period?: string }>();
  const resolved = period ?? params.period ?? 'weekly';
  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Raport SGU — {resolved === 'monthly' ? 'miesięczny' : 'tygodniowy'}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Implementacja: Sprint SGU-05.</p>
        </CardContent>
      </Card>
    </div>
  );
}
