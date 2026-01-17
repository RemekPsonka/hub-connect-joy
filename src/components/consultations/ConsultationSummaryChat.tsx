import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, RefreshCw, User, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { streamAIChat } from '@/hooks/useAIChat';
import { 
  useConsultationChatMessages, 
  useCreateChatMessage, 
  useClearChatMessages,
  useConsultationQuestionnaire,
  useConsultationMeetings,
  useConsultationRecommendations,
  useConsultationThanks
} from '@/hooks/useConsultationQuestionnaire';
import { useUpdateConsultation, ConsultationWithContact } from '@/hooks/useConsultations';

interface ConsultationSummaryChatProps {
  consultation: ConsultationWithContact;
}

export function ConsultationSummaryChat({ consultation }: ConsultationSummaryChatProps) {
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  const { data: messages = [], isLoading } = useConsultationChatMessages(consultation.id, 'summary');
  const { data: questionnaire } = useConsultationQuestionnaire(consultation.id);
  const { data: meetings = [] } = useConsultationMeetings(consultation.id);
  const { data: recommendations = [] } = useConsultationRecommendations(consultation.id);
  const { data: thanks = [] } = useConsultationThanks(consultation.id);
  
  const createMessage = useCreateChatMessage();
  const clearMessages = useClearChatMessages();
  const updateConsultation = useUpdateConsultation();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const generateSummary = async () => {
    setIsGenerating(true);
    setStreamingContent('');

    try {
      // Build context from questionnaire and related data
      const meetingsPast = meetings.filter(m => m.meeting_type === 'past_outside' || m.meeting_type === 'on_event');
      const meetingsPlanned = meetings.filter(m => m.meeting_type === 'planned_outside' || m.meeting_type === 'planned_on_event');
      const givenRecs = recommendations.filter(r => r.recommendation_type === 'given_external' || r.recommendation_type === 'given_internal');
      const receivedRecs = recommendations.filter(r => r.recommendation_type === 'received');

      const prompt = `Jesteś asystentem tworzącym profesjonalne podsumowania Konsultacji Indywidualnych (KI) w Corporate Connections.

INFORMACJE O SPOTKANIU:
Data: ${new Date(consultation.scheduled_at).toLocaleDateString('pl-PL')}
Członek CC: ${consultation.contacts.full_name}
Firma: ${consultation.contacts.company || 'Nie podano'}
Stanowisko: ${consultation.contacts.position || 'Nie podano'}
Typ spotkania: Konsultacja Indywidualna (KI)
Lokalizacja: ${consultation.is_virtual ? 'Online' : consultation.location || 'Stacjonarnie'}

${consultation.agenda ? `AGENDA:\n${consultation.agenda}\n` : ''}
${consultation.notes ? `NOTATKI ZE SPOTKANIA:\n${consultation.notes}\n` : ''}

${questionnaire ? `
INFORMACJE Z ARKUSZA KI:

Część I - Informacje biznesowe:
${questionnaire.current_engagement ? `- Co angażuje czasowo: ${questionnaire.current_engagement}` : ''}
${questionnaire.previous_projects_review ? `- Przegląd projektów: ${questionnaire.previous_projects_review}` : ''}
${questionnaire.group_engagement_rating ? `- Ocena zaangażowania w Grupie: ${questionnaire.group_engagement_rating}/10` : ''}
${questionnaire.group_engagement_details ? `- Szczegóły zaangażowania: ${questionnaire.group_engagement_details}` : ''}
${questionnaire.valuable_education_topics ? `- Wartościowe tematy edukacyjne: ${questionnaire.valuable_education_topics}` : ''}
${questionnaire.business_goals_needing_support ? `- Cele wymagające wsparcia: ${questionnaire.business_goals_needing_support}` : ''}
${questionnaire.strategic_partners_sought ? `- Poszukiwani partnerzy strategiczni: ${questionnaire.strategic_partners_sought}` : ''}

Część III - Podsumowanie:
${questionnaire.key_cc_events_plan ? `- Plan wydarzeń CC: ${questionnaire.key_cc_events_plan}` : ''}
${questionnaire.strategic_contacts_needed ? `- Potrzebne kontakty strategiczne: ${questionnaire.strategic_contacts_needed}` : ''}
${questionnaire.expertise_contribution ? `- Wkład ekspercki: ${questionnaire.expertise_contribution}` : ''}
${questionnaire.value_for_community ? `- Wartość dla społeczności: ${questionnaire.value_for_community}` : ''}
` : ''}

${meetingsPast.length > 0 ? `
SPOTKANIA 1 NA 1 (odbyte):
${meetingsPast.map(m => `- ${m.contact_name || 'Nieznany'} (${m.company || '?'}) - ${m.meeting_date || 'brak daty'}${m.follow_up ? ` | Follow-up: ${m.follow_up}` : ''}`).join('\n')}
` : ''}

${meetingsPlanned.length > 0 ? `
SPOTKANIA 1 NA 1 (planowane):
${meetingsPlanned.map(m => `- ${m.contact_name || 'Nieznany'} (${m.company || '?'}) - ${m.meeting_date || 'brak daty'}`).join('\n')}
` : ''}

${givenRecs.length > 0 ? `
REKOMENDACJE PRZEKAZANE:
${givenRecs.map(r => `- ${r.contact_name || 'Nieznany'} (${r.recommendation_kind === 'external' ? 'zewnętrzna' : 'wewnętrzna'}) - ${r.topic || 'brak tematu'}`).join('\n')}
` : ''}

${receivedRecs.length > 0 ? `
REKOMENDACJE OTRZYMANE:
${receivedRecs.map(r => `- ${r.contact_name || 'Nieznany'} (${r.recommendation_kind === 'external' ? 'zewnętrzna' : 'wewnętrzna'}) - ${r.topic || 'brak tematu'}`).join('\n')}
` : ''}

${thanks.length > 0 ? `
PODZIĘKOWANIA ZA BIZNES (TYFCB):
${thanks.map(t => `- ${t.contact_name || 'Nieznany'} - ${t.transaction_amount || 'kwota nieznana'} (${t.business_benefit_type || 'rodzaj nieznany'})`).join('\n')}
` : ''}

ZADANIE:
Wygeneruj profesjonalne podsumowanie Konsultacji Indywidualnej zawierające:

1. **Omówione tematy** (krótko, 2-3 zdania)
   - Główne punkty rozmowy

2. **Kluczowe ustalenia i decyzje** (lista punktowana)
   - Konkretne ustalenia
   - Podjęte decyzje

3. **Monitoring aktywności** (podsumowanie)
   - Spotkania 1 na 1: ile odbyto, ile zaplanowano
   - Rekomendacje: ile przekazano, ile otrzymano
   - TYFCB: podziękowania za biznes

4. **Następne kroki** (action items)
   - Kto, co, kiedy
   - Konkretne zadania do wykonania

5. **Data kolejnej KI**: ${questionnaire?.next_meeting_date ? new Date(questionnaire.next_meeting_date).toLocaleDateString('pl-PL') : 'Do ustalenia'}

Format: Markdown, profesjonalnie, gotowe do wysłania Członkowi CC.
Język: Polski.`;

      let fullResponse = '';

      await streamAIChat({
        messages: [{ role: 'user', content: prompt }],
        onDelta: (text) => {
          fullResponse += text;
          setStreamingContent(fullResponse);
        },
        onDone: async () => {
          // Save to chat and update consultation
          await createMessage.mutateAsync({
            consultation_id: consultation.id,
            chat_type: 'summary',
            role: 'assistant',
            content: fullResponse,
          });

          // Save to ai_summary field
          await updateConsultation.mutateAsync({
            id: consultation.id,
            ai_summary: fullResponse,
          });

          setStreamingContent('');
          setIsGenerating(false);
          toast({
            title: 'Sukces',
            description: 'Podsumowanie wygenerowane',
          });
        },
        onError: (error) => {
          console.error('Summary generation error:', error);
          toast({
            title: 'Błąd',
            description: 'Nie udało się wygenerować podsumowania',
            variant: 'destructive',
          });
          setIsGenerating(false);
          setStreamingContent('');
        },
      });

    } catch (error) {
      console.error('Summary generation error:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się wygenerować podsumowania',
        variant: 'destructive',
      });
      setIsGenerating(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isGenerating) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsGenerating(true);
    setStreamingContent('');

    try {
      await createMessage.mutateAsync({
        consultation_id: consultation.id,
        chat_type: 'summary',
        role: 'user',
        content: userMessage,
      });

      const chatHistory = messages.map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      }));

      let fullResponse = '';

      await streamAIChat({
        messages: [
          { role: 'system', content: `Jesteś asystentem pomagającym tworzyć podsumowania Konsultacji Indywidualnej z ${consultation.contacts.full_name} (${consultation.contacts.company || 'firma nieznana'}). Odpowiadaj po polsku, zwięźle i profesjonalnie.` },
          ...chatHistory,
          { role: 'user', content: userMessage },
        ],
        onDelta: (text) => {
          fullResponse += text;
          setStreamingContent(fullResponse);
        },
        onDone: async () => {
          await createMessage.mutateAsync({
            consultation_id: consultation.id,
            chat_type: 'summary',
            role: 'assistant',
            content: fullResponse,
          });
          setStreamingContent('');
          setIsGenerating(false);
        },
        onError: (error) => {
          console.error('Chat error:', error);
          toast({
            title: 'Błąd',
            description: 'Nie udało się uzyskać odpowiedzi',
            variant: 'destructive',
          });
          setIsGenerating(false);
          setStreamingContent('');
        },
      });

    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się wysłać wiadomości',
        variant: 'destructive',
      });
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    await clearMessages.mutateAsync({ consultationId: consultation.id, chatType: 'summary' });
    generateSummary();
  };

  const handleSendToClient = () => {
    const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');
    if (!lastAssistantMessage || !consultation.contacts.email) return;

    const subject = `Podsumowanie Konsultacji Indywidualnej - ${new Date(consultation.scheduled_at).toLocaleDateString('pl-PL')}`;
    const body = lastAssistantMessage.content;
    window.location.href = `mailto:${consultation.contacts.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const hasAssistantMessage = messages.some(m => m.role === 'assistant');

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Podsumowanie AI
          </CardTitle>
          <div className="flex gap-2">
            {hasAssistantMessage && consultation.contacts.email && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendToClient}
              >
                <Mail className="h-4 w-4 mr-1" />
                Wyślij do klienta
              </Button>
            )}
            {messages.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={isGenerating}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Regeneruj
              </Button>
            )}
            {messages.length === 0 && !isGenerating && (
              <Button onClick={generateSummary} size="sm">
                <Sparkles className="h-4 w-4 mr-1" />
                Generuj podsumowanie
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && !isGenerating && !streamingContent && (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">
                Kliknij "Generuj podsumowanie" aby AI utworzyło podsumowanie na podstawie notatek i arkusza KI
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
            >
              {message.role === 'assistant' && (
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Sparkles className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`rounded-lg p-3 max-w-[85%] ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <div className="text-sm whitespace-pre-wrap prose prose-sm max-w-none dark:prose-invert">
                  {message.content}
                </div>
              </div>
              {message.role === 'user' && (
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {streamingContent && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Sparkles className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-lg p-3 max-w-[85%]">
                <div className="text-sm whitespace-pre-wrap prose prose-sm max-w-none dark:prose-invert">
                  {streamingContent}
                </div>
              </div>
            </div>
          )}

          {isGenerating && !streamingContent && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Sparkles className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-lg p-3">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Zapytaj AI o zmiany lub dodatkowe informacje..."
            disabled={isGenerating || messages.length === 0}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isGenerating || messages.length === 0}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
