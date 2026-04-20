import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type {
  DealTeamContact,
  DealTeamContactStats,
  DealCategory,
  AddContactToTeamInput,
  UpdateTeamContactInput,
  PromoteContactInput,
} from '@/types/dealTeam';

// ===== QUERIES =====

/**
 * Pobiera kontakty dealowe zespołu z JOIN contacts
 * Opcjonalny filtr po kategorii
 * Domyślnie pomija zamknięte statusy (won, lost, disqualified)
 */
export function useTeamContacts(
  teamId: string | undefined,
  category?: DealCategory,
  includeClosedStatuses = false
) {
  return useQuery({
    queryKey: ['deal-team-contacts', teamId, category || 'all', includeClosedStatuses],
    queryFn: async () => {
      if (!teamId) return [];

      // Pobierz kontakty dealowe
      let query = supabase
        .from('deal_team_contacts')
        .select('*')
        .eq('team_id', teamId);

      if (!includeClosedStatuses) {
        query = query.not('status', 'in', '("won","lost","disqualified")');
      }

      if (category) {
        query = query.eq('category', category);
      }

      query = query
        .order('priority', { ascending: false })
        .order('next_action_date', { ascending: true, nullsFirst: false });

      const { data: dealContacts, error } = await query;
      if (error) throw error;
      if (!dealContacts || dealContacts.length === 0) return [];

      // Pobierz powiązane kontakty CRM
      const contactIds = [...new Set(dealContacts.map(dc => dc.contact_id))];
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, full_name, company, position, email, phone, city, company_id')
        .in('id', contactIds);

      // Resolve company name from companies table when missing
      const needCompanyResolve = contacts?.filter(c => !c.company && c.company_id) || [];
      if (needCompanyResolve.length > 0) {
        const companyIds = [...new Set(needCompanyResolve.map(c => c.company_id!))];
        const { data: companies } = await supabase
          .from('companies')
          .select('id, name')
          .in('id', companyIds);
        const companyMap = new Map(companies?.map(co => [co.id, co.name]) || []);
        for (const c of contacts || []) {
          if (!c.company && c.company_id) {
            (c as any).company = companyMap.get(c.company_id) || null;
          }
        }
      }

      // Mapuj kontakty do deal contacts
      const contactMap = new Map(contacts?.map(c => [c.id, c]) || []);
      
      return dealContacts
        .map(dc => ({
          ...dc,
          contact: contactMap.get(dc.contact_id),
        }))
        .filter(dc => dc.contact !== undefined) as DealTeamContact[];
    },
    enabled: !!teamId,
    staleTime: 2 * 60 * 1000, // 2 min - kontakty są bardziej dynamiczne
  });
}

/**
 * Pobiera pojedynczy kontakt dealowy
 */
export function useTeamContact(contactId: string | undefined) {
  return useQuery({
    queryKey: ['deal-team-contact', contactId],
    queryFn: async () => {
      if (!contactId) return null;

      // Pobierz deal contact
      const { data: dealContact, error } = await supabase
        .from('deal_team_contacts')
        .select('*')
        .eq('id', contactId)
        .single();

      if (error) throw error;
      if (!dealContact) return null;

      // Pobierz powiązany kontakt CRM
      const { data: contact } = await supabase
        .from('contacts')
        .select('id, full_name, company, position, email, phone, city, company_id')
        .eq('id', dealContact.contact_id)
        .single();

      // Resolve company name from companies table when missing
      if (contact && !contact.company && contact.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('name')
          .eq('id', contact.company_id)
          .single();
        if (company) {
          (contact as any).company = company.name;
        }
      }

      return {
        ...dealContact,
        contact: contact || undefined,
      } as DealTeamContact;
    },
    enabled: !!contactId,
  });
}

/**
 * Oblicza statystyki kontaktów zespołu z danych useTeamContacts
 */
export function useTeamContactStats(teamId: string | undefined): DealTeamContactStats {
  // Pobierz wszystkie kontakty (bez filtra kategorii, z zamkniętymi)
  const { data: contacts = [] } = useTeamContacts(teamId, undefined, false);

  return useMemo(() => ({
    hot_count: contacts.filter(c => c.category === 'hot').length,
    top_count: contacts.filter(c => c.category === 'top').length,
    lead_count: contacts.filter(c => c.category === 'lead').length,
    tenx_count: contacts.filter(c => c.category === '10x').length,
    cold_count: contacts.filter(c => c.category === 'cold').length,
    lost_count: contacts.filter(c => c.category === 'lost').length,
    overdue_count: contacts.filter(c => c.status_overdue).length,
    total_value: contacts.reduce((sum, c) => sum + (c.estimated_value || 0), 0),
    upcoming_meetings: contacts.filter(c =>
      c.next_meeting_date && new Date(c.next_meeting_date) > new Date()
    ).length,
  }), [contacts]);
}

// ===== MUTATIONS =====

/**
 * Dodaje istniejący kontakt CRM do zespołu dealowego
 */
export function useAddContactToTeam() {
  const queryClient = useQueryClient();
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;

  return useMutation({
    mutationFn: async ({
      teamId,
      contactId,
      category,
      assignedTo,
      priority = 'medium',
      notes,
      estimatedValue,
      valueCurrency = 'PLN',
    }: AddContactToTeamInput) => {
      if (!tenantId) throw new Error('Brak tenant_id');

      // Sprawdź czy kontakt już nie jest w zespole
      const { data: existing } = await supabase
        .from('deal_team_contacts')
        .select('id')
        .eq('team_id', teamId)
        .eq('contact_id', contactId)
        .maybeSingle();

      if (existing) {
        throw new Error('Ten kontakt jest już dodany do zespołu');
      }

      const { error } = await supabase
        .from('deal_team_contacts')
        .insert({
          team_id: teamId,
          contact_id: contactId,
          tenant_id: tenantId,
          category,
          assigned_to: assignedTo || null,
          priority,
          notes: notes || null,
          estimated_value: estimatedValue || null,
          value_currency: valueCurrency,
          status: 'active',
        });

      if (error) throw error;
      return { teamId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['deal-team-contacts', result.teamId] });
      queryClient.invalidateQueries({ queryKey: ['deal-team-clients', result.teamId] });
      queryClient.invalidateQueries({ queryKey: ['contact-deal-teams'] });
      queryClient.invalidateQueries({ queryKey: ['contact-deal-teams-bulk'] });
      toast.success('Kontakt został dodany do zespołu');
    },
    onError: (error: Error) => {
      toast.error(`Błąd: ${error.message}`);
    },
  });
}

/**
 * Aktualizuje dane kontaktu dealowego
 */
export function useUpdateTeamContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      teamId,
      category,
      status,
      assignedTo,
      priority,
      nextMeetingDate,
      nextMeetingWith,
      nextAction,
      nextActionDate,
      nextActionOwner,
      dealId,
      estimatedValue,
      valueCurrency,
      notes,
      reviewFrequency,
      offeringStage,
      snoozedUntil,
      snoozeReason,
      snoozedFromCategory,
      clientStatus,
      isLost,
      lostReason,
      lostAt,
    }: UpdateTeamContactInput) => {
      const updates: Record<string, unknown> = {};

      if (category !== undefined) {
        updates.category = category;
        // Reset offering_stage to default for category with sub-kanbans
        const defaultSubStages: Record<string, string> = {
          offering: 'handshake',
          audit: 'audit_plan',
          hot: 'meeting_plan',
          top: 'meeting_plan',
        };
        if (defaultSubStages[category]) {
          updates.offering_stage = defaultSubStages[category];
        }
      }
      if (status !== undefined) {
        updates.status = status;
        updates.last_status_update = new Date().toISOString();
      }
      if (assignedTo !== undefined) updates.assigned_to = assignedTo;
      if (priority !== undefined) updates.priority = priority;
      if (nextMeetingDate !== undefined) updates.next_meeting_date = nextMeetingDate;
      if (nextMeetingWith !== undefined) updates.next_meeting_with = nextMeetingWith;
      if (nextAction !== undefined) updates.next_action = nextAction;
      if (nextActionDate !== undefined) updates.next_action_date = nextActionDate;
      if (nextActionOwner !== undefined) updates.next_action_owner = nextActionOwner;
      if (dealId !== undefined) updates.deal_id = dealId;
      if (estimatedValue !== undefined) updates.estimated_value = estimatedValue;
      if (valueCurrency !== undefined) updates.value_currency = valueCurrency;
      if (notes !== undefined) updates.notes = notes;
      if (reviewFrequency !== undefined) updates.review_frequency = reviewFrequency;
      if (offeringStage !== undefined) updates.offering_stage = offeringStage;
      if (snoozedUntil !== undefined) updates.snoozed_until = snoozedUntil;
      if (snoozeReason !== undefined) updates.snooze_reason = snoozeReason;
      if (snoozedFromCategory !== undefined) updates.snoozed_from_category = snoozedFromCategory;
      if (clientStatus !== undefined) updates.client_status = clientStatus;
      if (isLost !== undefined) {
        updates.is_lost = isLost;
        if (isLost) {
          updates.lost_at = lostAt ?? new Date().toISOString();
        }
      }
      if (lostReason !== undefined) updates.lost_reason = lostReason;
      if (lostAt !== undefined && isLost === undefined) updates.lost_at = lostAt;

      const { error } = await supabase
        .from('deal_team_contacts')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      return { id, teamId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['deal-team-contacts', result.teamId] });
      queryClient.invalidateQueries({ queryKey: ['deal-team-contact', result.id] });
      queryClient.invalidateQueries({ queryKey: ['deal-team-contact-stage'] });
      queryClient.invalidateQueries({ queryKey: ['deal-team-assignments-all'] });
      queryClient.invalidateQueries({ queryKey: ['contact-deal-teams'] });
      queryClient.invalidateQueries({ queryKey: ['contact-deal-teams-bulk'] });
      queryClient.invalidateQueries({ queryKey: ['sgu-clients-portfolio'] });
      toast.success('Kontakt został zaktualizowany');
    },
    onError: (error: Error) => {
      toast.error(`Błąd aktualizacji: ${error.message}`);
    },
  });
}

/**
 * Usuwa kontakt z zespołu dealowego
 */
export function useRemoveContactFromTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactId, teamId }: { contactId: string; teamId: string }) => {
      const { error } = await supabase
        .from('deal_team_contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;
      return { teamId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['deal-team-contacts', result.teamId] });
      toast.success('Kontakt został usunięty z zespołu');
    },
    onError: (error: Error) => {
      toast.error(`Błąd usuwania: ${error.message}`);
    },
  });
}

/**
 * Promuje kontakt do wyższej kategorii z walidacją
 * LEAD → TOP: wymaga assigned_to i next_action
 * TOP → HOT: wymaga next_meeting_date
 */
export function usePromoteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, teamId, newCategory }: PromoteContactInput) => {
      // Pobierz aktualny kontakt
      const { data: contact, error: fetchError } = await supabase
        .from('deal_team_contacts')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (!contact) throw new Error('Kontakt nie został znaleziony');

      // Walidacja wymaganych pól w zależności od kategorii docelowej
      // COLD → LEAD: brak dodatkowych wymagań
      if (newCategory === 'top') {
        if (!contact.assigned_to) {
          throw new Error('Promocja do TOP wymaga przypisania osoby odpowiedzialnej');
        }
        if (!contact.next_action) {
          throw new Error('Promocja do TOP wymaga zdefiniowania następnej akcji');
        }
      }

      if (newCategory === 'hot') {
        if (!contact.next_meeting_date) {
          throw new Error('Promocja do HOT wymaga zaplanowanego spotkania');
        }
        if (!contact.assigned_to) {
          throw new Error('Promocja do HOT wymaga przypisania osoby odpowiedzialnej');
        }
      }

      // Aktualizacja kategorii (trigger automatycznie zapisze log i zaktualizuje category_changed_at)
      const { error: updateError } = await supabase
        .from('deal_team_contacts')
        .update({ category: newCategory })
        .eq('id', id);

      if (updateError) throw updateError;
      return { teamId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['deal-team-contacts', result.teamId] });
      toast.success('Kategoria została zmieniona');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Zmienia status kontaktu dealowego (active, on_hold, won, lost, disqualified)
 */
export function useChangeContactStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      teamId,
      status,
    }: {
      id: string;
      teamId: string;
      status: 'active' | 'on_hold' | 'won' | 'lost' | 'disqualified';
    }) => {
      const { error } = await supabase
        .from('deal_team_contacts')
        .update({
          status,
          last_status_update: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      return { teamId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['deal-team-contacts', result.teamId] });
      toast.success('Status został zmieniony');
    },
    onError: (error: Error) => {
      toast.error(`Błąd zmiany statusu: ${error.message}`);
    },
  });
}

/**
 * Generuje brief AI dla kontaktu dealowego
 */
export function useGenerateDealContactBrief() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dealContactId, teamId }: { dealContactId: string; teamId: string }) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prospect-ai-brief`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ source: 'deal_contact', dealContactId }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Nieznany błąd' }));
        throw new Error(err.error || `Błąd ${response.status}`);
      }

      const data = await response.json();
      return { brief: data.brief, teamId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['deal-team-contacts', result.teamId] });
      toast.success('Brief AI wygenerowany');
    },
    onError: (error: Error) => {
      toast.error(`Błąd generowania briefu: ${error.message}`);
    },
  });
}

/**
 * Cofa kontakt dealowy na listę prospecting
 */
export function useRevertToProspecting() {
  const queryClient = useQueryClient();
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;
  const userId = director?.id;

  return useMutation({
    mutationFn: async ({ dealContactId, teamId, contactId }: { dealContactId: string; teamId: string; contactId: string }) => {
      if (!tenantId || !userId) throw new Error('Brak autoryzacji');

      // 1. Fetch contact data
      const { data: contact, error: cErr } = await supabase
        .from('contacts')
        .select('full_name, company, position, email, phone, linkedin_url')
        .eq('id', contactId)
        .single();

      if (cErr || !contact) throw new Error('Nie znaleziono kontaktu');

      // 2. Create prospect
      const { error: insertErr } = await supabase
        .from('prospects')
        .insert({
          tenant_id: tenantId,
          source_type: 'meeting',
          source_id: teamId,
          team_id: teamId,
          full_name: contact.full_name,
          company: contact.company,
          position: contact.position,
          industry: null,
          email: contact.email,
          phone: contact.phone,
          linkedin_url: contact.linkedin_url,
          imported_by: userId,
          is_prospecting: true,
          status: 'new',
          source_event: 'Cofnięto z Kanban',
        });

      if (insertErr) throw insertErr;

      // 3. Delete from deal_team_contacts
      const { error: delErr } = await supabase
        .from('deal_team_contacts')
        .delete()
        .eq('id', dealContactId);

      if (delErr) throw delErr;

      // 4. Log activity
      await supabase.rpc('log_entity_change' as never, {
        p_entity_type: 'deal_team',
        p_entity_id: teamId,
        p_actor_id: userId,
        p_action: 'contact_removed',
        p_diff: {},
        p_metadata: {
          team_id: teamId,
          team_contact_id: null,
          note: `Cofnięto na listę prospecting: ${contact.full_name}`,
        },
      } as never);

      return { teamId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['deal-team-contacts', result.teamId] });
      queryClient.invalidateQueries({ queryKey: ['meeting-prospects', result.teamId] });
      toast.success('Kontakt cofnięty na listę prospecting');
    },
    onError: (error: Error) => {
      toast.error(`Błąd: ${error.message}`);
    },
  });
}
