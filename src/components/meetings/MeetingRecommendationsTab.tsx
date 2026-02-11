import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sparkles,
  Check,
  X,
  FileDown,
  Users,
  MessageSquare,
  Lightbulb,
  Brain,
  Loader2,
  Search,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';
import {
  useMeetingParticipants,
  useMeetingRecommendations,
  useGenerateRecommendations,
  useUpdateRecommendationStatus,
  type RecommendationStatus,
} from '@/hooks/useMeetings';
import { toast } from 'sonner';
import { streamAIChat } from '@/hooks/useAIChat';
import { ParticipantBadge } from './ParticipantBadge';
import { ConnectionContactSelect } from '@/components/network/ConnectionContactSelect';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface MeetingRecommendationsTabProps {
  meetingId: string;
}

const statusLabels: Record<RecommendationStatus, { label: string; color: string; icon: typeof Check }> = {
  pending: { label: 'Oczekująca', color: 'bg-muted text-muted-foreground', icon: Loader2 },
  accepted: { label: 'Zaakceptowana', color: 'bg-emerald-500/10 text-emerald-600', icon: Check },
  rejected: { label: 'Odrzucona', color: 'bg-destructive/10 text-destructive', icon: X },
  completed: { label: 'Zrealizowana', color: 'bg-primary/10 text-primary', icon: CheckCircle2 },
};

const matchTypeLabels: Record<string, string> = {
  'need-offer': 'Potrzeba↔Oferta',
  'offer-need': 'Oferta↔Potrzeba',
  'synergy': 'Synergia',
  'networking': 'Networking',
};

export function MeetingRecommendationsTab({ meetingId }: MeetingRecommendationsTabProps) {
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [loadingExplanation, setLoadingExplanation] = useState<string | null>(null);
  const [searchDialogRec, setSearchDialogRec] = useState<string | null>(null);
  const [searchContactId, setSearchContactId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { data: participants = [] } = useMeetingParticipants(meetingId);
  const { data: recommendations = [], isLoading } = useMeetingRecommendations(meetingId);
  const generateRecommendations = useGenerateRecommendations();
  const updateStatus = useUpdateRecommendationStatus();

  // Group participants by type
  const members = participants.filter((p) => p.is_member);
  const prospects = participants.filter((p) => !!(p as any).prospect_id);
  const others = participants.filter((p) => !p.is_member && !(p as any).prospect_id);

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

  const handleSelectAllMembers = () => {
    const memberIds = members.map(m => m.contact_id).filter(Boolean) as string[];
    setSelectedMembers(prev => 
      prev.length === memberIds.length ? [] : memberIds
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

  const handleLinkContact = async () => {
    if (!searchDialogRec || !searchContactId) return;
    try {
      const { error } = await supabase
        .from('meeting_recommendations')
        .update({ recommended_contact_id: searchContactId })
        .eq('id', searchDialogRec);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['meeting-recommendations', meetingId] });
      toast.success('Kontakt został powiązany');
      setSearchDialogRec(null);
      setSearchContactId(null);
    } catch (error) {
      toast.error('Błąd podczas powiązania kontaktu');
    }
  };

  const handleExplainMatch = async (rec: typeof recommendations[0]) => {
    if (!rec.for_contact || !rec.recommended_contact) return;
    
    const recId = rec.id;
    setLoadingExplanation(recId);

    try {
      const prompt = `Wyjaśnij szczegółowo dlaczego te dwie osoby biznesowe powinny się poznać podczas spotkania networkingowego:

OSOBA A: ${rec.for_contact.full_name}${rec.for_contact.company ? ` (${rec.for_contact.company})` : ''}
OSOBA B: ${rec.recommended_contact.full_name}${rec.recommended_contact.company ? ` (${rec.recommended_contact.company})` : ''}

Obecne uzasadnienie: ${rec.reasoning || 'Brak'}
Sugerowane tematy: ${rec.talking_points || 'Brak'}
Typ dopasowania: ${rec.match_type || 'networking'}

Napisz szczegółowe wyjaśnienie (3-5 zdań) zawierające:
1. Dlaczego to połączenie ma sens biznesowy
2. Konkretne korzyści dla każdej ze stron
3. 2-3 konkretne tematy do omówienia podczas rozmowy

Odpowiedz po polsku, profesjonalnie ale przystępnie.`;

      let explanation = '';
      await streamAIChat({
        messages: [{ role: 'user', content: prompt }],
        onDelta: (chunk) => {
          explanation += chunk;
          setExplanations(prev => ({ ...prev, [recId]: explanation }));
        },
        onDone: () => {
          setLoadingExplanation(null);
        },
        onError: () => {
          setLoadingExplanation(null);
          toast.error('Błąd podczas generowania wyjaśnienia');
        }
      });
    } catch (error) {
      console.error('Error explaining match:', error);
      setLoadingExplanation(null);
      toast.error('Błąd podczas generowania wyjaśnienia');
    }
  };

  // Find participant info for a contact to render badge
  const getParticipantInfo = (contactId: string) => {
    const p = participants.find(pp => pp.contact_id === contactId);
    if (!p) return null;
    return {
      isMember: !!p.is_member,
      isNew: !!p.is_new,
      isProspect: !!(p as any).prospect_id,
      primaryGroupId: p.contact?.primary_group_id,
    };
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

  const renderParticipantGroup = (
    title: string,
    items: typeof participants,
    showCheckbox: boolean,
  ) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title} ({items.length})</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {items.map((p) => (
            <div key={p.id} className="flex items-center gap-2 p-2 rounded-md border bg-card">
              {showCheckbox && p.contact_id && (
                <Checkbox
                  id={`member-${p.id}`}
                  checked={selectedMembers.includes(p.contact_id)}
                  onCheckedChange={() => handleMemberToggle(p.contact_id)}
                />
              )}
              <Label htmlFor={showCheckbox ? `member-${p.id}` : undefined} className="text-sm cursor-pointer flex-1 truncate">
                {p.contact?.full_name || 'Nieznany'}
              </Label>
              <ParticipantBadge
                isMember={!!p.is_member}
                isNew={!!p.is_new}
                isProspect={!!(p as any).prospect_id}
                primaryGroupId={p.contact?.primary_group_id}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Participant selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Uczestnicy spotkania
            </CardTitle>
            {members.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleSelectAllMembers}>
                {selectedMembers.length === members.filter(m => m.contact_id).length
                  ? 'Odznacz wszystkich'
                  : 'Zaznacz wszystkich członków'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {participants.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Brak uczestników na liście spotkania.
            </p>
          ) : (
            <>
              {renderParticipantGroup('Moi członkowie', members, true)}
              {renderParticipantGroup('Pozostali uczestnicy', others, false)}
              {renderParticipantGroup('Prospekty', prospects, false)}

              <Separator />

              <div className="flex gap-3">
                <Button
                  onClick={handleGenerate}
                  disabled={selectedMembers.length === 0 || generateRecommendations.isPending}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {generateRecommendations.isPending ? 'Generowanie...' : `Generuj rekomendacje (${selectedMembers.length})`}
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
                    <Badge variant="secondary" className="ml-2">{recs.length} rekomendacji</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {recs.map((rec, index) => {
                      const pInfo = rec.recommended_contact ? getParticipantInfo(rec.recommended_contact.id) : null;
                      return (
                        <div key={rec.id}>
                          {index > 0 && <Separator className="my-3" />}
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-sm font-medium text-muted-foreground">
                                  #{rec.rank}
                                </span>
                                <span className="font-medium">
                                  {rec.recommended_contact?.full_name || 'Nieznany kontakt'}
                                </span>
                                {rec.recommended_contact?.company && (
                                  <span className="text-sm text-muted-foreground">
                                    ({rec.recommended_contact.company})
                                  </span>
                                )}
                                {/* Participant type badge */}
                                {pInfo && (
                                  <ParticipantBadge
                                    isMember={pInfo.isMember}
                                    isNew={pInfo.isNew}
                                    isProspect={pInfo.isProspect}
                                    primaryGroupId={pInfo.primaryGroupId}
                                  />
                                )}
                                {/* Match type badge */}
                                {rec.match_type && rec.match_type !== 'ai_placeholder' && (
                                  <Badge variant="outline" className="text-xs">
                                    {matchTypeLabels[rec.match_type] || rec.match_type}
                                  </Badge>
                                )}
                                {/* Status badge with dropdown */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="inline-flex items-center gap-1 cursor-pointer">
                                      <Badge className={statusLabels[rec.status].color}>
                                        {statusLabels[rec.status].label}
                                        <ChevronDown className="h-3 w-3 ml-1" />
                                      </Badge>
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start">
                                    {(Object.keys(statusLabels) as RecommendationStatus[]).map(s => (
                                      <DropdownMenuItem
                                        key={s}
                                        onClick={() => handleStatusUpdate(rec.id, s)}
                                        disabled={s === rec.status}
                                      >
                                        {statusLabels[s].label}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>

                              {/* Search in database button for unlinked contacts */}
                              {!rec.recommended_contact && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs gap-1 mt-1"
                                  onClick={() => {
                                    setSearchDialogRec(rec.id);
                                    setSearchContactId(null);
                                  }}
                                >
                                  <Search className="h-3 w-3" />
                                  Wyszukaj w bazie
                                </Button>
                              )}

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

                              {/* Explain button */}
                              <div className="mt-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs gap-1"
                                  onClick={() => handleExplainMatch(rec)}
                                  disabled={loadingExplanation === rec.id || !rec.recommended_contact}
                                >
                                  {loadingExplanation === rec.id ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      Generowanie...
                                    </>
                                  ) : (
                                    <>
                                      <Brain className="h-3 w-3" />
                                      Wyjaśnij dopasowanie
                                    </>
                                  )}
                                </Button>
                              </div>

                              {/* AI Explanation */}
                              {explanations[rec.id] && (
                                <div className="mt-3 p-3 bg-muted/50 rounded-lg border">
                                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                                    <Sparkles className="h-3 w-3" />
                                    Szczegółowe wyjaśnienie AI
                                  </div>
                                  <p className="text-sm whitespace-pre-wrap">{explanations[rec.id]}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
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

      {/* Contact search dialog */}
      <Dialog open={!!searchDialogRec} onOpenChange={(open) => { if (!open) { setSearchDialogRec(null); setSearchContactId(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wyszukaj kontakt w bazie</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Label>Wybierz istniejący kontakt</Label>
            <ConnectionContactSelect
              value={searchContactId}
              onChange={setSearchContactId}
              placeholder="Szukaj kontaktu..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSearchDialogRec(null); setSearchContactId(null); }}>
              Anuluj
            </Button>
            <Button onClick={handleLinkContact} disabled={!searchContactId}>
              Powiąż kontakt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
