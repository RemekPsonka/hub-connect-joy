import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SearchResult {
  id: string;
  type: 'contact' | 'need' | 'offer';
  title: string;
  subtitle?: string;
  description?: string;
  similarity: number;
}

interface SemanticSearchParams {
  query: string;
  types?: ('contact' | 'need' | 'offer')[];
  threshold?: number;
  limit?: number;
}

export function useSemanticSearch() {
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const search = useCallback(async ({
    query,
    types = ['contact', 'need', 'offer'],
    threshold = 0.3,
    limit = 20
  }: SemanticSearchParams) => {
    if (!query.trim()) {
      setResults([]);
      return [];
    }
    
    setIsSearching(true);
    setError(null);
    
    try {
      // Get current tenant_id first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Wymagane zalogowanie');
        setResults([]);
        return [];
      }
      
      // Get tenant_id from directors table
      const { data: director } = await supabase
        .from('directors')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();
      
      if (!director) {
        setError('Nie znaleziono konta użytkownika');
        setResults([]);
        return [];
      }
      
      const tenantId = director.tenant_id;
      
      // Use PostgreSQL full-text search with trigram support
      console.log('Starting FTS search for:', query);
      
      const { data, error: rpcError } = await supabase.rpc('search_all_fts', {
        p_query: query,
        p_tenant_id: tenantId,
        p_types: types,
        p_limit: limit
      });
      
      if (rpcError) {
        console.error('FTS search error:', rpcError);
        setError('Błąd wyszukiwania');
        setResults([]);
        return [];
      }
      
      const searchResults: SearchResult[] = (data || []).map((item: any) => ({
        id: item.id,
        type: item.type as 'contact' | 'need' | 'offer',
        title: item.title || '',
        subtitle: item.subtitle || undefined,
        description: item.description || undefined,
        similarity: item.similarity || 0
      }));
      
      console.log(`FTS search found ${searchResults.length} results`);
      setResults(searchResults);
      return searchResults;
    } catch (e) {
      console.error('Search error:', e);
      setError('Błąd wyszukiwania');
      setResults([]);
      return [];
    } finally {
      setIsSearching(false);
    }
  }, []);
  
  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);
  
  return {
    search,
    results,
    isSearching,
    error,
    clearResults
  };
}
