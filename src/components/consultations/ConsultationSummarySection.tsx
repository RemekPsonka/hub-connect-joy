import { Mail, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ConsultationWithContact } from '@/hooks/useConsultations';

interface ConsultationSummarySectionProps {
  consultation: ConsultationWithContact;
}

export function ConsultationSummarySection({ consultation }: ConsultationSummarySectionProps) {
  const { toast } = useToast();

  const handleGenerateSummary = () => {
    toast({
      title: 'Funkcja AI',
      description: 'Generowanie podsumowania będzie wkrótce dostępne.',
    });
  };

  const handleSendToClient = () => {
    if (!consultation.ai_summary) {
      toast({
        title: 'Brak podsumowania',
        description: 'Najpierw wygeneruj podsumowanie AI.',
        variant: 'destructive',
      });
      return;
    }

    const contact = consultation.contacts;
    const subject = encodeURIComponent('Podsumowanie naszego spotkania');
    const body = encodeURIComponent(
      `Dzień dobry ${contact.full_name},\n\nPoniżej przesyłam podsumowanie naszego spotkania:\n\n${consultation.ai_summary}\n\nPozdrawiam`
    );

    window.open(`mailto:${contact.email}?subject=${subject}&body=${body}`);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Podsumowanie AI</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleGenerateSummary}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generuj podsumowanie
            </Button>
            {consultation.ai_summary && consultation.contacts.email && (
              <Button variant="outline" size="sm" onClick={handleSendToClient}>
                <Mail className="h-4 w-4 mr-2" />
                Wyślij do klienta
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {consultation.ai_summary ? (
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-sm">{consultation.ai_summary}</div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Brak podsumowania AI. Po zakończeniu spotkania kliknij "Generuj podsumowanie", 
            aby AI stworzyło krótkie streszczenie na podstawie notatek.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
