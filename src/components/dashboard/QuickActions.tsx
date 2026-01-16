import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, CalendarPlus, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Szybkie akcje</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button onClick={() => navigate('/contacts')} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Dodaj kontakt
        </Button>
        <Button onClick={() => navigate('/consultations')} variant="outline" className="gap-2">
          <CalendarPlus className="h-4 w-4" />
          Nowa konsultacja
        </Button>
        <Button onClick={() => navigate('/ai')} variant="outline" className="gap-2">
          <MessageSquare className="h-4 w-4" />
          AI Chat
        </Button>
      </CardContent>
    </Card>
  );
}
