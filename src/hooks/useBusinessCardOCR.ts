import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ExtractedContactData {
  title: string | null;
  first_name: string;
  last_name: string;
  position: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  linkedin_url: string | null;
  notes: string | null;
  profile_summary: string | null;
}

export interface EnrichedCompanyData {
  name?: string;
  industry: string;
  description: string;
  services: string;
  collaboration_areas: string;
  employee_count_estimate: string | null;
  confidence: 'high' | 'medium' | 'low';
  
  // Extended company analysis fields
  what_company_does?: string;
  main_products_services?: string[];
  what_company_offers?: string;
  what_company_seeks?: string;
  target_clients?: string;
  competitive_advantage?: string;
  management?: Array<{ name: string; position: string; source?: string }>;
  company_type?: string;
  founding_year?: string;
  recent_news?: string;
  company_culture?: string;
  
  // Registration data
  nip?: string;
  regon?: string;
  krs?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  
  // Metadata
  suggested_website?: string;
  logo_url?: string;
  sources?: string[];
  data_notes?: string[];
  search_performed?: boolean;
}

export interface CreateContactWithCompanyData {
  contact: {
    title?: string;
    first_name: string;
    last_name: string;
    position?: string;
    email?: string;
    phone?: string;
    linkedin_url?: string;
    city?: string;
    notes?: string;
    profile_summary?: string;
    primary_group_id?: string;
    met_source?: string;
    met_date?: string;
    tags?: string[];
  };
  company?: {
    name: string;
    website?: string;
    address?: string;
    city?: string;
    postal_code?: string;
    industry?: string;
    description?: string;
    ai_analysis?: string;
    employee_count?: string;
    nip?: string;
    regon?: string;
    krs?: string;
    logo_url?: string;
  };
}

export interface EnrichedPersonData {
  profile_summary: string;
  sources: string[];
  search_performed: boolean;
  confidence: 'verified' | 'partial' | 'not_found';
  data_notes: string[];
}

export function useBusinessCardOCR() {
  const queryClient = useQueryClient();
  const [isScanning, setIsScanning] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isEnrichingPerson, setIsEnrichingPerson] = useState(false);

  // Scan business card using OCR
  const scanBusinessCard = async (imageBase64: string): Promise<ExtractedContactData> => {
    setIsScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('ocr-business-cards', {
        body: { items: [{ image_base64: imageBase64 }] }
      });

      if (error) {
        console.error('OCR error:', error);
        throw new Error(error.message || 'Błąd podczas skanowania wizytówki');
      }

      if (!data.success) {
        throw new Error(data.error || 'Nie udało się przeanalizować wizytówki');
      }

      return data.data as ExtractedContactData;
    } finally {
      setIsScanning(false);
    }
  };

  // Enrich company data using AI
  const enrichCompanyData = async (
    companyName: string, 
    website?: string,
    industryHint?: string
  ): Promise<EnrichedCompanyData> => {
    setIsEnriching(true);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-company-data', {
        body: { 
          company_name: companyName,
          website: website,
          industry_hint: industryHint
        }
      });

      if (error) {
        console.error('Enrich error:', error);
        throw new Error(error.message || 'Błąd podczas wzbogacania danych firmy');
      }

      if (!data.success) {
        throw new Error(data.error || 'Nie udało się wzbogacić danych firmy');
      }

      return data.data as EnrichedCompanyData;
    } finally {
      setIsEnriching(false);
    }
  };

  // Create contact with optional company
  const createContactWithCompanyMutation = useMutation({
    mutationFn: async (input: CreateContactWithCompanyData) => {
      // Get current user's tenant_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Użytkownik nie jest zalogowany');

      const { data: director } = await supabase
        .from('directors')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!director) throw new Error('Nie znaleziono danych użytkownika');

      let companyId: string | null = null;

      // Create company if provided
      if (input.company && input.company.name) {
        // Check if company already exists
        const { data: existingCompany } = await supabase
          .from('companies')
          .select('id')
          .eq('tenant_id', director.tenant_id)
          .eq('name', input.company.name)
          .maybeSingle();

        if (existingCompany) {
          companyId = existingCompany.id;
          // Update existing company with new data
          await supabase
            .from('companies')
            .update({
              ...input.company,
              updated_at: new Date().toISOString()
            })
            .eq('id', companyId);
        } else {
          // Create new company
          const { data: newCompany, error: companyError } = await supabase
            .from('companies')
            .insert({
              ...input.company,
              tenant_id: director.tenant_id
            })
            .select('id')
            .single();

          if (companyError) throw companyError;
          companyId = newCompany.id;
        }
      }

      // Create contact - generate full_name from parts
      const fullName = [input.contact.title, input.contact.first_name, input.contact.last_name]
        .filter(Boolean)
        .join(' ');

      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          title: input.contact.title || null,
          first_name: input.contact.first_name,
          last_name: input.contact.last_name,
          full_name: fullName,
          position: input.contact.position || null,
          email: input.contact.email || null,
          phone: input.contact.phone || null,
          linkedin_url: input.contact.linkedin_url || null,
          city: input.contact.city || null,
          notes: input.contact.notes || null,
          profile_summary: input.contact.profile_summary || null,
          company: input.company?.name || null,
          company_id: companyId,
          tenant_id: director.tenant_id,
          primary_group_id: input.contact.primary_group_id || null,
          met_source: input.contact.met_source || null,
          met_date: input.contact.met_date || null,
          tags: input.contact.tags || null,
        })
        .select()
        .single();

      if (contactError) throw contactError;

      return contact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Kontakt został utworzony');
    },
    onError: (error) => {
      console.error('Create contact error:', error);
      toast.error('Nie udało się utworzyć kontaktu');
    }
  });

  // Enrich person data using AI + Firecrawl (internet search)
  const enrichPersonData = async (
    firstName: string,
    lastName: string,
    company?: string | null,
    email?: string | null,
    linkedinUrl?: string | null
  ): Promise<EnrichedPersonData> => {
    setIsEnrichingPerson(true);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-person-data', {
        body: { 
          first_name: firstName,
          last_name: lastName,
          company: company || undefined,
          email: email || undefined,
          linkedin_url: linkedinUrl || undefined
        }
      });

      if (error) {
        console.error('Enrich person error:', error);
        throw new Error(error.message || 'Błąd podczas wzbogacania danych osoby');
      }

      if (!data.success) {
        throw new Error(data.error || 'Nie udało się wzbogacić danych osoby');
      }

      return data.data as EnrichedPersonData;
    } finally {
      setIsEnrichingPerson(false);
    }
  };

  return {
    scanBusinessCard,
    enrichCompanyData,
    enrichPersonData,
    createContactWithCompany: createContactWithCompanyMutation.mutateAsync,
    isScanning,
    isEnriching,
    isEnrichingPerson,
    isCreating: createContactWithCompanyMutation.isPending
  };
}
