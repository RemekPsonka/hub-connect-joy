import { useState } from 'react';
import { Mail, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ConsultationWithContact } from '@/hooks/useConsultations';
import { supabase } from '@/integrations/supabase/client';
import { streamAIChat } from '@/hooks/useAIChat';
import { useQueryClient } from '@tanstack/react-query';

interface ConsultationSummarySectionProps {
  consultation: ConsultationWithContact;
}

export function ConsultationSummarySection({ consultation }: ConsultationSummarySectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [summaryPreview, setSummaryPreview] = useState('');

  const handleGenerateSummary = async () => {
    if (!consultation.notes) {
      toast({
        title: 'Brak notatek',
        description: 'Dodaj notatki ze spotkania przed wygenerowaniem podsumowania.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setSummaryPreview('');

    try {
      const contact = consultation.contacts;
      
      const prompt = `Na podstawie notatek ze spotkania, przygotuj podsumowanie do wysłania klientowi.

Notatki ze spotkania:
${consultation.notes}

Agenda spotkania:
${consultation.agenda || 'Brak agendy'}

Kontakt: ${contact.full_name}${contact.company ? `, ${contact.company}` : ''}

Przygotuj podsumowanie zawierające:
1. Główne omówione tematy
2. Podjęte decyzje
3. Ustalone działania (kto, co, kiedy)
4. Następne kroki

Ton: profesjonalny ale przyjazny. Po polsku. Użyj formatowania markdown.
Napisz podsumowanie jako gotowe do wysłania klientowi.`;

      let fullSummary = '';
      await streamAIChat({
        messages: [{ role: 'user', content: prompt }],
        onDelta: (chunk) => {
          fullSummary += chunk;
          setSummaryPreview(fullSummary);
        },
        onDone: async () => {
          // Save to database
          const { error } = await supabase
            .from('consultations')
            .update({ ai_summary: fullSummary })
            .eq('id', consultation.id);

          if (error) {
            console.error('Error saving summary:', error);
            toast({
              title: 'Błąd zapisu',
              description: 'Nie udało się zapisać podsumowania',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Podsumowanie gotowe',
              description: 'Podsumowanie AI zostało zapisane',
            });
            queryClient.invalidateQueries({ queryKey: ['consultation', consultation.id] });
          }
          setIsGenerating(false);
        },
        onError: () => {
          setIsGenerating(false);
          setSummaryPreview('');
        }
      });
    } catch (error) {
      console.error('Error generating summary:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się wygenerować podsumowania',
        variant: 'destructive',
      });
      setIsGenerating(false);
    }
  };

  const handleSendToClient = () => {
    const summary = isGenerating ? summaryPreview : consultation.ai_summary;
    
    if (!summary) {
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
      `Dzień dobry ${contact.full_name},\n\nPoniżej przesyłam podsumowanie naszego spotkania:\n\n${summary}\n\nPozdrawiam`
    );

    window.open(`mailto:${contact.email}?subject=${subject}&body=${body}`);
  };

  const displaySummary = isGenerating ? summaryPreview : consultation.ai_summary;
  const canSendEmail = (displaySummary && consultation.contacts.email);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Podsumowanie AI</CardTitle>
            {consultation.ai_summary && (
              <Badge variant="outline" className="text-xs gap-1">
                <Sparkles className="h-3 w-3" />
                AI
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleGenerateSummary}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generowanie...
                </>
              ) : consultation.ai_summary ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Wygeneruj ponownie
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generuj podsumowanie
                </>
              )}
            </Button>
            {canSendEmail && (
              <Button variant="outline" size="sm" onClick={handleSendToClient}>
                <Mail className="h-4 w-4 mr-2" />
                Wyślij do klienta
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {displaySummary ? (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div className="whitespace-pre-wrap text-sm">{displaySummary}</div>
            {isGenerating && (
              <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-xs">Generowanie...</span>
              </div>
            )}
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
