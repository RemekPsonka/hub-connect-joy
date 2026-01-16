import { useState } from 'react';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { streamAIChat } from '@/hooks/useAIChat';
import { useQueryClient } from '@tanstack/react-query';

interface ConsultationPreparationSectionProps {
  consultationId: string;
  preparationBrief: string | null;
  contactId: string;
  contactName: string;
  contactCompany?: string | null;
}

export function ConsultationPreparationSection({ 
  consultationId, 
  preparationBrief,
  contactId,
  contactName,
  contactCompany
}: ConsultationPreparationSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [briefPreview, setBriefPreview] = useState('');

  const handleGenerateBrief = async () => {
    setIsGenerating(true);
    setBriefPreview('');

    try {
      // 1. Gather context in parallel
      const [contactResult, consultationsResult, tasksResult, needsResult, offersResult] = await Promise.all([
        supabase.from('contacts').select('*').eq('id', contactId).single(),
        supabase.from('consultations')
          .select('notes, ai_summary, scheduled_at, agenda')
          .eq('contact_id', contactId)
          .neq('id', consultationId)
          .order('scheduled_at', { ascending: false })
          .limit(3),
        supabase.from('task_contacts')
          .select('tasks(*)')
          .eq('contact_id', contactId),
        supabase.from('needs')
          .select('*')
          .eq('contact_id', contactId)
          .eq('status', 'active'),
        supabase.from('offers')
          .select('*')
          .eq('contact_id', contactId)
          .eq('status', 'active'),
      ]);

      const contact = contactResult.data;
      const lastConsultations = consultationsResult.data || [];
      const tasks = tasksResult.data?.map(tc => tc.tasks).filter(Boolean) || [];
      const pendingTasks = tasks.filter((t: any) => t?.status === 'pending');
      const needs = needsResult.data || [];
      const offers = offersResult.data || [];

      // Format context
      const formatConsultations = () => {
        if (lastConsultations.length === 0) return 'Brak poprzednich spotkań';
        return lastConsultations.map((c, i) => 
          `Spotkanie ${i + 1}: ${c.ai_summary || c.notes || 'Brak notatek'}`
        ).join('\n');
      };

      const formatTasks = () => {
        if (pendingTasks.length === 0) return 'Brak otwartych zadań';
        return pendingTasks.map((t: any) => `- ${t.title}`).join('\n');
      };

      const formatNeeds = () => {
        if (needs.length === 0) return 'Brak aktywnych potrzeb';
        return needs.map(n => `- ${n.title}: ${n.description || ''}`).join('\n');
      };

      const formatOffers = () => {
        if (offers.length === 0) return 'Brak aktywnych ofert';
        return offers.map(o => `- ${o.title}: ${o.description || ''}`).join('\n');
      };

      // 2. Build prompt
      const prompt = `Przygotuj brief przed spotkaniem z ${contactName}${contactCompany ? ` z firmy ${contactCompany}` : ''}.

Kontekst:
Profil: ${contact?.profile_summary || 'Brak profilu'}
Notatki o kontakcie: ${contact?.notes || 'Brak notatek'}

Ostatnie spotkania:
${formatConsultations()}

Otwarte zadania:
${formatTasks()}

Aktywne potrzeby:
${formatNeeds()}

Aktywne oferty:
${formatOffers()}

Przygotuj brief zawierający:
1. Podsumowanie ostatniego spotkania i status ustaleń
2. Kluczowe tematy do omówienia
3. Pytania do zadania
4. Sugerowane tematy rozmowy
5. Tematy small-talk (jeśli znane hobby/zainteresowania z notatek)

Odpowiedz po polsku, zwięźle i konkretnie. Użyj formatowania markdown.`;

      // 3. Stream AI response
      let fullBrief = '';
      await streamAIChat({
        messages: [{ role: 'user', content: prompt }],
        onDelta: (chunk) => {
          fullBrief += chunk;
          setBriefPreview(fullBrief);
        },
        onDone: async () => {
          // 4. Save to database
          const { error } = await supabase
            .from('consultations')
            .update({ preparation_brief: fullBrief })
            .eq('id', consultationId);

          if (error) {
            console.error('Error saving brief:', error);
            toast({
              title: 'Błąd zapisu',
              description: 'Nie udało się zapisać briefu',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Brief wygenerowany',
              description: 'Brief przygotowawczy został zapisany',
            });
            queryClient.invalidateQueries({ queryKey: ['consultation', consultationId] });
          }
          setIsGenerating(false);
        },
        onError: () => {
          setIsGenerating(false);
          setBriefPreview('');
        }
      });
    } catch (error) {
      console.error('Error generating brief:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się wygenerować briefu',
        variant: 'destructive',
      });
      setIsGenerating(false);
    }
  };

  const displayBrief = isGenerating ? briefPreview : preparationBrief;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Brief przygotowawczy</CardTitle>
            {preparationBrief && (
              <Badge variant="outline" className="text-xs gap-1">
                <Sparkles className="h-3 w-3" />
                AI
              </Badge>
            )}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleGenerateBrief}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generowanie...
              </>
            ) : preparationBrief ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Wygeneruj ponownie
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generuj brief
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {displayBrief ? (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div className="whitespace-pre-wrap text-sm">{displayBrief}</div>
            {isGenerating && (
              <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-xs">Generowanie...</span>
              </div>
            )}
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
