import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Synonym {
  id: string;
  term: string;
  synonyms: string[];
  category: string | null;
  created_at: string;
}

export function useSynonyms() {
  const [synonyms, setSynonyms] = useState<Synonym[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSynonyms = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase.rpc('get_all_synonyms');
      
      if (fetchError) throw fetchError;
      
      setSynonyms((data as Synonym[]) || []);
    } catch (err) {
      console.error('Error fetching synonyms:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch synonyms');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addSynonym = useCallback(async (
    term: string, 
    synonymsList: string[], 
    category: string | null
  ): Promise<boolean> => {
    try {
      const { data, error: addError } = await supabase.rpc('add_synonym', {
        p_term: term,
        p_synonyms: synonymsList,
        p_category: category
      });
      
      if (addError) throw addError;
      
      // Refresh the list
      await fetchSynonyms();
      return true;
    } catch (err) {
      console.error('Error adding synonym:', err);
      setError(err instanceof Error ? err.message : 'Failed to add synonym');
      return false;
    }
  }, [fetchSynonyms]);

  const deleteSynonym = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase.rpc('delete_synonym', {
        p_id: id
      });
      
      if (deleteError) throw deleteError;
      
      // Update local state
      setSynonyms(prev => prev.filter(s => s.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting synonym:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete synonym');
      return false;
    }
  }, []);

  const testExpandQuery = useCallback(async (query: string): Promise<string[]> => {
    try {
      const { data, error: testError } = await supabase.rpc('test_expand_query', {
        p_query: query
      });
      
      if (testError) throw testError;
      
      return (data as string[]) || [query];
    } catch (err) {
      console.error('Error testing query expansion:', err);
      return [query];
    }
  }, []);

  // Group synonyms by category
  const groupedSynonyms = synonyms.reduce((acc, synonym) => {
    const category = synonym.category || 'inne';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(synonym);
    return acc;
  }, {} as Record<string, Synonym[]>);

  return {
    synonyms,
    groupedSynonyms,
    isLoading,
    error,
    fetchSynonyms,
    addSynonym,
    deleteSynonym,
    testExpandQuery,
  };
}
