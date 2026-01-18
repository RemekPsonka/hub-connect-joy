import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateContact } from '@/hooks/useContacts';
import { useDuplicateCheck } from '@/hooks/useDuplicateCheck';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export interface ParsedContact {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  city: string | null;
  tags: string[];
  notes: string | null;
  linkedin_url: string | null;
  
  // Individual settings per contact
  group_id: string | null;
  met_source: string | null;
  met_date: string | null;
  comment: string | null;
  
  // Extended company data
  company_nip: string | null;
  company_regon: string | null;
  company_krs: string | null;
  company_address: string | null;
  company_city: string | null;
  company_postal_code: string | null;
  company_website: string | null;
  company_industry: string | null;
  company_description: string | null;
  company_logo_url: string | null;
  
  // Status tracking
  status: 'pending' | 'enriching_company' | 'enriching_person' | 'duplicate' | 'ready' | 'error';
  selected: boolean;
  duplicate_contact_id: string | null;
  duplicate_info: { 
    full_name: string; 
    email?: string | null;
    phone?: string | null;
    company?: string | null;
  } | null;
  duplicate_decision: 'merge' | 'new' | 'skip' | null;
  ai_person_info: string | null;
  ai_person_position: string | null;
}

export interface DuplicateMatch {
  parsedContact: ParsedContact;
  existingContact: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    full_name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    position: string | null;
    city: string | null;
    notes: string | null;
    profile_summary: string | null;
    tags: string[] | null;
    primary_group_id: string | null;
  };
  decision: 'merge' | 'new' | 'skip';
}

export interface ParseMetadata {
  sourceFormat: string;
  detectedColumns: string[];
  totalParsed: number;
  warnings: string[];
}

export interface ImportResult {
  created: number;
  merged: number;
  skipped: number;
  errors: string[];
}

interface ImportStats {
  total: number;
  duplicates: number;
  ready: number;
  companiesNeeded: number;
}

interface UseAIImportReturn {
  isParsing: boolean;
  isCheckingDuplicates: boolean;
  isImporting: boolean;
  parsedContacts: ParsedContact[];
  duplicates: DuplicateMatch[];
  newContacts: ParsedContact[];
  metadata: ParseMetadata | null;
  errors: string[];
  progress: { current: number; total: number; stage: string };
  stats: ImportStats;
  
  parseFiles: (files: File[]) => Promise<void>;
  parseText: (text: string) => Promise<void>;
  parseBatchBusinessCards: (files: File[]) => Promise<void>;
  checkAllDuplicates: () => Promise<void>;
  updateDuplicateDecision: (index: number, decision: 'merge' | 'new' | 'skip') => void;
  updateParsedContact: (index: number, updates: Partial<ParsedContact>) => void;
  removeParsedContact: (index: number) => void;
  enrichCompany: (index: number) => Promise<void>;
  enrichPerson: (index: number) => Promise<void>;
  enrichAllCompanies: () => Promise<void>;
  enrichAllPersons: () => Promise<void>;
  applyDefaultsToAll: (groupId: string | null, metSource: string | null, metDate: string | null) => void;
  toggleContactSelection: (index: number) => void;
  toggleAllSelection: (selected: boolean) => void;
  importContacts: () => Promise<ImportResult>;
  reset: () => void;
}

// Personal email domains to ignore for company extraction
const personalEmailDomains = [
  'gmail.com', 'wp.pl', 'o2.pl', 'onet.pl', 'interia.pl', 
  'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 
  'icloud.com', 'me.com', 'mail.com', 'protonmail.com',
  'tlen.pl', 'gazeta.pl', 'op.pl', 'poczta.fm'
];

function isPersonalEmail(email: string | null): boolean {
  if (!email) return true;
  const domain = email.split('@')[1]?.toLowerCase();
  return personalEmailDomains.includes(domain);
}

function extractCompanyFromEmail(email: string): { domain: string; companyName: string } | null {
  if (!email || isPersonalEmail(email)) return null;
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return null;
  
  const companyName = domain.split('.')[0];
  return {
    domain,
    companyName: companyName.charAt(0).toUpperCase() + companyName.slice(1)
  };
}

export function useAIImport(): UseAIImportReturn {
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;
  const createContact = useCreateContact();
  const { mergeContacts } = useDuplicateCheck();

  const [isParsing, setIsParsing] = useState(false);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parsedContacts, setParsedContacts] = useState<ParsedContact[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [newContacts, setNewContacts] = useState<ParsedContact[]>([]);
  const [metadata, setMetadata] = useState<ParseMetadata | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0, stage: '' });

  // Calculate stats from parsedContacts
  const stats: ImportStats = {
    total: parsedContacts.length,
    duplicates: parsedContacts.filter(c => c.status === 'duplicate').length,
    ready: parsedContacts.filter(c => c.status === 'ready' || c.status === 'pending').length,
    companiesNeeded: parsedContacts.filter(c => !c.company && c.email && !isPersonalEmail(c.email)).length,
  };

  const reset = useCallback(() => {
    setParsedContacts([]);
    setDuplicates([]);
    setNewContacts([]);
    setMetadata(null);
    setErrors([]);
    setProgress({ current: 0, total: 0, stage: '' });
  }, []);

  const parseContent = async (content: string, contentType: string, fileName?: string) => {
    const { data, error } = await supabase.functions.invoke('parse-contacts-list', {
      body: { content, contentType, fileName }
    });

    if (error) {
      throw new Error(error.message || 'Failed to parse contacts');
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return data;
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
    });
  };

  // Convert basic parsed contact to extended format
  const toExtendedContact = (contact: any): ParsedContact => ({
    first_name: contact.first_name || null,
    last_name: contact.last_name || null,
    email: contact.email || null,
    phone: contact.phone || null,
    company: contact.company || null,
    position: contact.position || null,
    city: contact.city || null,
    tags: contact.tags || [],
    notes: contact.notes || null,
    linkedin_url: contact.linkedin_url || null,
    
    // Individual settings - null by default (will use global)
    group_id: null,
    met_source: null,
    met_date: null,
    comment: null,
    
    // Extended company data
    company_nip: null,
    company_regon: null,
    company_krs: null,
    company_address: null,
    company_city: null,
    company_postal_code: null,
    company_website: null,
    company_industry: null,
    company_description: null,
    company_logo_url: null,
    
    // Status
    status: 'pending',
    selected: true,
    duplicate_contact_id: null,
    duplicate_info: null,
    duplicate_decision: null,
    ai_person_info: null,
    ai_person_position: null,
  });

  const parseFiles = useCallback(async (files: File[]) => {
    if (!files.length) return;
    
    setIsParsing(true);
    setErrors([]);
    const allContacts: ParsedContact[] = [];
    const allWarnings: string[] = [];
    let detectedColumns: string[] = [];

    try {
      setProgress({ current: 0, total: files.length, stage: 'Parsowanie plików...' });

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress({ current: i + 1, total: files.length, stage: `Parsowanie: ${file.name}` });

        let content: string;
        let contentType: string;

        const extension = file.name.split('.').pop()?.toLowerCase();

        if (extension === 'csv') {
          content = await file.text();
          contentType = 'csv';
        } else if (extension === 'xlsx' || extension === 'xls') {
          const arrayBuffer = await file.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer);
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          content = XLSX.utils.sheet_to_csv(firstSheet);
          contentType = 'csv';
        } else if (extension === 'pdf') {
          content = await file.text();
          contentType = 'pdf_text';
        } else if (['png', 'jpg', 'jpeg', 'webp'].includes(extension || '')) {
          content = await fileToBase64(file);
          contentType = 'image';
        } else {
          content = await file.text();
          contentType = 'text';
        }

        try {
          const result = await parseContent(content, contentType, file.name);
          
          if (result.contacts && result.contacts.length > 0) {
            const extended = result.contacts.map(toExtendedContact);
            allContacts.push(...extended);
          }
          
          if (result.metadata?.warnings) {
            allWarnings.push(...result.metadata.warnings.map((w: string) => `${file.name}: ${w}`));
          }
          
          if (result.metadata?.detectedColumns) {
            detectedColumns = [...new Set([...detectedColumns, ...result.metadata.detectedColumns])];
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Unknown error';
          allWarnings.push(`${file.name}: ${errMsg}`);
        }
      }

      // Check duplicates immediately after parsing
      if (allContacts.length > 0 && tenantId) {
        setProgress({ current: 0, total: allContacts.length, stage: 'Sprawdzanie duplikatów...' });
        
        for (let i = 0; i < allContacts.length; i++) {
          const contact = allContacts[i];
          setProgress({ 
            current: i + 1, 
            total: allContacts.length, 
            stage: `Sprawdzanie: ${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Kontakt'
          });

          try {
            const { data } = await supabase.functions.invoke('check-duplicate-contact', {
              body: {
                contact: {
                  first_name: contact.first_name,
                  last_name: contact.last_name,
                  email: contact.email,
                  phone: contact.phone,
                  tenant_id: tenantId
                }
              }
            });

            if (data?.isDuplicate && data?.existingContact) {
              allContacts[i] = {
                ...contact,
                status: 'duplicate',
                selected: false, // Deselect duplicates by default
                duplicate_contact_id: data.existingContact.id,
                duplicate_info: {
                  full_name: data.existingContact.full_name,
                  email: data.existingContact.email,
                  phone: data.existingContact.phone,
                  company: data.existingContact.company,
                },
                duplicate_decision: 'merge', // Default to merge
              };
            } else {
              allContacts[i] = { ...contact, status: 'ready' };
            }
          } catch (err) {
            console.error('Error checking contact:', err);
            allContacts[i] = { ...contact, status: 'ready' };
          }
        }
      }

      setParsedContacts(allContacts);
      setMetadata({
        sourceFormat: files.length > 1 ? 'multiple' : files[0].name.split('.').pop() || 'unknown',
        detectedColumns,
        totalParsed: allContacts.length,
        warnings: allWarnings
      });

      if (allContacts.length === 0) {
        setErrors(['Nie udało się wyodrębnić żadnych kontaktów z przesłanych plików.']);
      }

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setErrors([errMsg]);
      toast.error('Błąd parsowania plików', { description: errMsg });
    } finally {
      setIsParsing(false);
      setProgress({ current: 0, total: 0, stage: '' });
    }
  }, [tenantId]);

  const parseText = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setIsParsing(true);
    setErrors([]);

    try {
      setProgress({ current: 1, total: 1, stage: 'Analizowanie tekstu...' });

      const result = await parseContent(text, 'text');
      let contacts = (result.contacts || []).map(toExtendedContact);
      
      // Check duplicates immediately
      if (contacts.length > 0 && tenantId) {
        setProgress({ current: 0, total: contacts.length, stage: 'Sprawdzanie duplikatów...' });
        
        for (let i = 0; i < contacts.length; i++) {
          const contact = contacts[i];
          setProgress({ 
            current: i + 1, 
            total: contacts.length, 
            stage: `Sprawdzanie: ${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Kontakt'
          });

          try {
            const { data } = await supabase.functions.invoke('check-duplicate-contact', {
              body: {
                contact: {
                  first_name: contact.first_name,
                  last_name: contact.last_name,
                  email: contact.email,
                  phone: contact.phone,
                  tenant_id: tenantId
                }
              }
            });

            if (data?.isDuplicate && data?.existingContact) {
              contacts[i] = {
                ...contact,
                status: 'duplicate',
                selected: false,
                duplicate_contact_id: data.existingContact.id,
                duplicate_info: {
                  full_name: data.existingContact.full_name,
                  email: data.existingContact.email,
                  phone: data.existingContact.phone,
                  company: data.existingContact.company,
                },
                duplicate_decision: 'merge',
              };
            } else {
              contacts[i] = { ...contact, status: 'ready' };
            }
          } catch (err) {
            console.error('Error checking contact:', err);
            contacts[i] = { ...contact, status: 'ready' };
          }
        }
      }
      
      setParsedContacts(contacts);
      setMetadata(result.metadata || {
        sourceFormat: 'text',
        detectedColumns: [],
        totalParsed: contacts.length,
        warnings: []
      });

      if (!contacts.length) {
        setErrors(['Nie udało się wyodrębnić żadnych kontaktów z tekstu.']);
      }

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setErrors([errMsg]);
      toast.error('Błąd parsowania tekstu', { description: errMsg });
    } finally {
      setIsParsing(false);
      setProgress({ current: 0, total: 0, stage: '' });
    }
  }, [tenantId]);

  // Parse batch business card images (multiple cards per image)
  const parseBatchBusinessCards = useCallback(async (files: File[]) => {
    if (!files.length) return;
    
    setIsParsing(true);
    setErrors([]);

    try {
      // Convert all files to base64
      const imagePromises = files.map(async (file) => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
      });

      setProgress({ current: 0, total: files.length, stage: 'Przygotowywanie zdjęć...' });
      const images = await Promise.all(imagePromises);

      setProgress({ current: 0, total: 1, stage: 'Analizowanie wizytówek przez AI...' });

      // Call batch OCR function
      const { data, error } = await supabase.functions.invoke('ocr-business-cards-batch', {
        body: { images }
      });

      if (error) {
        throw new Error(error.message || 'Błąd podczas skanowania wizytówek');
      }

      if (!data.success || !data.contacts) {
        throw new Error(data.error || 'Nie udało się przeanalizować wizytówek');
      }

      // Convert to extended contact format
      let contacts: ParsedContact[] = data.contacts.map((c: any) => toExtendedContact({
        first_name: c.first_name,
        last_name: c.last_name,
        email: c.email,
        phone: c.phone || c.mobile,
        company: c.company,
        position: c.position,
        city: c.city,
        linkedin_url: c.linkedin_url,
        notes: c.notes,
        tags: [],
        // Extended company data from OCR
        company_nip: c.nip || null,
        company_regon: c.regon || null,
        company_website: c.website || null,
        company_address: c.address || null,
      }));

      // Check duplicates
      if (contacts.length > 0 && tenantId) {
        setProgress({ current: 0, total: contacts.length, stage: 'Sprawdzanie duplikatów...' });
        
        for (let i = 0; i < contacts.length; i++) {
          const contact = contacts[i];
          setProgress({ 
            current: i + 1, 
            total: contacts.length, 
            stage: `Sprawdzanie: ${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Kontakt'
          });

          try {
            const { data: dupData } = await supabase.functions.invoke('check-duplicate-contact', {
              body: {
                contact: {
                  first_name: contact.first_name,
                  last_name: contact.last_name,
                  email: contact.email,
                  phone: contact.phone,
                  tenant_id: tenantId
                }
              }
            });

            if (dupData?.isDuplicate && dupData?.existingContact) {
              contacts[i] = {
                ...contact,
                status: 'duplicate',
                selected: false,
                duplicate_contact_id: dupData.existingContact.id,
                duplicate_info: {
                  full_name: dupData.existingContact.full_name,
                  email: dupData.existingContact.email,
                  phone: dupData.existingContact.phone,
                  company: dupData.existingContact.company,
                },
                duplicate_decision: 'merge',
              };
            } else {
              contacts[i] = { ...contact, status: 'ready' };
            }
          } catch (err) {
            console.error('Error checking contact:', err);
            contacts[i] = { ...contact, status: 'ready' };
          }
        }
      }

      setParsedContacts(contacts);
      setMetadata({
        sourceFormat: 'business_cards_batch',
        detectedColumns: ['first_name', 'last_name', 'company', 'position', 'email', 'phone'],
        totalParsed: contacts.length,
        warnings: data.errors || []
      });

      if (contacts.length === 0) {
        setErrors(['Nie udało się wyodrębnić żadnych kontaktów ze zdjęć wizytówek.']);
      } else {
        toast.success(`Rozpoznano ${contacts.length} wizytówek`);
      }

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setErrors([errMsg]);
      toast.error('Błąd skanowania wizytówek', { description: errMsg });
    } finally {
      setIsParsing(false);
      setProgress({ current: 0, total: 0, stage: '' });
    }
  }, [tenantId]);

  const updateParsedContact = useCallback((index: number, updates: Partial<ParsedContact>) => {
    setParsedContacts(prev => prev.map((contact, i) => 
      i === index ? { ...contact, ...updates } : contact
    ));
  }, []);

  const removeParsedContact = useCallback((index: number) => {
    setParsedContacts(prev => prev.filter((_, i) => i !== index));
    setMetadata(prev => prev ? { ...prev, totalParsed: prev.totalParsed - 1 } : null);
  }, []);

  const toggleContactSelection = useCallback((index: number) => {
    setParsedContacts(prev => prev.map((contact, i) => 
      i === index ? { ...contact, selected: !contact.selected } : contact
    ));
  }, []);

  const toggleAllSelection = useCallback((selected: boolean) => {
    setParsedContacts(prev => prev.map(contact => ({ ...contact, selected })));
  }, []);

  const applyDefaultsToAll = useCallback((groupId: string | null, metSource: string | null, metDate: string | null) => {
    setParsedContacts(prev => prev.map(contact => ({
      ...contact,
      group_id: contact.group_id || groupId,
      met_source: contact.met_source || metSource,
      met_date: contact.met_date || metDate,
    })));
  }, []);

  const enrichCompany = useCallback(async (index: number) => {
    const contact = parsedContacts[index];
    if (!contact) return;

    const extracted = extractCompanyFromEmail(contact.email || '');
    if (!extracted && !contact.company) return;

    updateParsedContact(index, { status: 'enriching_company' });

    try {
      const { data, error } = await supabase.functions.invoke('enrich-company-data', {
        body: { 
          company_name: contact.company || extracted?.companyName, 
          website: extracted?.domain 
        }
      });

      if (error) throw error;

      const enrichedData = data?.data || data;
      
      updateParsedContact(index, {
        status: contact.duplicate_contact_id ? 'duplicate' : 'ready',
        company: enrichedData?.name || contact.company || extracted?.companyName,
        company_nip: enrichedData?.nip || null,
        company_regon: enrichedData?.regon || null,
        company_krs: enrichedData?.krs || null,
        company_address: enrichedData?.address || null,
        company_city: enrichedData?.city || null,
        company_postal_code: enrichedData?.postal_code || null,
        company_website: enrichedData?.suggested_website || extracted?.domain || null,
        company_industry: enrichedData?.industry || null,
        company_description: enrichedData?.description || null,
        company_logo_url: enrichedData?.logo_url || null,
      });
      
      toast.success('Pobrano dane firmy', { description: enrichedData?.name || extracted?.companyName });
    } catch (err) {
      console.error('Error enriching company:', err);
      updateParsedContact(index, { 
        status: contact.duplicate_contact_id ? 'duplicate' : 'ready',
        company: contact.company || extracted?.companyName || null
      });
      toast.error('Nie udało się pobrać danych firmy');
    }
  }, [parsedContacts, updateParsedContact]);

  const enrichPerson = useCallback(async (index: number) => {
    const contact = parsedContacts[index];
    if (!contact || !contact.first_name || !contact.last_name) return;

    updateParsedContact(index, { status: 'enriching_person' });

    try {
      const { data, error } = await supabase.functions.invoke('enrich-person-data', {
        body: { 
          first_name: contact.first_name,
          last_name: contact.last_name,
          company: contact.company,
          email: contact.email,
          linkedin_url: contact.linkedin_url
        }
      });

      if (error) throw error;

      const enrichedData = data?.data || data;
      
      updateParsedContact(index, {
        status: contact.duplicate_contact_id ? 'duplicate' : 'ready',
        ai_person_info: enrichedData?.profile_summary || null,
        ai_person_position: enrichedData?.suggested_position || null,
        position: contact.position || enrichedData?.suggested_position || null,
      });
      
      toast.success('Sprawdzono osobę', { description: `${contact.first_name} ${contact.last_name}` });
    } catch (err) {
      console.error('Error enriching person:', err);
      updateParsedContact(index, { status: contact.duplicate_contact_id ? 'duplicate' : 'ready' });
      toast.error('Nie udało się sprawdzić osoby');
    }
  }, [parsedContacts, updateParsedContact]);

  const enrichAllCompanies = useCallback(async () => {
    const toEnrich = parsedContacts
      .map((c, i) => ({ contact: c, index: i }))
      .filter(({ contact }) => 
        !contact.company_nip && 
        (contact.company || (contact.email && !isPersonalEmail(contact.email)))
      );

    if (toEnrich.length === 0) {
      toast.info('Brak kontaktów do wzbogacenia');
      return;
    }

    setProgress({ current: 0, total: toEnrich.length, stage: 'Wzbogacanie danych firm...' });

    for (let i = 0; i < toEnrich.length; i++) {
      const { index } = toEnrich[i];
      setProgress({ 
        current: i + 1, 
        total: toEnrich.length, 
        stage: `Wzbogacanie: ${parsedContacts[index]?.company || 'firma'}` 
      });
      await enrichCompany(index);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setProgress({ current: 0, total: 0, stage: '' });
    toast.success(`Wzbogacono dane ${toEnrich.length} firm`);
  }, [parsedContacts, enrichCompany]);

  const enrichAllPersons = useCallback(async () => {
    const toEnrich = parsedContacts
      .map((c, i) => ({ contact: c, index: i }))
      .filter(({ contact }) => 
        !contact.ai_person_info && 
        contact.first_name && 
        contact.last_name
      );

    if (toEnrich.length === 0) {
      toast.info('Brak kontaktów do sprawdzenia');
      return;
    }

    setProgress({ current: 0, total: toEnrich.length, stage: 'Sprawdzanie osób...' });

    for (let i = 0; i < toEnrich.length; i++) {
      const { index, contact } = toEnrich[i];
      setProgress({ 
        current: i + 1, 
        total: toEnrich.length, 
        stage: `Sprawdzanie: ${contact.first_name} ${contact.last_name}` 
      });
      await enrichPerson(index);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setProgress({ current: 0, total: 0, stage: '' });
    toast.success(`Sprawdzono ${toEnrich.length} osób`);
  }, [parsedContacts, enrichPerson]);

  const checkAllDuplicates = useCallback(async () => {
    // Already checked during parsing, this is for re-check if needed
    if (!parsedContacts.length || !tenantId) return;

    setIsCheckingDuplicates(true);
    const foundDuplicates: DuplicateMatch[] = [];
    const uniqueContacts: ParsedContact[] = [];

    try {
      setProgress({ current: 0, total: parsedContacts.length, stage: 'Sprawdzanie duplikatów...' });

      for (let i = 0; i < parsedContacts.length; i++) {
        const contact = parsedContacts[i];
        setProgress({ 
          current: i + 1, 
          total: parsedContacts.length, 
          stage: `Sprawdzanie: ${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Kontakt'
        });

        try {
          const { data, error } = await supabase.functions.invoke('check-duplicate-contact', {
            body: {
              contact: {
                first_name: contact.first_name,
                last_name: contact.last_name,
                email: contact.email,
                phone: contact.phone,
                tenant_id: tenantId
              }
            }
          });

          if (error) {
            console.error('Error checking duplicate:', error);
            uniqueContacts.push(contact);
            continue;
          }

          if (data.isDuplicate && data.existingContact) {
            foundDuplicates.push({
              parsedContact: contact,
              existingContact: data.existingContact,
              decision: 'merge'
            });
          } else {
            uniqueContacts.push(contact);
          }
        } catch (err) {
          console.error('Error checking contact:', err);
          uniqueContacts.push(contact);
        }
      }

      setDuplicates(foundDuplicates);
      setNewContacts(uniqueContacts);

    } finally {
      setIsCheckingDuplicates(false);
      setProgress({ current: 0, total: 0, stage: '' });
    }
  }, [parsedContacts, tenantId]);

  const updateDuplicateDecision = useCallback((index: number, decision: 'merge' | 'new' | 'skip') => {
    // Update in parsedContacts array
    setParsedContacts(prev => {
      const duplicateContacts = prev.filter(c => c.status === 'duplicate');
      if (duplicateContacts[index]) {
        const contactIndex = prev.findIndex(c => c === duplicateContacts[index]);
        if (contactIndex !== -1) {
          return prev.map((c, i) => 
            i === contactIndex ? { ...c, duplicate_decision: decision, selected: decision !== 'skip' } : c
          );
        }
      }
      return prev;
    });
    
    // Also update legacy duplicates array
    setDuplicates(prev => prev.map((d, i) => 
      i === index ? { ...d, decision } : d
    ));
  }, []);

  const importContacts = useCallback(async (): Promise<ImportResult> => {
    if (!tenantId) {
      return { created: 0, merged: 0, skipped: 0, errors: ['Brak tenant_id'] };
    }

    setIsImporting(true);
    const result: ImportResult = { created: 0, merged: 0, skipped: 0, errors: [] };

    try {
      const selectedContacts = parsedContacts.filter(c => c.selected);
      let processed = 0;

      for (const contact of selectedContacts) {
        processed++;
        setProgress({ 
          current: processed, 
          total: selectedContacts.length, 
          stage: `Importowanie: ${contact.first_name || ''} ${contact.last_name || ''}`.trim()
        });

        try {
          // Handle duplicates
          if (contact.status === 'duplicate' && contact.duplicate_contact_id) {
            if (contact.duplicate_decision === 'skip') {
              result.skipped++;
              continue;
            }
            
            if (contact.duplicate_decision === 'merge') {
              const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(' ');
              const tags = contact.tags || [];
              if (contact.met_source && !tags.includes(contact.met_source)) {
                tags.push(contact.met_source);
              }

          await mergeContacts(contact.duplicate_contact_id, {
            full_name: fullName || undefined,
            first_name: contact.first_name,
            last_name: contact.last_name,
            email: contact.email,
            phone: contact.phone,
            company: contact.company,
            position: contact.position,
            city: contact.city,
            notes: contact.comment || contact.notes,
            tags: tags.length > 0 ? tags : undefined,
            primary_group_id: contact.group_id || undefined,
            met_source: contact.met_source || undefined,
            met_date: contact.met_date || undefined,
            profile_summary: contact.ai_person_info || undefined,
          });
              result.merged++;
              continue;
            }
          }

          // Create new contact
          const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Bez nazwy';
          const tags = contact.tags || [];
          if (contact.met_source && !tags.includes(contact.met_source)) {
            tags.push(contact.met_source);
          }

          // TODO: Create company if company data is present
          // For now, just create contact with company name

          await createContact.mutateAsync({
            full_name: fullName,
            first_name: contact.first_name,
            last_name: contact.last_name,
            email: contact.email,
            phone: contact.phone,
            company: contact.company,
            position: contact.position,
            city: contact.city,
            notes: contact.comment || contact.notes,
            tags: tags.length > 0 ? tags : null,
            primary_group_id: contact.group_id || null,
            source: 'ai_import',
            met_source: contact.met_source || null,
            met_date: contact.met_date || null,
            linkedin_url: contact.linkedin_url || null,
            profile_summary: contact.ai_person_info || null,
          });
          result.created++;
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Unknown error';
          result.errors.push(`${contact.first_name} ${contact.last_name}: ${errMsg}`);
        }
      }

      return result;

    } finally {
      setIsImporting(false);
      setProgress({ current: 0, total: 0, stage: '' });
    }
  }, [parsedContacts, tenantId, createContact, mergeContacts]);

  return {
    isParsing,
    isCheckingDuplicates,
    isImporting,
    parsedContacts,
    duplicates,
    newContacts,
    metadata,
    errors,
    progress,
    stats,
    parseFiles,
    parseText,
    parseBatchBusinessCards,
    checkAllDuplicates,
    updateDuplicateDecision,
    updateParsedContact,
    removeParsedContact,
    enrichCompany,
    enrichPerson,
    enrichAllCompanies,
    enrichAllPersons,
    applyDefaultsToAll,
    toggleContactSelection,
    toggleAllSelection,
    importContacts,
    reset
  };
}
