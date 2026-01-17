import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Save, Loader2, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ConsultationWithContact } from '@/hooks/useConsultations';
import {
  useConsultationQuestionnaire,
  useUpsertQuestionnaire,
  useConsultationMeetings,
  useCreateConsultationMeeting,
  useUpdateConsultationMeeting,
  useDeleteConsultationMeeting,
  useConsultationRecommendations,
  useCreateConsultationRecommendation,
  useUpdateConsultationRecommendation,
  useDeleteConsultationRecommendation,
  useConsultationGuests,
  useCreateConsultationGuest,
  useUpdateConsultationGuest,
  useDeleteConsultationGuest,
  useConsultationThanks,
  useCreateConsultationThanks,
  useUpdateConsultationThanks,
  useDeleteConsultationThanks,
  ConsultationMeeting,
  ConsultationRecommendation,
  ConsultationGuest,
  ConsultationThanks,
} from '@/hooks/useConsultationQuestionnaire';

interface ConsultationQuestionnaireProps {
  consultation: ConsultationWithContact;
}

export function ConsultationQuestionnaire({ consultation }: ConsultationQuestionnaireProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Fetch data
  const { data: questionnaire, isLoading: isLoadingQ } = useConsultationQuestionnaire(consultation.id);
  const { data: meetings = [], isLoading: isLoadingM } = useConsultationMeetings(consultation.id);
  const { data: recommendations = [], isLoading: isLoadingR } = useConsultationRecommendations(consultation.id);
  const { data: guests = [], isLoading: isLoadingG } = useConsultationGuests(consultation.id);
  const { data: thanks = [], isLoading: isLoadingT } = useConsultationThanks(consultation.id);

  // Mutations
  const upsertQuestionnaire = useUpsertQuestionnaire();
  const createMeeting = useCreateConsultationMeeting();
  const updateMeeting = useUpdateConsultationMeeting();
  const deleteMeeting = useDeleteConsultationMeeting();
  const createRecommendation = useCreateConsultationRecommendation();
  const updateRecommendation = useUpdateConsultationRecommendation();
  const deleteRecommendation = useDeleteConsultationRecommendation();
  const createGuest = useCreateConsultationGuest();
  const updateGuest = useUpdateConsultationGuest();
  const deleteGuest = useDeleteConsultationGuest();
  const createThanks = useCreateConsultationThanks();
  const updateThanks = useUpdateConsultationThanks();
  const deleteThanks = useDeleteConsultationThanks();

  // Local form state
  const [formData, setFormData] = useState({
    member_email: '',
    director_name: '',
    member_name: '',
    cc_group: '',
    next_meeting_date: '',
    current_engagement: '',
    previous_projects_review: '',
    group_engagement_rating: 5,
    group_engagement_details: '',
    valuable_education_topics: '',
    business_goals_needing_support: '',
    strategic_partners_sought: '',
    key_cc_events_plan: '',
    strategic_contacts_needed: '',
    expertise_contribution: '',
    value_for_community: '',
  });

  // Initialize form data from questionnaire
  useEffect(() => {
    if (questionnaire) {
      setFormData({
        member_email: questionnaire.member_email || consultation.contacts.email || '',
        director_name: questionnaire.director_name || '',
        member_name: questionnaire.member_name || consultation.contacts.full_name || '',
        cc_group: questionnaire.cc_group || '',
        next_meeting_date: questionnaire.next_meeting_date || '',
        current_engagement: questionnaire.current_engagement || '',
        previous_projects_review: questionnaire.previous_projects_review || '',
        group_engagement_rating: questionnaire.group_engagement_rating || 5,
        group_engagement_details: questionnaire.group_engagement_details || '',
        valuable_education_topics: questionnaire.valuable_education_topics || '',
        business_goals_needing_support: questionnaire.business_goals_needing_support || '',
        strategic_partners_sought: questionnaire.strategic_partners_sought || '',
        key_cc_events_plan: questionnaire.key_cc_events_plan || '',
        strategic_contacts_needed: questionnaire.strategic_contacts_needed || '',
        expertise_contribution: questionnaire.expertise_contribution || '',
        value_for_community: questionnaire.value_for_community || '',
      });
    } else {
      // Pre-fill with contact data
      setFormData(prev => ({
        ...prev,
        member_email: consultation.contacts.email || '',
        member_name: consultation.contacts.full_name || '',
      }));
    }
  }, [questionnaire, consultation.contacts]);

  // Debounced save for form data
  const saveFormData = useCallback(async (data: typeof formData) => {
    setIsSaving(true);
    try {
      await upsertQuestionnaire.mutateAsync({
        consultationId: consultation.id,
        data: {
          ...data,
          group_engagement_rating: data.group_engagement_rating,
        },
      });
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving questionnaire:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się zapisać danych',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [consultation.id, upsertQuestionnaire, toast]);

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.member_name || formData.current_engagement) {
        saveFormData(formData);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [formData, saveFormData]);

  const handleFieldChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Meeting handlers
  const handleAddMeeting = async (meetingType: ConsultationMeeting['meeting_type']) => {
    await createMeeting.mutateAsync({
      consultation_id: consultation.id,
      meeting_type: meetingType,
      contact_name: '',
      company: '',
      cc_group: '',
      meeting_date: null,
      follow_up: '',
      comment: '',
      sort_order: meetings.filter(m => m.meeting_type === meetingType).length,
    });
  };

  const handleUpdateMeeting = async (id: string, field: keyof ConsultationMeeting, value: string | null) => {
    await updateMeeting.mutateAsync({
      id,
      consultationId: consultation.id,
      [field]: value,
    });
  };

  const handleDeleteMeeting = async (id: string) => {
    await deleteMeeting.mutateAsync({ id, consultationId: consultation.id });
  };

  // Recommendation handlers
  const handleAddRecommendation = async (recommendationType: ConsultationRecommendation['recommendation_type']) => {
    await createRecommendation.mutateAsync({
      consultation_id: consultation.id,
      recommendation_type: recommendationType,
      contact_name: '',
      company: '',
      recommendation_kind: 'external',
      topic: '',
      sort_order: recommendations.filter(r => r.recommendation_type === recommendationType).length,
    });
  };

  const handleUpdateRecommendation = async (id: string, field: keyof ConsultationRecommendation, value: string | null) => {
    await updateRecommendation.mutateAsync({
      id,
      consultationId: consultation.id,
      [field]: value,
    });
  };

  const handleDeleteRecommendation = async (id: string) => {
    await deleteRecommendation.mutateAsync({ id, consultationId: consultation.id });
  };

  // Guest handlers
  const handleAddGuest = async (guestType: ConsultationGuest['guest_type']) => {
    await createGuest.mutateAsync({
      consultation_id: consultation.id,
      guest_type: guestType,
      guest_name: '',
      meeting_date: null,
      comment: '',
      sort_order: guests.filter(g => g.guest_type === guestType).length,
    });
  };

  const handleUpdateGuest = async (id: string, field: keyof ConsultationGuest, value: string | null) => {
    await updateGuest.mutateAsync({
      id,
      consultationId: consultation.id,
      [field]: value,
    });
  };

  const handleDeleteGuest = async (id: string) => {
    await deleteGuest.mutateAsync({ id, consultationId: consultation.id });
  };

  // Thanks handlers
  const handleAddThanks = async () => {
    await createThanks.mutateAsync({
      consultation_id: consultation.id,
      contact_name: '',
      transaction_amount: '',
      business_benefit_type: '',
      sort_order: thanks.length,
    });
  };

  const handleUpdateThanks = async (id: string, field: keyof ConsultationThanks, value: string | null) => {
    await updateThanks.mutateAsync({
      id,
      consultationId: consultation.id,
      [field]: value,
    });
  };

  const handleDeleteThanks = async (id: string) => {
    await deleteThanks.mutateAsync({ id, consultationId: consultation.id });
  };

  const isLoading = isLoadingQ || isLoadingM || isLoadingR || isLoadingG || isLoadingT;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Filter data by type
  const meetingsPastOutside = meetings.filter(m => m.meeting_type === 'past_outside');
  const meetingsPlannedOutside = meetings.filter(m => m.meeting_type === 'planned_outside');
  const meetingsOnEvent = meetings.filter(m => m.meeting_type === 'on_event');
  const meetingsPlannedOnEvent = meetings.filter(m => m.meeting_type === 'planned_on_event');
  const recsGiven = recommendations.filter(r => r.recommendation_type === 'given_external' || r.recommendation_type === 'given_internal');
  const recsReceived = recommendations.filter(r => r.recommendation_type === 'received');
  const guestsInvited = guests.filter(g => g.guest_type === 'invited');
  const guestsPlanned = guests.filter(g => g.guest_type === 'planned_invitation');

  return (
    <div className="space-y-4">
      {/* Save status */}
      <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
        {isSaving && (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Zapisywanie...</span>
          </>
        )}
        {lastSaved && !isSaving && (
          <>
            <Check className="h-4 w-4 text-green-500" />
            <span>Zapisano {lastSaved.toLocaleTimeString('pl-PL')}</span>
          </>
        )}
      </div>

      <Accordion type="multiple" defaultValue={['header', 'business', 'monitoring', 'summary']} className="space-y-4">
        {/* HEADER */}
        <AccordionItem value="header" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Nagłówek</Badge>
              <span className="font-semibold">Dane konsultacji</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>E-mail Członka CC</Label>
                <Input
                  value={formData.member_email}
                  onChange={(e) => handleFieldChange('member_email', e.target.value)}
                  placeholder="email@firma.pl"
                />
              </div>
              <div className="space-y-2">
                <Label>Imię i nazwisko Dyrektora CC</Label>
                <Input
                  value={formData.director_name}
                  onChange={(e) => handleFieldChange('director_name', e.target.value)}
                  placeholder="Jan Kowalski"
                />
              </div>
              <div className="space-y-2">
                <Label>Imię i nazwisko Członka CC</Label>
                <Input
                  value={formData.member_name}
                  onChange={(e) => handleFieldChange('member_name', e.target.value)}
                  placeholder="Anna Nowak"
                />
              </div>
              <div className="space-y-2">
                <Label>Grupa CC</Label>
                <Input
                  value={formData.cc_group}
                  onChange={(e) => handleFieldChange('cc_group', e.target.value)}
                  placeholder="np. Warszawa 1"
                />
              </div>
              <div className="space-y-2">
                <Label>Data spotkania KI</Label>
                <Input
                  value={new Date(consultation.scheduled_at).toLocaleDateString('pl-PL')}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label>Data kolejnego spotkania KI</Label>
                <Input
                  type="date"
                  value={formData.next_meeting_date}
                  onChange={(e) => handleFieldChange('next_meeting_date', e.target.value)}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* PART I - BUSINESS INFO */}
        <AccordionItem value="business" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <Badge>CZĘŚĆ I</Badge>
              <span className="font-semibold">Informacje biznesowe</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-6">
            {/* Question 1 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Co obecnie najbardziej angażuje Cię czasowo?
                </CardTitle>
                <CardDescription className="text-xs italic">
                  Jak zadać pytanie: "Które z Twoich obecnych wyzwań lub planów biznesowych najbardziej zaprzątają Twoją uwagę? Czy widzisz w nich przestrzeń, w której społeczność CC mogłaby być realnym wsparciem?"
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.current_engagement}
                  onChange={(e) => handleFieldChange('current_engagement', e.target.value)}
                  placeholder="Odpowiedź członka..."
                  rows={4}
                />
              </CardContent>
            </Card>

            {/* Question 2 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Omówienie projektów z poprzednich konsultacji oraz nowych projektów
                </CardTitle>
                <CardDescription className="text-xs italic">
                  Jak zadać pytanie: "Patrząc na projekty, które omawialiśmy ostatnio – co wymaga jeszcze domknięcia lub wsparcia?"
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.previous_projects_review}
                  onChange={(e) => handleFieldChange('previous_projects_review', e.target.value)}
                  placeholder="Odpowiedź członka..."
                  rows={4}
                />
              </CardContent>
            </Card>

            {/* Question 3 - Rating */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Jak oceniasz swoje zaangażowanie w Grupie CC w ostatnim miesiącu?
                </CardTitle>
                <CardDescription className="text-xs italic">
                  Jak zadać pytanie: "Gdybyś miał ocenić swoje zaangażowanie w skali 1-10, gdzie byś się umieścił? Jakie konkretne działania podjąłeś dla innych Członków?"
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">1</span>
                  <Slider
                    value={[formData.group_engagement_rating]}
                    onValueChange={([value]) => handleFieldChange('group_engagement_rating', value)}
                    min={1}
                    max={10}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground">10</span>
                  <Badge variant="secondary" className="ml-2 text-lg">
                    {formData.group_engagement_rating}
                  </Badge>
                </div>
                <Textarea
                  value={formData.group_engagement_details}
                  onChange={(e) => handleFieldChange('group_engagement_details', e.target.value)}
                  placeholder="Co było Twoim największym wkładem, a gdzie widzisz przestrzeń do poprawy?"
                  rows={3}
                />
              </CardContent>
            </Card>

            {/* Question 4 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Jakie tematy edukacyjne w CC były dla Ciebie najbardziej wartościowe?
                </CardTitle>
                <CardDescription className="text-xs italic">
                  "Które z ostatnich CC Talks, szkoleń lub rozmów z Członkami dostarczyły Ci największej wartości? W jakim obszarze Twoja wiedza mogłaby być szczególnie cenna dla innych przedsiębiorców?"
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.valuable_education_topics}
                  onChange={(e) => handleFieldChange('valuable_education_topics', e.target.value)}
                  placeholder="Odpowiedź członka..."
                  rows={4}
                />
              </CardContent>
            </Card>

            {/* Question 5 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Które z Twoich celów biznesowych na ten rok wymagają największego wsparcia?
                </CardTitle>
                <CardDescription className="text-xs italic">
                  "Które 2-3 cele biznesowe na ten rok są absolutnie kluczowe dla Twojego biznesu? Gdzie konkretnie widzisz potencjał wsparcia ze strony społeczności CC?"
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.business_goals_needing_support}
                  onChange={(e) => handleFieldChange('business_goals_needing_support', e.target.value)}
                  placeholder="Odpowiedź członka..."
                  rows={4}
                />
              </CardContent>
            </Card>

            {/* Question 6 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  W jakich obszarach poszukujesz strategicznych partnerów lub doradców?
                </CardTitle>
                <CardDescription className="text-xs italic">
                  "Jakie kompetencje, doświadczenia lub sieci kontaktów mogłyby znacząco przyspieszyć rozwój Twojego biznesu? Jakiego profilu przedsiębiorcy poszukujesz jako strategicznego partnera?"
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.strategic_partners_sought}
                  onChange={(e) => handleFieldChange('strategic_partners_sought', e.target.value)}
                  placeholder="Odpowiedź członka..."
                  rows={4}
                />
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* PART II - MONITORING */}
        <AccordionItem value="monitoring" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <Badge>CZĘŚĆ II</Badge>
              <span className="font-semibold">Monitoring aktywności</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-6">
            {/* Meetings outside - past */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Spotkania 1 na 1 poza Grupą CC w ostatnim miesiącu
                </CardTitle>
                <CardDescription className="text-xs">
                  Z kim z Członków swojej Grupy spotkałeś/aś się poza Spotkaniami Grup CC / Wydarzeniami CC?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Imię i nazwisko / firma</TableHead>
                      <TableHead className="w-[140px]">Data spotkania</TableHead>
                      <TableHead>Follow up</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {meetingsPastOutside.map((meeting) => (
                      <TableRow key={meeting.id}>
                        <TableCell>
                          <Input
                            value={meeting.contact_name || ''}
                            onChange={(e) => handleUpdateMeeting(meeting.id, 'contact_name', e.target.value)}
                            placeholder="Imię i nazwisko"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={meeting.meeting_date || ''}
                            onChange={(e) => handleUpdateMeeting(meeting.id, 'meeting_date', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={meeting.follow_up || ''}
                            onChange={(e) => handleUpdateMeeting(meeting.id, 'follow_up', e.target.value)}
                            placeholder="Ustalenia, następne kroki..."
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteMeeting(meeting.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => handleAddMeeting('past_outside')}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Dodaj spotkanie
                </Button>
              </CardContent>
            </Card>

            {/* Meetings outside - planned */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Planowane spotkania 1 na 1 poza Grupą CC
                </CardTitle>
                <CardDescription className="text-xs">
                  Z kim z Członków planujesz spotkać się poza Spotkaniami Grup CC w najbliższym miesiącu?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Imię i nazwisko / firma</TableHead>
                      <TableHead>Grupa CC</TableHead>
                      <TableHead className="w-[140px]">Data spotkania</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {meetingsPlannedOutside.map((meeting) => (
                      <TableRow key={meeting.id}>
                        <TableCell>
                          <Input
                            value={meeting.contact_name || ''}
                            onChange={(e) => handleUpdateMeeting(meeting.id, 'contact_name', e.target.value)}
                            placeholder="Imię i nazwisko"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={meeting.cc_group || ''}
                            onChange={(e) => handleUpdateMeeting(meeting.id, 'cc_group', e.target.value)}
                            placeholder="np. Warszawa 1"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={meeting.meeting_date || ''}
                            onChange={(e) => handleUpdateMeeting(meeting.id, 'meeting_date', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteMeeting(meeting.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => handleAddMeeting('planned_outside')}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Dodaj planowane spotkanie
                </Button>
              </CardContent>
            </Card>

            {/* Meetings on event - past */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Spotkania 1 na 1 na Grupie/Wydarzeniach CC w ostatnim miesiącu
                </CardTitle>
                <CardDescription className="text-xs">
                  Z kim z Członków spotkałeś/aś się podczas Spotkań Grup CC / Wydarzeń CC?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Imię i nazwisko / firma</TableHead>
                      <TableHead className="w-[140px]">Data spotkania</TableHead>
                      <TableHead>Follow up</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {meetingsOnEvent.map((meeting) => (
                      <TableRow key={meeting.id}>
                        <TableCell>
                          <Input
                            value={meeting.contact_name || ''}
                            onChange={(e) => handleUpdateMeeting(meeting.id, 'contact_name', e.target.value)}
                            placeholder="Imię i nazwisko"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={meeting.meeting_date || ''}
                            onChange={(e) => handleUpdateMeeting(meeting.id, 'meeting_date', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={meeting.follow_up || ''}
                            onChange={(e) => handleUpdateMeeting(meeting.id, 'follow_up', e.target.value)}
                            placeholder="Ustalenia, następne kroki..."
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteMeeting(meeting.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => handleAddMeeting('on_event')}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Dodaj spotkanie
                </Button>
              </CardContent>
            </Card>

            {/* Meetings on event - planned */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Planowane spotkania 1 na 1 na Grupie/Wydarzeniach CC
                </CardTitle>
                <CardDescription className="text-xs">
                  Z kim z Członków planujesz spotkać się podczas Spotkań Grup CC / Wydarzeń CC w najbliższym miesiącu?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Imię i nazwisko / firma</TableHead>
                      <TableHead>Grupa CC</TableHead>
                      <TableHead className="w-[140px]">Data spotkania</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {meetingsPlannedOnEvent.map((meeting) => (
                      <TableRow key={meeting.id}>
                        <TableCell>
                          <Input
                            value={meeting.contact_name || ''}
                            onChange={(e) => handleUpdateMeeting(meeting.id, 'contact_name', e.target.value)}
                            placeholder="Imię i nazwisko"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={meeting.cc_group || ''}
                            onChange={(e) => handleUpdateMeeting(meeting.id, 'cc_group', e.target.value)}
                            placeholder="np. Warszawa 1"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={meeting.meeting_date || ''}
                            onChange={(e) => handleUpdateMeeting(meeting.id, 'meeting_date', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteMeeting(meeting.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => handleAddMeeting('planned_on_event')}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Dodaj planowane spotkanie
                </Button>
              </CardContent>
            </Card>

            {/* Recommendations given */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Wartościowe rekomendacje przekazane w ostatnim miesiącu
                </CardTitle>
                <CardDescription className="text-xs">
                  Rekomendacja zewnętrzna - połączenie z osobą spoza CC. Rekomendacja wewnętrzna - połączenie między Członkami CC.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Imię i nazwisko / firma</TableHead>
                      <TableHead className="w-[150px]">Rodzaj rekomendacji</TableHead>
                      <TableHead>Czego dotyczyła?</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recsGiven.map((rec) => (
                      <TableRow key={rec.id}>
                        <TableCell>
                          <Input
                            value={rec.contact_name || ''}
                            onChange={(e) => handleUpdateRecommendation(rec.id, 'contact_name', e.target.value)}
                            placeholder="Imię i nazwisko"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={rec.recommendation_kind || 'external'}
                            onValueChange={(value) => handleUpdateRecommendation(rec.id, 'recommendation_kind', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="external">Zewnętrzna</SelectItem>
                              <SelectItem value="internal">Wewnętrzna</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={rec.topic || ''}
                            onChange={(e) => handleUpdateRecommendation(rec.id, 'topic', e.target.value)}
                            placeholder="Temat rekomendacji..."
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRecommendation(rec.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => handleAddRecommendation('given_external')}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Dodaj rekomendację
                </Button>
              </CardContent>
            </Card>

            {/* Recommendations received */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Rekomendacje o znaczeniu strategicznym otrzymane w ostatnim miesiącu
                </CardTitle>
                <CardDescription className="text-xs">
                  Wartościowe kontakty biznesowe otrzymane od innych Członków CC.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Imię i nazwisko / firma</TableHead>
                      <TableHead className="w-[150px]">Rodzaj rekomendacji</TableHead>
                      <TableHead>Czego dotyczyła?</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recsReceived.map((rec) => (
                      <TableRow key={rec.id}>
                        <TableCell>
                          <Input
                            value={rec.contact_name || ''}
                            onChange={(e) => handleUpdateRecommendation(rec.id, 'contact_name', e.target.value)}
                            placeholder="Imię i nazwisko"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={rec.recommendation_kind || 'external'}
                            onValueChange={(value) => handleUpdateRecommendation(rec.id, 'recommendation_kind', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="external">Zewnętrzna</SelectItem>
                              <SelectItem value="internal">Wewnętrzna</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={rec.topic || ''}
                            onChange={(e) => handleUpdateRecommendation(rec.id, 'topic', e.target.value)}
                            placeholder="Temat rekomendacji..."
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRecommendation(rec.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => handleAddRecommendation('received')}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Dodaj rekomendację
                </Button>
              </CardContent>
            </Card>

            {/* Guests invited */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Goście obecni na Spotkaniu Grupy CC
                </CardTitle>
                <CardDescription className="text-xs">
                  Którzy Goście z Twojej sieci kontaktów pojawili się na Spotkaniach Grup CC?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Imię i nazwisko / firma</TableHead>
                      <TableHead className="w-[140px]">Data spotkania</TableHead>
                      <TableHead>Komentarz</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {guestsInvited.map((guest) => (
                      <TableRow key={guest.id}>
                        <TableCell>
                          <Input
                            value={guest.guest_name || ''}
                            onChange={(e) => handleUpdateGuest(guest.id, 'guest_name', e.target.value)}
                            placeholder="Imię i nazwisko"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={guest.meeting_date || ''}
                            onChange={(e) => handleUpdateGuest(guest.id, 'meeting_date', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={guest.comment || ''}
                            onChange={(e) => handleUpdateGuest(guest.id, 'comment', e.target.value)}
                            placeholder="Komentarz..."
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteGuest(guest.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => handleAddGuest('invited')}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Dodaj gościa
                </Button>
              </CardContent>
            </Card>

            {/* Guests planned */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Planowani Goście na kolejne spotkania
                </CardTitle>
                <CardDescription className="text-xs">
                  Jakich Gości z Twojej sieci kontaktów zaprosisz na kolejne spotkania?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Imię i nazwisko / firma</TableHead>
                      <TableHead className="w-[140px]">Data spotkania</TableHead>
                      <TableHead>Komentarz</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {guestsPlanned.map((guest) => (
                      <TableRow key={guest.id}>
                        <TableCell>
                          <Input
                            value={guest.guest_name || ''}
                            onChange={(e) => handleUpdateGuest(guest.id, 'guest_name', e.target.value)}
                            placeholder="Imię i nazwisko"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={guest.meeting_date || ''}
                            onChange={(e) => handleUpdateGuest(guest.id, 'meeting_date', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={guest.comment || ''}
                            onChange={(e) => handleUpdateGuest(guest.id, 'comment', e.target.value)}
                            placeholder="Komentarz..."
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteGuest(guest.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => handleAddGuest('planned_invitation')}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Dodaj planowanego gościa
                </Button>
              </CardContent>
            </Card>

            {/* TYFCB */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Podziękowania za biznes (TYFCB)
                </CardTitle>
                <CardDescription className="text-xs">
                  Thank You For Closed Business - zamknięty kontrakt, transakcja, korzyść finansowa. Za jakie konkretne transakcje podziękowałeś Członkom CC?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Imię i nazwisko / firma</TableHead>
                      <TableHead>Kwota transakcji</TableHead>
                      <TableHead>Rodzaj korzyści biznesowej</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {thanks.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <Input
                            value={t.contact_name || ''}
                            onChange={(e) => handleUpdateThanks(t.id, 'contact_name', e.target.value)}
                            placeholder="Imię i nazwisko"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={t.transaction_amount || ''}
                            onChange={(e) => handleUpdateThanks(t.id, 'transaction_amount', e.target.value)}
                            placeholder="np. 50 000 PLN"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={t.business_benefit_type || ''}
                            onChange={(e) => handleUpdateThanks(t.id, 'business_benefit_type', e.target.value)}
                            placeholder="np. Kontrakt, transakcja..."
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteThanks(t.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={handleAddThanks}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Dodaj podziękowanie
                </Button>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* PART III - SUMMARY */}
        <AccordionItem value="summary" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <Badge>CZĘŚĆ III</Badge>
              <span className="font-semibold">Podsumowanie</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Kluczowe wydarzenia CC w nadchodzącym kwartale i plan uczestnictwa?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.key_cc_events_plan}
                  onChange={(e) => handleFieldChange('key_cc_events_plan', e.target.value)}
                  placeholder="Odpowiedź członka..."
                  rows={3}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Jakich strategicznych kontaktów lub specjalistycznej wiedzy potrzebujesz?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.strategic_contacts_needed}
                  onChange={(e) => handleFieldChange('strategic_contacts_needed', e.target.value)}
                  placeholder="Odpowiedź członka..."
                  rows={3}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  W jaki sposób Twoja unikalna ekspertyza może wspierać strategiczne cele innych Członków CC?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.expertise_contribution}
                  onChange={(e) => handleFieldChange('expertise_contribution', e.target.value)}
                  placeholder="Odpowiedź członka..."
                  rows={3}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  W jakich obszarach możesz obecnie wnieść największą wartość dla innych Członków społeczności?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.value_for_community}
                  onChange={(e) => handleFieldChange('value_for_community', e.target.value)}
                  placeholder="Odpowiedź członka..."
                  rows={3}
                />
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
