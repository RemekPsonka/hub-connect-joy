import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Contact, ContactInsert } from './useContacts';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingContact: Partial<Contact> | null;
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
