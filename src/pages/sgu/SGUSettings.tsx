import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SGUSettings() {
  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Ustawienia SGU</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Implementacja: Sprint SGU-07.</p>
        </CardContent>
      </Card>
    </div>
  );
}
