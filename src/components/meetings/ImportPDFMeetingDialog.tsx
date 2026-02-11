import { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Loader2,
  X,
  Users,
  Sparkles,
  Building2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDealTeams } from '@/hooks/useDealTeams';
import {
  matchContactsFromParsed,
  useImportPDFParticipants,
  type MatchedParticipant,
  type ParticipantMatchType,
} from '@/hooks/useMeetingParticipantImport';
import type { ParsedPerson } from '@/hooks/useMeetingProspects';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingId: string;
  meetingName: string;
  meetingDate: string;
}

const BADGE_CONFIG: Record<ParticipantMatchType, { label: string; className: string }> = {
  member: {
    label: 'Mój członek',
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  },
  cc_member: {
    label: 'Członek CC',
    className: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  },
  prospect: {
    label: 'Prospect',
    className: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  },
};

export function ImportPDFMeetingDialog({
  open,
  onOpenChange,
  meetingId,
  meetingName,
  meetingDate,
}: Props) {
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [participants, setParticipants] = useState<MatchedParticipant[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;
  const directorId = director?.id;

  const { data: teams = [] } = useDealTeams();
  const importMutation = useImportPDFParticipants();

  const reset = () => {
    setStep('upload');
    setFile(null);
    setParsing(false);
    setParticipants([]);
    setSelectedTeamId('');
  };

  const handleClose = (val: boolean) => {
    if (!val) reset();
    onOpenChange(val);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleParse = async () => {
    if (!file || !tenantId || !directorId) {
      toast.error('Wybierz plik');
      return;
    }

    setParsing(true);
    try {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const response = await supabase.functions.invoke('parse-meeting-list', {
        body: {
          fileBase64: base64,
          fileName: file.name,
          mimeType: file.type || 'application/pdf',
        },
      });

      if (response.error) throw new Error(response.error.message);

      const result = response.data;
      if (!result.people || result.people.length === 0) {
        toast.error('Nie znaleziono osób w dokumencie');
        return;
      }

      // Match against existing contacts
      const matched = await matchContactsFromParsed(
        result.people as ParsedPerson[],
        tenantId,
        directorId
      );

      setParticipants(matched);
      setStep('preview');
      toast.success(`Rozpoznano ${result.people.length} osób`);
    } catch (error: any) {
      toast.error(`Błąd parsowania: ${error.message}`);
    } finally {
      setParsing(false);
    }
  };

  const handleRemove = (index: number) => {
    setParticipants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChangeBadge = (index: number, newType: ParticipantMatchType) => {
    setParticipants((prev) =>
      prev.map((p, i) => {
        if (i !== index) return p;
        // If changing from contact-type to prospect, remove contact link
        if (newType === 'prospect') {
          return { ...p, matchType: newType, contactId: undefined };
        }
        return { ...p, matchType: newType };
      })
    );
  };

  const handleImport = () => {
    const hasProspects = participants.some((p) => p.matchType === 'prospect');

    if (hasProspects && !selectedTeamId) {
      toast.error('Wybierz zespół Deals dla prospektów');
      return;
    }

    if (participants.length === 0) {
      toast.error('Lista jest pusta');
      return;
    }

    importMutation.mutate(
      {
        meetingId,
        meetingName,
        meetingDate,
        teamId: selectedTeamId,
        participants,
        sourceFileName: file?.name || '',
      },
      {
        onSuccess: () => handleClose(false),
      }
    );
  };

  const prospectCount = participants.filter((p) => p.matchType === 'prospect').length;
  const contactCount = participants.filter((p) => p.contactId).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload'
              ? 'Importuj uczestników z PDF'
              : `Podgląd — ${participants.length} osób`}
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Plik z listą uczestników</Label>
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm">{file.name}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Kliknij lub przeciągnij plik (PDF, XLSX, CSV)
                    </p>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="flex-1 min-h-0 space-y-3">
            {/* Stats bar */}
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-emerald-600">
                <Users className="h-4 w-4" />
                {contactCount} kontaktów CH
              </span>
              <span className="flex items-center gap-1 text-orange-600">
                <Sparkles className="h-4 w-4" />
                {prospectCount} prospektów
              </span>
            </div>

            {/* Team selector for prospects */}
            {prospectCount > 0 && (
              <div className="flex items-center gap-3">
                <Label className="whitespace-nowrap text-sm">Zespół Deals:</Label>
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Wybierz zespół" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Participants list */}
            <ScrollArea className="h-[350px] border rounded-md">
              <div className="divide-y">
                {participants.map((p, i) => {
                  const badge = BADGE_CONFIG[p.matchType];
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {p.contactFullName || p.parsed.full_name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {(p.contactCompany || p.parsed.company) && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {p.contactCompany || p.parsed.company}
                            </span>
                          )}
                          {p.parsed.position && <span>• {p.parsed.position}</span>}
                        </div>
                      </div>

                      {/* Badge selector */}
                      <Select
                        value={p.matchType}
                        onValueChange={(v) => handleChangeBadge(i, v as ParticipantMatchType)}
                      >
                        <SelectTrigger className="w-auto border-0 p-0 h-auto shadow-none">
                          <Badge className={badge.className}>{badge.label}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Mój członek</SelectItem>
                          <SelectItem value="cc_member">Członek CC</SelectItem>
                          <SelectItem value="prospect">Prospect</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemove(i)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          {step === 'upload' && (
            <Button onClick={handleParse} disabled={parsing || !file}>
              {parsing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analizuję...
                </>
              ) : (
                'Analizuj dokument'
              )}
            </Button>
          )}

          {step === 'preview' && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Wróć
              </Button>
              <Button
                onClick={handleImport}
                disabled={participants.length === 0 || importMutation.isPending}
              >
                {importMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Importuj {participants.length} osób
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
