import { Card } from '@/components/ui/card';
import { CalendarDays } from 'lucide-react';

export function CalendarWidget() {
  return (
    <Card className="h-full p-4 flex flex-col items-center justify-center text-center">
      <CalendarDays className="h-6 w-6 text-muted-foreground mb-2" />
      <div className="text-sm font-medium text-foreground">Kalendarz</div>
      <div className="text-xs text-muted-foreground mt-1">Dostępne po Sprincie 12</div>
    </Card>
  );
}
