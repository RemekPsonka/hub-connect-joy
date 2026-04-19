import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SGUTeam() {
  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Mój zespół SGU</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Implementacja: Sprint SGU-03.</p>
        </CardContent>
      </Card>
    </div>
  );
}
