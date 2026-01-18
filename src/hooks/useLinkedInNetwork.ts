import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface LinkedInNetworkContact {
  id: string;
  tenant_id: string;
  source_contact_id: string;
  full_name: string;
  company: string | null;
  position: string | null;
  linkedin_url: string | null;
  matched_contact_id: string | null;
  created_at: string;
}

export interface LinkedInData {
  career_history?: Array<{
    company: string;
    position: string;
    start_date?: string;
    end_date?: string;
    description?: string;
  }>;
  education?: Array<{
    school: string;
    degree?: string;
    field?: string;
    start_date?: string;
    end_date?: string;
  }>;
  skills?: string[];
  summary?: string;
  about?: string;
  last_updated?: string;
}

export function useLinkedInNetwork(contactId: string | undefined) {
  return useQuery({
    queryKey: ['linkedin-network', contactId],
    queryFn: async () => {
      if (!contactId) return [];
      
      const { data, error } = await supabase
        .from('linkedin_network_contacts')
        .select('*')
        .eq('source_contact_id', contactId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as LinkedInNetworkContact[];
    },
    enabled: !!contactId,
  });
}

export function useLinkedInData(contactId: string | undefined) {
  return useQuery({
    queryKey: ['linkedin-data', contactId],
    queryFn: async () => {
      if (!contactId) return null;
      
      const { data, error } = await supabase
        .from('contacts')
        .select('linkedin_data')
        .eq('id', contactId)
        .single();

      if (error) throw error;
      return data?.linkedin_data as LinkedInData | null;
    },
    enabled: !!contactId,
  });
}

export function useParseLinkedInData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      contactId, 
      content,
      contactName 
    }: { 
      contactId: string; 
      content: string;
      contactName: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('parse-linkedin-network', {
        body: { 
          contact_id: contactId, 
          pasted_content: content,
          contact_name: contactName
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['linkedin-network', variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ['linkedin-data', variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ['contact', variables.contactId] });
      
      const messages: string[] = [];
      if (data.profile_updated) {
        messages.push('Zaktualizowano profil kariery');
      }
      if (data.network_contacts_added > 0) {
        messages.push(`Dodano ${data.network_contacts_added} kontaktów`);
      }
      if (data.network_contacts_skipped > 0) {
        messages.push(`Pominięto ${data.network_contacts_skipped} duplikatów`);
      }
      
      if (messages.length > 0) {
        toast.success(messages.join('. '));
      } else {
        toast.info('Nie znaleziono nowych danych do dodania');
      }
    },
    onError: (error: Error) => {
      console.error('Error parsing LinkedIn data:', error);
      toast.error(error.message || 'Błąd podczas analizy danych');
    },
  });
}

export function useDeleteLinkedInContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase
        .from('linkedin_network_contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linkedin-network'] });
      toast.success('Usunięto kontakt z sieci');
    },
    onError: (error: Error) => {
      console.error('Error deleting LinkedIn contact:', error);
      toast.error('Błąd podczas usuwania kontaktu');
    },
  });
}
