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

export interface DuplicateGroup {
  type: 'email' | 'phone' | 'name';
  key: string;
  contacts: Contact[];
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

    // Nie sprawdzaj jeśli brak podstawowych danych identyfikacyjnych
    if (!contact.first_name || !contact.last_name) {
      return { isDuplicate: false, existingContact: null };
    }

    // Nie sprawdzaj jeśli brak telefonu i emaila
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
          // Normalize phone number
          const phone = contact.phone.replace(/\D/g, '');
          if (phone.length >= 9) {
            const normalizedPhone = phone.slice(-9); // Last 9 digits
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

          // Filter out contacts already in email duplicates
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

      // Find duplicates by exact name match (first + last)
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
          // Filter out contacts already in other duplicate groups
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
        'email', 'phone', 'phone_business', 'company', 'position', 'title',
        'city', 'linkedin_url', 'met_date', 'met_source', 'company_id', 'primary_group_id'
      ];

      fieldsToMerge.forEach(field => {
        const primaryValue = primaryContact[field as keyof typeof primaryContact];
        if (!primaryValue) {
          // Find first non-empty value from duplicates
          for (const dup of duplicates) {
            const dupValue = dup[field as keyof typeof dup];
            if (dupValue) {
              mergedData[field] = dupValue;
              break;
            }
          }
        }
      });

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

      // 4. Deactivate duplicates (soft delete)
      const { error: deactivateError } = await supabase
        .from('contacts')
        .update({ is_active: false })
        .in('id', duplicateIds);

      if (deactivateError) throw deactivateError;

      // 5. Record merge history
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
