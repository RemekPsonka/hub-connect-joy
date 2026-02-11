import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
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
import { Plus, Upload, Search, UserPlus, Trash2, FileText, Sparkles, ArrowRightCircle } from 'lucide-react';
import { ParticipantBadge } from './ParticipantBadge';
import {
  useMeetingParticipants,
  useUpdateParticipantAttendance,
  useRemoveParticipant,
  type AttendanceStatus,
} from '@/hooks/useMeetings';
import { AddParticipantModal } from './AddParticipantModal';
import { ImportCSVModal } from './ImportCSVModal';
import { ImportPDFMeetingDialog } from './ImportPDFMeetingDialog';
import { ProspectAIBriefDialog } from '@/components/deals-team/ProspectAIBriefDialog';
import { ProspectingConvertDialog } from '@/components/deals-team/ProspectingConvertDialog';
import { useGenerateProspectBrief } from '@/hooks/useMeetingProspects';
import type { MeetingProspect } from '@/hooks/useMeetingProspects';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MeetingParticipantsTabProps {
  meetingId: string;
  meetingName?: string;
  meetingDate?: string;
}

type ParticipantFilter = 'all' | 'members' | 'new';

export function MeetingParticipantsTab({ meetingId, meetingName, meetingDate }: MeetingParticipantsTabProps) {
  const [filter, setFilter] = useState<ParticipantFilter>('all');
  const [search, setSearch] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPDFOpen, setImportPDFOpen] = useState(false);
  const [briefProspect, setBriefProspect] = useState<any>(null);
  const [convertProspect, setConvertProspect] = useState<{ prospectId: string; prospect: MeetingProspect } | null>(null);
  const [loadingConvertId, setLoadingConvertId] = useState<string | null>(null);

  const { data: participants = [], isLoading } = useMeetingParticipants(meetingId);
  const updateAttendance = useUpdateParticipantAttendance();
  const removeParticipant = useRemoveParticipant();
  const generateBrief = useGenerateProspectBrief();

  const filteredParticipants = participants.filter((p) => {
    // Apply type filter
    if (filter === 'members' && !p.is_member) return false;
    if (filter === 'new' && !p.is_new) return false;

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      const name = p.contact?.full_name?.toLowerCase() ?? '';
      const company = p.contact?.company?.toLowerCase() ?? '';
      return name.includes(searchLower) || company.includes(searchLower);
    }

    return true;
  });

  const attendedCount = participants.filter((p) => p.attendance_status === 'attended').length;

  const handleAttendanceChange = async (participantId: string, attended: boolean) => {
    try {
      await updateAttendance.mutateAsync({
        participantId,
        attendanceStatus: attended ? 'attended' : 'invited',
        meetingId,
      });
    } catch (error) {
      toast.error('Błąd podczas aktualizacji obecności');
    }
  };

  const handleRemoveParticipant = async (participantId: string) => {
    try {
      await removeParticipant.mutateAsync({ participantId, meetingId });
      toast.success('Uczestnik został usunięty');
    } catch (error) {
      toast.error('Błąd podczas usuwania uczestnika');
    }
  };

  const handleOpenConvertDialog = async (prospectId: string) => {
    setLoadingConvertId(prospectId);
    try {
      const { data, error } = await (supabase as any)
        .from('meeting_prospects')
        .select('*')
        .eq('id', prospectId)
        .single();

      if (error) throw error;
      setConvertProspect({ prospectId, prospect: data as MeetingProspect });
    } catch {
      toast.error('Nie udało się pobrać danych prospekta');
    } finally {
      setLoadingConvertId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded w-full" />
            <div className="h-10 bg-muted rounded w-full" />
            <div className="h-10 bg-muted rounded w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj uczestnika..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={filter} onValueChange={(v) => setFilter(v as ParticipantFilter)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszyscy</SelectItem>
              <SelectItem value="members">Moi członkowie</SelectItem>
              <SelectItem value="new">Nowi</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportPDFOpen(true)} className="gap-2">
            <FileText className="h-4 w-4" />
            Importuj z PDF
          </Button>
          <Button variant="outline" onClick={() => setImportModalOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            Importuj z CSV
          </Button>
          <Button onClick={() => setAddModalOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Dodaj uczestnika
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filteredParticipants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <UserPlus className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">Brak uczestników</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                {search || filter !== 'all'
                  ? 'Nie znaleziono uczestników spełniających kryteria.'
                  : 'Dodaj uczestników do tego spotkania.'}
              </p>
              {!search && filter === 'all' && (
                <Button onClick={() => setAddModalOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Dodaj pierwszego uczestnika
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Imię i nazwisko</TableHead>
                  <TableHead>Firma</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12 text-center">Brief</TableHead>
                  <TableHead className="w-24 text-center">Kanban</TableHead>
                  <TableHead className="text-center">Obecność</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParticipants.map((participant) => {
                  const isProspect = !!(participant as any).prospect_id && !participant.contact_id;
                  return (
                    <TableRow key={participant.id}>
                      <TableCell className="font-medium">
                        {participant.contact?.full_name ?? 'Nieznany kontakt'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {participant.contact?.company ?? '—'}
                      </TableCell>
                      <TableCell>
                        <ParticipantBadge
                          isMember={participant.is_member}
                          isNew={participant.is_new}
                          primaryGroupId={participant.contact?.primary_group_id}
                          isProspect={isProspect}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        {(participant as any).prospect_id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => setBriefProspect((participant as any).prospect_id)}
                          >
                            <Sparkles className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {isProspect && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            disabled={loadingConvertId === (participant as any).prospect_id}
                            onClick={() => handleOpenConvertDialog((participant as any).prospect_id)}
                          >
                            <ArrowRightCircle className="h-3.5 w-3.5" />
                            Do Kanban
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={participant.attendance_status === 'attended'}
                          onCheckedChange={(checked) =>
                            handleAttendanceChange(participant.id, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveParticipant(participant.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground text-center">
        {attendedCount} obecnych z {participants.length} zaproszonych
      </div>

      <AddParticipantModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        meetingId={meetingId}
        existingParticipantIds={participants.map((p) => p.contact_id)}
      />

      <ImportCSVModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        meetingId={meetingId}
      />

      {meetingName && meetingDate && (
        <ImportPDFMeetingDialog
          open={importPDFOpen}
          onOpenChange={setImportPDFOpen}
          meetingId={meetingId}
          meetingName={meetingName}
          meetingDate={meetingDate}
        />
      )}

      {convertProspect && (
        <ProspectingConvertDialog
          open={!!convertProspect}
          onOpenChange={(isOpen) => { if (!isOpen) setConvertProspect(null); }}
          prospectId={convertProspect.prospectId}
          prospect={convertProspect.prospect}
        />
      )}
    </div>
  );
}
