import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SGUDashboard() {
  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard SGU</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Implementacja: Sprint SGU-04.</p>
        </CardContent>
      </Card>
    </div>
  );
}
