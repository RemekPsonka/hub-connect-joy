import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sparkles,
  Check,
  X,
  FileDown,
  Users,
  MessageSquare,
  Lightbulb,
} from 'lucide-react';
import {
  useMeetingParticipants,
  useMeetingRecommendations,
  useGenerateRecommendations,
  useUpdateRecommendationStatus,
  type RecommendationStatus,
} from '@/hooks/useMeetings';
import { toast } from 'sonner';

interface MeetingRecommendationsTabProps {
  meetingId: string;
}

const statusLabels: Record<RecommendationStatus, { label: string; color: string }> = {
  pending: { label: 'Oczekująca', color: 'bg-muted text-muted-foreground' },
  accepted: { label: 'Zaakceptowana', color: 'bg-emerald-500/10 text-emerald-600' },
  rejected: { label: 'Odrzucona', color: 'bg-destructive/10 text-destructive' },
  completed: { label: 'Zrealizowana', color: 'bg-primary/10 text-primary' },
};

export function MeetingRecommendationsTab({ meetingId }: MeetingRecommendationsTabProps) {
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const { data: participants = [] } = useMeetingParticipants(meetingId);
  const { data: recommendations = [], isLoading } = useMeetingRecommendations(meetingId);
  const generateRecommendations = useGenerateRecommendations();
  const updateStatus = useUpdateRecommendationStatus();

  // Get only "my members" from participants
  const members = participants.filter((p) => p.is_member);

  // Group recommendations by for_contact_id
  const groupedRecommendations = recommendations.reduce((acc, rec) => {
    const key = rec.for_contact_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(rec);
    return acc;
  }, {} as Record<string, typeof recommendations>);

  const handleMemberToggle = (contactId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleGenerate = async () => {
    if (selectedMembers.length === 0) {
      toast.error('Wybierz co najmniej jednego członka');
      return;
    }

    try {
      await generateRecommendations.mutateAsync({
        meetingId,
        forContactIds: selectedMembers,
      });
      toast.success('Rekomendacje zostały wygenerowane');
      setSelectedMembers([]);
    } catch (error: any) {
      toast.error(error.message || 'Błąd podczas generowania rekomendacji');
    }
  };

  const handleStatusUpdate = async (recommendationId: string, status: RecommendationStatus) => {
    try {
      await updateStatus.mutateAsync({ recommendationId, status, meetingId });
      toast.success('Status został zaktualizowany');
    } catch (error) {
      toast.error('Błąd podczas aktualizacji statusu');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded w-full" />
            <div className="h-10 bg-muted rounded w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Member selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Wybierz członków do rekomendacji
          </CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Brak członków oznaczonych jako "Mój członek" na liście uczestników.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`member-${member.id}`}
                      checked={selectedMembers.includes(member.contact_id)}
                      onCheckedChange={() => handleMemberToggle(member.contact_id)}
                    />
                    <Label htmlFor={`member-${member.id}`} className="text-sm cursor-pointer">
                      {member.contact?.full_name}
                    </Label>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleGenerate}
                  disabled={selectedMembers.length === 0 || generateRecommendations.isPending}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {generateRecommendations.isPending ? 'Generowanie...' : 'Generuj rekomendacje'}
                </Button>

                <Button variant="outline" disabled className="gap-2">
                  <FileDown className="h-4 w-4" />
                  Eksportuj jako PDF
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recommendations list */}
      {Object.keys(groupedRecommendations).length > 0 && (
        <div className="space-y-4">
          {Object.entries(groupedRecommendations).map(([forContactId, recs]) => {
            const forContact = recs[0]?.for_contact;
            return (
              <Card key={forContactId}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Rekomendacje dla: {forContact?.full_name}
                    {forContact?.company && (
                      <span className="font-normal text-muted-foreground ml-2">
                        ({forContact.company})
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {recs.map((rec, index) => (
                      <div key={rec.id}>
                        {index > 0 && <Separator className="my-3" />}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-muted-foreground">
                                #{rec.rank}
                              </span>
                              <span className="font-medium">
                                {rec.recommended_contact?.full_name}
                              </span>
                              {rec.recommended_contact?.company && (
                                <span className="text-sm text-muted-foreground">
                                  ({rec.recommended_contact.company})
                                </span>
                              )}
                              <Badge className={statusLabels[rec.status].color}>
                                {statusLabels[rec.status].label}
                              </Badge>
                            </div>

                            {rec.reasoning && (
                              <div className="flex items-start gap-2 text-sm text-muted-foreground mt-2">
                                <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>{rec.reasoning}</span>
                              </div>
                            )}

                            {rec.talking_points && (
                              <div className="flex items-start gap-2 text-sm text-muted-foreground mt-1">
                                <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>{rec.talking_points}</span>
                              </div>
                            )}
                          </div>

                          {rec.status === 'pending' && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                                onClick={() => handleStatusUpdate(rec.id, 'accepted')}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                onClick={() => handleStatusUpdate(rec.id, 'rejected')}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {Object.keys(groupedRecommendations).length === 0 && recommendations.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">Brak rekomendacji</h3>
            <p className="text-sm text-muted-foreground text-center">
              Wybierz członków powyżej i wygeneruj rekomendacje 1x1.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
