import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { ParsedPerson } from '@/hooks/useMeetingProspects';

export type ParticipantMatchType = 'member' | 'cc_member' | 'prospect' | 'existing_prospect';

export interface MatchedParticipant {
  parsed: ParsedPerson;
  matchType: ParticipantMatchType;
  contactId?: string;
  prospectId?: string;
  contactFullName?: string;
  contactCompany?: string | null;
  primaryGroupId?: string | null;
  groupName?: string | null;
  hasAiBrief?: boolean;
}

export async function matchContactsFromParsed(
  people: ParsedPerson[],
  tenantId: string,
  directorId: string
): Promise<MatchedParticipant[]> {
  // Fetch contacts and existing prospects in parallel
  const [contactsResult, prospectsResult] = await Promise.all([
    supabase
      .from('contacts')
      .select('id, full_name, company, primary_group_id, director_id, contact_groups(name)')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .limit(1000),
    supabase
      .from('meeting_prospects')
      .select('id, full_name, company, position, industry, ai_brief, prospecting_status')
      .eq('tenant_id', tenantId)
      .limit(1000),
  ]);

  const contactList = contactsResult.data || [];
  const prospectList = prospectsResult.data || [];

  return people.map((person) => {
    const nameLower = person.full_name.toLowerCase().trim();

    // 1. Try to find matching contact by name
    const match = contactList.find((c) => {
      const cName = c.full_name?.toLowerCase().trim();
      if (cName === nameLower) return true;
      if (person.company && c.company) {
        return (
          cName === nameLower &&
          c.company.toLowerCase().includes(person.company.toLowerCase())
        );
      }
      return false;
    });

    if (match) {
      const isMember = match.director_id === directorId;
      return {
        parsed: person,
        matchType: isMember ? 'member' : 'cc_member',
        contactId: match.id,
        contactFullName: match.full_name,
        contactCompany: match.company,
        primaryGroupId: match.primary_group_id,
        groupName: (match as any).contact_groups?.name || null,
      } as MatchedParticipant;
    }

    // 2. Try to find existing prospect by name
    const prospectMatch = prospectList.find(
      (p) => p.full_name?.toLowerCase().trim() === nameLower
    );

    if (prospectMatch) {
      return {
        parsed: person,
        matchType: 'existing_prospect' as ParticipantMatchType,
        prospectId: prospectMatch.id,
        contactFullName: prospectMatch.full_name,
        contactCompany: prospectMatch.company,
        hasAiBrief: !!prospectMatch.ai_brief,
      };
    }

    // 3. New prospect
    return {
      parsed: person,
      matchType: 'prospect' as ParticipantMatchType,
    };
  });
}

export function useImportPDFParticipants() {
  const queryClient = useQueryClient();
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;
  const directorId = director?.id;

  return useMutation({
    mutationFn: async ({
      meetingId,
      meetingName,
      meetingDate,
      teamId,
      participants,
      sourceFileName,
    }: {
      meetingId: string;
      meetingName: string;
      meetingDate: string;
      teamId: string;
      participants: MatchedParticipant[];
      sourceFileName: string;
    }) => {
      if (!tenantId || !directorId) throw new Error('Brak autoryzacji');

      const sourceEvent = `${meetingName} (${new Date(meetingDate).toLocaleDateString('pl-PL')})`;

      // Separate by type
      const existingContacts = participants.filter((p) => p.contactId);
      const existingProspects = participants.filter((p) => p.matchType === 'existing_prospect');
      const newProspects = participants.filter((p) => p.matchType === 'prospect');

      // 1. Insert existing contacts as meeting_participants
      if (existingContacts.length > 0) {
        const participantRows = existingContacts.map((p) => ({
          meeting_id: meetingId,
          contact_id: p.contactId!,
          is_member: p.matchType === 'member',
          is_new: false,
        }));

        const { error } = await supabase
          .from('meeting_participants')
          .insert(participantRows);
        if (error) throw error;
      }

      // 2. Insert existing prospects as meeting_participants (reuse prospect_id)
      if (existingProspects.length > 0) {
        const rows = existingProspects.map((p) => ({
          meeting_id: meetingId,
          prospect_id: p.prospectId!,
          is_member: false,
          is_new: false,
        }));

        const { error } = await supabase
          .from('meeting_participants')
          .insert(rows);
        if (error) throw error;
      }

      // 3. Insert new prospects into meeting_prospects + meeting_participants
      if (newProspects.length > 0) {
        const prospectRows = newProspects.map((p) => ({
          team_id: teamId,
          tenant_id: tenantId,
          full_name: p.parsed.full_name,
          company: p.parsed.company,
          position: p.parsed.position,
          industry: p.parsed.industry,
          source_event: sourceEvent,
          source_file_name: sourceFileName,
          imported_by: directorId,
          is_prospecting: true,
          prospecting_status: 'new',
          meeting_id: meetingId,
        }));

        const { data: insertedProspects, error: prospectError } = await (supabase as any)
          .from('meeting_prospects')
          .insert(prospectRows)
          .select('id');
        if (prospectError) throw prospectError;

        if (insertedProspects && insertedProspects.length > 0) {
          const prospectParticipantRows = insertedProspects.map((mp: any) => ({
            meeting_id: meetingId,
            prospect_id: mp.id,
            is_member: false,
            is_new: true,
          }));

          const { error: partError } = await supabase
            .from('meeting_participants')
            .insert(prospectParticipantRows);
          if (partError) throw partError;
        }
      }

      return {
        meetingId,
        teamId,
        contactCount: existingContacts.length,
        existingProspectCount: existingProspects.length,
        prospectCount: newProspects.length,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-participants', result.meetingId] });
      queryClient.invalidateQueries({ queryKey: ['meeting-prospects', result.teamId] });
      const parts = [];
      if (result.contactCount > 0) parts.push(`${result.contactCount} kontaktów`);
      if (result.existingProspectCount > 0) parts.push(`${result.existingProspectCount} istn. prospektów`);
      if (result.prospectCount > 0) parts.push(`${result.prospectCount} nowych prospektów`);
      toast.success(`Zaimportowano: ${parts.join(', ')}`);
    },
    onError: (error: Error) => {
      toast.error(`Błąd importu: ${error.message}`);
    },
  });
}
