import { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Loader2,
  X,
  Users,
  Sparkles,
  Building2,
  UserPlus,
  BrainCircuit,
  DatabaseZap,
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
import { useContactGroups } from '@/hooks/useContactGroups';
import {
  matchContactsFromParsed,
  useImportPDFParticipants,
  type MatchedParticipant,
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

const getBadgeInfo = (p: MatchedParticipant) => {
  if (p.matchType === 'prospect') {
    return { label: 'Nowy prospect', className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' };
  }
  if (p.matchType === 'existing_prospect') {
    return { label: 'Prospect (w bazie)', className: 'bg-violet-500/10 text-violet-600 border-violet-500/20' };
  }
  return {
    label: p.groupName || 'Kontakt CH',
    className: p.matchType === 'member'
      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
      : 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  };
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
  const { data: contactGroups = [] } = useContactGroups();
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

  const handleChangeBadge = (index: number, value: string) => {
    setParticipants((prev) =>
      prev.map((p, i) => {
        if (i !== index) return p;
        if (value === 'prospect') {
          return { ...p, matchType: 'prospect' as const, contactId: undefined, primaryGroupId: null, groupName: null };
        }
        // value is a group ID
        const group = contactGroups.find((g) => g.id === value);
        return {
          ...p,
          matchType: 'cc_member' as const,
          primaryGroupId: value,
          groupName: group?.name || null,
        };
      })
    );
  };

  const handleAddToDatabase = async (index: number) => {
    if (!tenantId || !directorId) return;
    const p = participants[index];
    const { data, error } = await supabase
      .from('contacts')
      .insert({
        tenant_id: tenantId,
        director_id: directorId,
        full_name: p.parsed.full_name,
        company: p.parsed.company || null,
        position: p.parsed.position || null,
        primary_group_id: p.primaryGroupId || null,
        source: 'meeting_import',
      })
      .select('id')
      .single();

    if (error) {
      toast.error('Błąd dodawania kontaktu');
      return;
    }

    setParticipants((prev) =>
      prev.map((pp, i) => (i === index ? { ...pp, contactId: data.id } : pp))
    );
    toast.success('Kontakt dodany do bazy');
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
  const existingProspectCount = participants.filter((p) => p.matchType === 'existing_prospect').length;
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
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <span className="flex items-center gap-1 text-emerald-600">
                <Users className="h-4 w-4" />
                {contactCount} kontaktów CH
              </span>
              {existingProspectCount > 0 && (
                <span className="flex items-center gap-1 text-violet-600">
                  <DatabaseZap className="h-4 w-4" />
                  {existingProspectCount} istn. prospektów
                </span>
              )}
              <span className="flex items-center gap-1 text-orange-600">
                <Sparkles className="h-4 w-4" />
                {prospectCount} nowych prospektów
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
                  const badge = getBadgeInfo(p);
                  const selectValue = p.matchType === 'prospect' || p.matchType === 'existing_prospect' ? 'prospect' : (p.primaryGroupId || 'no-group');
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate flex items-center gap-1">
                          {p.contactFullName || p.parsed.full_name}
                          {p.hasAiBrief && (
                            <BrainCircuit className="h-3.5 w-3.5 text-violet-500" />
                          )}
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

                      {/* Badge selector — grupy z CRM + Prospect */}
                      <Select
                        value={selectValue}
                        onValueChange={(v) => handleChangeBadge(i, v)}
                      >
                        <SelectTrigger className="w-auto border-0 p-0 h-auto shadow-none">
                          <Badge className={badge.className}>{badge.label}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {contactGroups.map((g) => (
                            <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                          ))}
                          <SelectItem value="prospect">Prospect</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Dodaj do bazy — only for non-prospects without contactId */}
                      {p.matchType !== 'prospect' && !p.contactId && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleAddToDatabase(i)}
                        >
                          <UserPlus className="h-3 w-3 mr-1" />
                          Dodaj do bazy
                        </Button>
                      )}

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
