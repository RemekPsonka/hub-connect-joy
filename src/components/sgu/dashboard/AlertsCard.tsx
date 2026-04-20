import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertsPanel } from '@/components/sgu/AlertsPanel';

export function AlertsCard() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Alerty</CardTitle>
      </CardHeader>
      <CardContent>
        <AlertsPanel />
      </CardContent>
    </Card>
  );
}
