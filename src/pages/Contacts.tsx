import { Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Contacts() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Kontakty</h1>
        <p className="text-muted-foreground">Zarządzaj swoją siecią kontaktów</p>
      </div>
      
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Moduł w budowie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Ta sekcja zostanie wkrótce zaimplementowana.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
