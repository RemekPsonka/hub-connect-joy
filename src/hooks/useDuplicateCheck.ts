import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Contact, ContactInsert } from './useContacts';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingContact: Partial<Contact> | null;
}

export interface ContactRelatedData {
  tasks: number;
  projects: number;
  deals: number;
  hasAI: boolean;
  hasProfileSummary: boolean;
  consultations: number;
  needs: number;
  offers: number;
}

export interface ContactWithRelations extends Contact {
  _relatedData?: ContactRelatedData;
}

export interface DuplicateGroup {
  type: 'email' | 'phone' | 'name';
  key: string;
  contacts: ContactWithRelations[];
}

export interface UseDuplicateCheckReturn {
  checkForDuplicate: (contact: Partial<ContactInsert>) => Promise<DuplicateCheckResult>;
  mergeContacts: (existingContactId: string, newContactData: Partial<ContactInsert>) => Promise<Contact>;
  isChecking: boolean;
  isMerging: boolean;
}

export function useDuplicateCheck(): UseDuplicateCheckReturn {
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;
  const [isChecking, setIsChecking] = useState(false);
  const [isMerging, setIsMerging] = useState(false);

  const checkForDuplicate = useCallback(async (contact: Partial<ContactInsert>): Promise<DuplicateCheckResult> => {
    if (!tenantId) {
      return { isDuplicate: false, existingContact: null };
    }

    if (!contact.first_name || !contact.last_name) {
      return { isDuplicate: false, existingContact: null };
    }

    if (!contact.phone && !contact.email) {
      return { isDuplicate: false, existingContact: null };
    }

    setIsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-duplicate-contact', {
        body: {
          contact: {
            first_name: contact.first_name,
            last_name: contact.last_name,
            email: contact.email || null,
            phone: contact.phone || null,
            tenant_id: tenantId,
          }
        }
      });

      if (error) {
        console.error('Error checking duplicate:', error);
        return { isDuplicate: false, existingContact: null };
      }

      return {
        isDuplicate: data?.isDuplicate || false,
        existingContact: data?.existingContact || null,
      };
    } catch (error) {
      console.error('Error in checkForDuplicate:', error);
      return { isDuplicate: false, existingContact: null };
    } finally {
      setIsChecking(false);
    }
  }, [tenantId]);

  const mergeContacts = useCallback(async (
    existingContactId: string, 
    newContactData: Partial<ContactInsert>
  ): Promise<Contact> => {
    if (!tenantId) {
      throw new Error('Brak tenant_id');
    }

    setIsMerging(true);
    try {
      const { data, error } = await supabase.functions.invoke('merge-contacts', {
        body: {
          existingContactId,
          newContactData,
          tenant_id: tenantId,
        }
      });

      if (error) {
        throw new Error(error.message || 'Błąd podczas scalania kontaktów');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data.contact as Contact;
    } finally {
      setIsMerging(false);
    }
  }, [tenantId]);

  return {
    checkForDuplicate,
    mergeContacts,
    isChecking,
    isMerging,
  };
}

// Helper to build related data map
async function fetchRelatedDataMap(contactIds: string[]): Promise<Map<string, ContactRelatedData>> {
  const map = new Map<string, ContactRelatedData>();
  if (contactIds.length === 0) return map;

  // Initialize all contacts
  contactIds.forEach(id => map.set(id, {
    tasks: 0, projects: 0, deals: 0, hasAI: false,
    hasProfileSummary: false, consultations: 0, needs: 0, offers: 0,
  }));

  const [taskRes, projectRes, dealRes, aiRes, consultRes, needsRes, offersRes] = await Promise.all([
    supabase.from('task_contacts').select('contact_id').in('contact_id', contactIds),
    supabase.from('project_contacts').select('contact_id').in('contact_id', contactIds),
    supabase.from('deal_team_contacts').select('contact_id').in('contact_id', contactIds),
    supabase.from('contact_agent_memory').select('contact_id').in('contact_id', contactIds),
    supabase.from('consultations').select('contact_id').in('contact_id', contactIds),
    supabase.from('needs').select('contact_id').in('contact_id', contactIds),
    supabase.from('offers').select('contact_id').in('contact_id', contactIds),
  ]);

  // Count tasks per contact
  (taskRes.data || []).forEach(r => {
    const d = map.get(r.contact_id);
    if (d) d.tasks++;
  });
  // Count projects
  (projectRes.data || []).forEach(r => {
    const d = map.get(r.contact_id);
    if (d) d.projects++;
  });
  // Count deals
  (dealRes.data || []).forEach(r => {
    const d = map.get(r.contact_id);
    if (d) d.deals++;
  });
  // AI memory
  (aiRes.data || []).forEach(r => {
    const d = map.get(r.contact_id);
    if (d) d.hasAI = true;
  });
  // Consultations
  (consultRes.data || []).forEach(r => {
    const d = map.get(r.contact_id);
    if (d) d.consultations++;
  });
  // Needs
  (needsRes.data || []).forEach(r => {
    const d = map.get(r.contact_id);
    if (d) d.needs++;
  });
  // Offers
  (offersRes.data || []).forEach(r => {
    const d = map.get(r.contact_id);
    if (d) d.offers++;
  });

  return map;
}

// Hook to find all duplicate contacts in the database
export function useFindDuplicates(enabled: boolean = true) {
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;

  return useQuery({
    queryKey: ['duplicates', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      // Get all active contacts
      const { data: contacts, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      if (error) throw error;
      if (!contacts) return [];

      const duplicateGroups: DuplicateGroup[] = [];
      const processedKeys = new Set<string>();

      // Find duplicates by email
      const emailMap = new Map<string, Contact[]>();
      contacts.forEach(contact => {
        if (contact.email) {
          const email = contact.email.toLowerCase().trim();
          if (!emailMap.has(email)) {
            emailMap.set(email, []);
          }
          emailMap.get(email)!.push(contact);
        }
      });

      emailMap.forEach((contactList, email) => {
        if (contactList.length > 1) {
          const firstNames = new Set(
            contactList
              .map(c => c.first_name?.toLowerCase().trim())
              .filter(Boolean)
          );
          if (firstNames.size > 1) return;
          if (firstNames.size === 0) return; // Brak imion = różne kontakty, pomijaj

          const key = `email:${email}`;
          if (!processedKeys.has(key)) {
            processedKeys.add(key);
            duplicateGroups.push({
              type: 'email',
              key: email,
              contacts: contactList,
            });
          }
        }
      });

      // Find duplicates by phone
      const phoneMap = new Map<string, Contact[]>();
      contacts.forEach(contact => {
        if (contact.phone) {
          const phone = contact.phone.replace(/\D/g, '');
          if (phone.length >= 9) {
            const normalizedPhone = phone.slice(-9);
            if (!phoneMap.has(normalizedPhone)) {
              phoneMap.set(normalizedPhone, []);
            }
            phoneMap.get(normalizedPhone)!.push(contact);
          }
        }
      });

      phoneMap.forEach((contactList, phone) => {
        if (contactList.length > 1) {
          const firstNames = new Set(
            contactList
              .map(c => c.first_name?.toLowerCase().trim())
              .filter(Boolean)
          );
          if (firstNames.size > 1) return;
          if (firstNames.size === 0) return; // Brak imion = różne kontakty, pomijaj

          const emailDupIds = new Set(
            duplicateGroups
              .filter(g => g.type === 'email')
              .flatMap(g => g.contacts.map(c => c.id))
          );
          const uniqueContacts = contactList.filter(c => !emailDupIds.has(c.id));
          
          if (uniqueContacts.length > 1) {
            const key = `phone:${phone}`;
            if (!processedKeys.has(key)) {
              processedKeys.add(key);
              duplicateGroups.push({
                type: 'phone',
                key: phone,
                contacts: contactList,
              });
            }
          }
        }
      });

      // Find duplicates by exact name match
      const nameMap = new Map<string, Contact[]>();
      contacts.forEach(contact => {
        if (contact.first_name && contact.last_name) {
          const name = `${contact.first_name.toLowerCase().trim()} ${contact.last_name.toLowerCase().trim()}`;
          if (!nameMap.has(name)) {
            nameMap.set(name, []);
          }
          nameMap.get(name)!.push(contact);
        }
      });

      nameMap.forEach((contactList, name) => {
        if (contactList.length > 1) {
          const existingDupIds = new Set(
            duplicateGroups.flatMap(g => g.contacts.map(c => c.id))
          );
          const uniqueContacts = contactList.filter(c => !existingDupIds.has(c.id));
          
          if (uniqueContacts.length > 1) {
            const key = `name:${name}`;
            if (!processedKeys.has(key)) {
              processedKeys.add(key);
              duplicateGroups.push({
                type: 'name',
                key: name,
                contacts: contactList,
              });
            }
          }
        }
      });

      // Fetch related data for all contacts in duplicate groups
      const allContactIds = [...new Set(duplicateGroups.flatMap(g => g.contacts.map(c => c.id)))];
      const relatedDataMap = await fetchRelatedDataMap(allContactIds);

      // Attach related data to contacts & mark profile_summary
      duplicateGroups.forEach(group => {
        group.contacts = group.contacts.map(c => ({
          ...c,
          _relatedData: {
            ...relatedDataMap.get(c.id)!,
            hasProfileSummary: !!c.profile_summary,
          },
        }));
      });

      return duplicateGroups;
    },
    enabled: !!tenantId && enabled,
  });
}

// Hook to merge multiple contacts into one
export function useMergeMultipleContacts() {
  const queryClient = useQueryClient();
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;

  return useMutation({
    mutationFn: async ({ primaryContactId, duplicateIds }: { primaryContactId: string; duplicateIds: string[] }) => {
      if (!tenantId) throw new Error('Brak tenant_id');

      // 1. Get all contacts to merge
      const { data: contacts, error: fetchError } = await supabase
        .from('contacts')
        .select('*')
        .in('id', [primaryContactId, ...duplicateIds]);

      if (fetchError) throw fetchError;
      if (!contacts || contacts.length === 0) throw new Error('Nie znaleziono kontaktów');

      const primaryContact = contacts.find(c => c.id === primaryContactId);
      const duplicates = contacts.filter(c => c.id !== primaryContactId);

      if (!primaryContact) throw new Error('Nie znaleziono głównego kontaktu');

      // 2. Merge data - fill empty fields from duplicates
      const mergedData: Record<string, unknown> = {};
      const fieldsToMerge = [
        'company', 'position', 'title',
        'city', 'linkedin_url', 'met_date', 'met_source', 'company_id', 'primary_group_id'
      ];

      fieldsToMerge.forEach(field => {
        const primaryValue = primaryContact[field as keyof typeof primaryContact];
        if (!primaryValue) {
          for (const dup of duplicates) {
            const dupValue = dup[field as keyof typeof dup];
            if (dupValue) {
              mergedData[field] = dupValue;
              break;
            }
          }
        }
      });

      // Smart phone merge - preserve different numbers
      for (const dup of duplicates) {
        if (dup.phone && dup.phone !== primaryContact.phone) {
          if (!primaryContact.phone && !mergedData.phone) {
            mergedData.phone = dup.phone;
          } else if (!primaryContact.phone_business && !mergedData.phone_business) {
            mergedData.phone_business = dup.phone;
          }
        }
        if (dup.phone_business && dup.phone_business !== primaryContact.phone_business) {
          if (!primaryContact.phone_business && !mergedData.phone_business) {
            mergedData.phone_business = dup.phone_business;
          }
        }
      }

      // Smart email merge - preserve different emails
      for (const dup of duplicates) {
        if (dup.email && dup.email !== primaryContact.email) {
          if (!primaryContact.email && !mergedData.email) {
            mergedData.email = dup.email;
          } else if (!primaryContact.email_secondary && !mergedData.email_secondary) {
            mergedData.email_secondary = dup.email;
          }
        }
        if (dup.email_secondary && dup.email_secondary !== primaryContact.email_secondary) {
          if (!primaryContact.email_secondary && !mergedData.email_secondary) {
            mergedData.email_secondary = dup.email_secondary;
          }
        }
      }

      // Smart address merge
      for (const dup of duplicates) {
        if (dup.address && dup.address !== primaryContact.address) {
          if (!primaryContact.address && !mergedData.address) {
            mergedData.address = dup.address;
          } else if (!primaryContact.address_secondary && !mergedData.address_secondary) {
            mergedData.address_secondary = dup.address;
          }
        }
      }

      // Keep best profile_summary (longest non-empty)
      const allSummaries = [primaryContact, ...duplicates]
        .map(c => c.profile_summary)
        .filter(Boolean) as string[];
      if (allSummaries.length > 0) {
        const best = allSummaries.reduce((a, b) => a.length >= b.length ? a : b);
        if (best !== primaryContact.profile_summary) {
          mergedData.profile_summary = best;
        }
      }

      // Keep best profile_embedding (non-null, prefer primary's)
      if (!primaryContact.profile_embedding) {
        const dupWithEmbedding = duplicates.find(d => d.profile_embedding);
        if (dupWithEmbedding) {
          mergedData.profile_embedding = dupWithEmbedding.profile_embedding;
        }
      }

      // Merge tags (unique)
      const allTags = new Set<string>();
      [primaryContact, ...duplicates].forEach(c => {
        if (c.tags) {
          c.tags.forEach((tag: string) => allTags.add(tag));
        }
      });
      if (allTags.size > 0) {
        mergedData.tags = Array.from(allTags);
      }

      // Merge notes
      const allNotes: string[] = [];
      [primaryContact, ...duplicates].forEach(c => {
        if (c.notes) {
          allNotes.push(c.notes);
        }
      });
      if (allNotes.length > 1) {
        mergedData.notes = allNotes.join('\n\n---\n\n');
      }

      // Use higher relationship_strength
      const maxStrength = Math.max(
        primaryContact.relationship_strength || 0,
        ...duplicates.map(d => d.relationship_strength || 0)
      );
      if (maxStrength > (primaryContact.relationship_strength || 0)) {
        mergedData.relationship_strength = maxStrength;
      }

      // 3. Update primary contact with merged data
      if (Object.keys(mergedData).length > 0) {
        const { error: updateError } = await supabase
          .from('contacts')
          .update(mergedData)
          .eq('id', primaryContactId);

        if (updateError) throw updateError;
      }

      // 4. Transfer all related records from duplicates to primary
      for (const dupId of duplicateIds) {
        await Promise.all([
          // Transfer task_contacts
          supabase.from('task_contacts').update({ contact_id: primaryContactId }).eq('contact_id', dupId),
          // Transfer project_contacts
          supabase.from('project_contacts').update({ contact_id: primaryContactId }).eq('contact_id', dupId),
          // Transfer deal_team_contacts
          supabase.from('deal_team_contacts').update({ contact_id: primaryContactId }).eq('contact_id', dupId),
          // Transfer connections (both directions)
          supabase.from('connections').update({ contact_a_id: primaryContactId }).eq('contact_a_id', dupId),
          supabase.from('connections').update({ contact_b_id: primaryContactId }).eq('contact_b_id', dupId),
          // Transfer consultations
          supabase.from('consultations').update({ contact_id: primaryContactId }).eq('contact_id', dupId),
          // (Sprint 04: agent_conversations usunięte z bazy)
          // Transfer consultation_guests
          supabase.from('consultation_guests').update({ contact_id: primaryContactId }).eq('contact_id', dupId),
          // Transfer consultation_meetings
          supabase.from('consultation_meetings').update({ contact_id: primaryContactId }).eq('contact_id', dupId),
          // Transfer consultation_recommendations
          supabase.from('consultation_recommendations').update({ contact_id: primaryContactId }).eq('contact_id', dupId),
          // Transfer consultation_thanks
          supabase.from('consultation_thanks').update({ contact_id: primaryContactId }).eq('contact_id', dupId),
          // Transfer needs
          supabase.from('needs').update({ contact_id: primaryContactId }).eq('contact_id', dupId),
          // Transfer offers
          supabase.from('offers').update({ contact_id: primaryContactId }).eq('contact_id', dupId),
          // Transfer business_interviews
          supabase.from('business_interviews').update({ contact_id: primaryContactId }).eq('contact_id', dupId),
          // Transfer contact_activity_log
          supabase.from('contact_activity_log').update({ contact_id: primaryContactId }).eq('contact_id', dupId),
        ]);

        // Transfer agent memory: if primary doesn't have it, move it; else delete dup's
        const { data: dupMemory } = await supabase
          .from('contact_agent_memory')
          .select('*')
          .eq('contact_id', dupId)
          .maybeSingle();

        if (dupMemory) {
          const { data: primaryMemory } = await supabase
            .from('contact_agent_memory')
            .select('id')
            .eq('contact_id', primaryContactId)
            .maybeSingle();

          if (!primaryMemory) {
            await supabase.from('contact_agent_memory')
              .update({ contact_id: primaryContactId })
              .eq('contact_id', dupId);
          } else {
            await supabase.from('contact_agent_memory')
              .delete()
              .eq('contact_id', dupId);
          }
        }
      }

      // 5. Deactivate duplicates (soft delete)
      const { error: deactivateError } = await supabase
        .from('contacts')
        .update({ is_active: false })
        .in('id', duplicateIds);

      if (deactivateError) throw deactivateError;

      // 6. Record merge history
      for (const dup of duplicates) {
        await supabase
          .from('contact_merge_history')
          .insert([{
            tenant_id: tenantId,
            primary_contact_id: primaryContactId,
            merged_contact_data: JSON.parse(JSON.stringify(dup)),
            merge_source: 'manual_duplicate_merge',
            ai_integrated_fields: Object.keys(mergedData),
          }]);
      }

      return { primaryContactId, mergedCount: duplicateIds.length };
    },
    onSuccess: ({ primaryContactId, mergedCount }) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['duplicates'] });
      queryClient.invalidateQueries({ queryKey: ['contact', primaryContactId] });
      toast.success(`Scalono ${mergedCount} duplikat${mergedCount === 1 ? '' : mergedCount < 5 ? 'y' : 'ów'}`);
    },
    onError: (error) => {
      console.error('Error merging contacts:', error);
      toast.error(error instanceof Error ? error.message : 'Błąd podczas scalania kontaktów');
    },
  });
}
