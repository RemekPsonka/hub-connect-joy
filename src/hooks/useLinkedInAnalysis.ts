import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AnalysisResult {
  success: boolean;
  profile_analysis?: {
    headline?: string;
    current_position?: string;
    current_company?: string;
    location?: string;
    about?: string;
    experience?: Array<{
      company: string;
      position: string;
      period: string;
      description?: string;
    }>;
    education?: Array<{
      school: string;
      degree?: string;
      period?: string;
    }>;
    skills?: string[];
    certifications?: string[];
    languages?: string[];
    achievements?: string[];
  };
  contacts_created: number;
  contacts_linked: number;
  contacts: Array<{
    id: string;
    full_name: string;
    created: boolean;
  }>;
  notes_updated: boolean;
  error?: string;
}

export function useLinkedInAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactId, linkedinUrl }: { contactId: string; linkedinUrl: string }): Promise<AnalysisResult> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Musisz być zalogowany');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enrich-person`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            mode: 'linkedin',
            contact_id: contactId,
            linkedin_url: linkedinUrl,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Błąd: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate contact queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['contact', variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      queryClient.invalidateQueries({ queryKey: ['contact-connections', variables.contactId] });

      const createdCount = data.contacts_created || 0;
      const linkedCount = data.contacts_linked || 0;
      const totalContacts = createdCount + linkedCount;

      if (totalContacts > 0) {
        toast.success(
          `Analiza LinkedIn zakończona! Utworzono ${createdCount} nowych kontaktów, połączono z ${linkedCount} istniejącymi.`,
          { duration: 5000 }
        );
      } else {
        toast.success('Analiza LinkedIn zakończona! Notatki zostały zaktualizowane.');
      }
    },
    onError: (error) => {
      console.error('LinkedIn analysis error:', error);
      toast.error(error instanceof Error ? error.message : 'Nie udało się przeanalizować profilu LinkedIn');
    },
  });
}
