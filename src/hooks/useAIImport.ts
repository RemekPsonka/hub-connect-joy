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
  
  parseFiles: (files: File[]) => Promise<void>;
  parseText: (text: string) => Promise<void>;
  checkAllDuplicates: () => Promise<void>;
  updateDuplicateDecision: (index: number, decision: 'merge' | 'new' | 'skip') => void;
  importContacts: (groupId?: string, sourceTags?: string[]) => Promise<ImportResult>;
  reset: () => void;
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
          // For PDF, send the text content - AI will handle it
          content = await file.text();
          contentType = 'pdf_text';
        } else if (['png', 'jpg', 'jpeg', 'webp'].includes(extension || '')) {
          // For images, send as base64
          content = await fileToBase64(file);
          contentType = 'image';
        } else {
          // Try as text
          content = await file.text();
          contentType = 'text';
        }

        try {
          const result = await parseContent(content, contentType, file.name);
          
          if (result.contacts && result.contacts.length > 0) {
            allContacts.push(...result.contacts);
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
  }, []);

  const parseText = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setIsParsing(true);
    setErrors([]);

    try {
      setProgress({ current: 1, total: 1, stage: 'Analizowanie tekstu...' });

      const result = await parseContent(text, 'text');
      
      setParsedContacts(result.contacts || []);
      setMetadata(result.metadata || {
        sourceFormat: 'text',
        detectedColumns: [],
        totalParsed: result.contacts?.length || 0,
        warnings: []
      });

      if (!result.contacts?.length) {
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
  }, []);

  const checkAllDuplicates = useCallback(async () => {
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
              decision: 'merge' // Default to merge
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
    setDuplicates(prev => prev.map((d, i) => 
      i === index ? { ...d, decision } : d
    ));
  }, []);

  const importContacts = useCallback(async (groupId?: string, sourceTags?: string[]): Promise<ImportResult> => {
    if (!tenantId) {
      return { created: 0, merged: 0, skipped: 0, errors: ['Brak tenant_id'] };
    }

    setIsImporting(true);
    const result: ImportResult = { created: 0, merged: 0, skipped: 0, errors: [] };

    try {
      const totalToProcess = newContacts.length + duplicates.length;
      let processed = 0;

      // Process new contacts
      for (const contact of newContacts) {
        processed++;
        setProgress({ 
          current: processed, 
          total: totalToProcess, 
          stage: `Importowanie: ${contact.first_name || ''} ${contact.last_name || ''}`.trim()
        });

        try {
          const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Bez nazwy';
          const tags = [...(contact.tags || []), ...(sourceTags || [])];

          await createContact.mutateAsync({
            full_name: fullName,
            first_name: contact.first_name,
            last_name: contact.last_name,
            email: contact.email,
            phone: contact.phone,
            company: contact.company,
            position: contact.position,
            city: contact.city,
            notes: contact.notes,
            tags: tags.length > 0 ? tags : null,
            primary_group_id: groupId || null,
            source: 'ai_import'
          });
          result.created++;
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Unknown error';
          result.errors.push(`${contact.first_name} ${contact.last_name}: ${errMsg}`);
        }
      }

      // Process duplicates based on decision
      for (const dup of duplicates) {
        processed++;
        setProgress({ 
          current: processed, 
          total: totalToProcess, 
          stage: `Przetwarzanie: ${dup.parsedContact.first_name || ''} ${dup.parsedContact.last_name || ''}`.trim()
        });

        if (dup.decision === 'skip') {
          result.skipped++;
          continue;
        }

        if (dup.decision === 'merge') {
          try {
            const fullName = [dup.parsedContact.first_name, dup.parsedContact.last_name].filter(Boolean).join(' ');
            const tags = [...(dup.parsedContact.tags || []), ...(sourceTags || [])];

            await mergeContacts(dup.existingContact.id, {
              full_name: fullName || undefined,
              first_name: dup.parsedContact.first_name,
              last_name: dup.parsedContact.last_name,
              email: dup.parsedContact.email,
              phone: dup.parsedContact.phone,
              company: dup.parsedContact.company,
              position: dup.parsedContact.position,
              city: dup.parsedContact.city,
              notes: dup.parsedContact.notes,
              tags: tags.length > 0 ? tags : undefined,
              primary_group_id: groupId || undefined,
            });
            result.merged++;
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : 'Unknown error';
            result.errors.push(`Merge ${dup.parsedContact.first_name} ${dup.parsedContact.last_name}: ${errMsg}`);
          }
        } else if (dup.decision === 'new') {
          try {
            const fullName = [dup.parsedContact.first_name, dup.parsedContact.last_name].filter(Boolean).join(' ') || 'Bez nazwy';
            const tags = [...(dup.parsedContact.tags || []), ...(sourceTags || [])];

            await createContact.mutateAsync({
              full_name: fullName,
              first_name: dup.parsedContact.first_name,
              last_name: dup.parsedContact.last_name,
              email: dup.parsedContact.email,
              phone: dup.parsedContact.phone,
              company: dup.parsedContact.company,
              position: dup.parsedContact.position,
              city: dup.parsedContact.city,
              notes: dup.parsedContact.notes,
              tags: tags.length > 0 ? tags : null,
              primary_group_id: groupId || null,
              source: 'ai_import'
            });
            result.created++;
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : 'Unknown error';
            result.errors.push(`Create ${dup.parsedContact.first_name} ${dup.parsedContact.last_name}: ${errMsg}`);
          }
        }
      }

      return result;

    } finally {
      setIsImporting(false);
      setProgress({ current: 0, total: 0, stage: '' });
    }
  }, [newContacts, duplicates, tenantId, createContact, mergeContacts]);

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
    parseFiles,
    parseText,
    checkAllDuplicates,
    updateDuplicateDecision,
    importContacts,
    reset
  };
}
