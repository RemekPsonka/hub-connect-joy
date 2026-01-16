import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface ConsultationPreparationSectionProps {
  consultationId: string;
  preparationBrief: string | null;
}

export function ConsultationPreparationSection({ 
  consultationId, 
  preparationBrief 
}: ConsultationPreparationSectionProps) {
  const { toast } = useToast();

  const handleGenerateBrief = () => {
    toast({
      title: 'Funkcja AI',
      description: 'Generowanie briefu przygotowawczego będzie wkrótce dostępne.',
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Brief przygotowawczy</CardTitle>
          <Button variant="outline" size="sm" onClick={handleGenerateBrief}>
            <Sparkles className="h-4 w-4 mr-2" />
            Generuj brief
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {preparationBrief ? (
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-sm">{preparationBrief}</div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Brak briefu przygotowawczego. Kliknij "Generuj brief", aby AI przygotowało podsumowanie 
            poprzednich kontaktów, otwartych zadań i sugerowanych tematów do omówienia.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
