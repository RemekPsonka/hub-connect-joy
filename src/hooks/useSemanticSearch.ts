import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SearchResult {
  id: string;
  type: 'contact' | 'need' | 'offer';
  title: string;
  subtitle?: string;
  description?: string;
  similarity: number;
  ftsScore?: number;
  semanticScore?: number;
  matchSource?: 'fts' | 'semantic' | 'hybrid';
}

interface SemanticSearchParams {
  query: string;
  types?: ('contact' | 'need' | 'offer')[];
  threshold?: number;
  limit?: number;
  useHybrid?: boolean;
}

export function useSemanticSearch() {
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<'hybrid' | 'fts'>('hybrid');
  
  const search = useCallback(async ({
    query,
    types = ['contact', 'need', 'offer'],
    threshold = 0.2,
    limit = 30,
    useHybrid = true
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
      
      // Try to generate query embedding for hybrid search
      let queryEmbedding: string | null = null;
      
      if (useHybrid) {
        console.log('Generating query embedding for hybrid search...');
        try {
          const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke('generate-embedding', {
            body: { text: query }
          });
          
          if (!embeddingError && embeddingData?.embedding) {
            queryEmbedding = embeddingData.embedding;
            console.log('Query embedding generated successfully');
            setSearchMode('hybrid');
          } else {
            console.warn('Could not generate embedding, falling back to FTS only:', embeddingError);
            setSearchMode('fts');
          }
        } catch (e) {
          console.warn('Embedding generation failed, using FTS only:', e);
          setSearchMode('fts');
        }
      } else {
        setSearchMode('fts');
      }
      
      // Use hybrid search function
      console.log(`Starting ${queryEmbedding ? 'hybrid' : 'FTS'} search for:`, query);
      
      const { data, error: rpcError } = await supabase.rpc('search_all_hybrid', {
        p_query: query,
        p_query_embedding: queryEmbedding,
        p_tenant_id: tenantId,
        p_types: types,
        p_fts_weight: 0.4,
        p_semantic_weight: 0.6,
        p_threshold: threshold,
        p_limit: limit
      });
      
      if (rpcError) {
        console.error('Hybrid search error:', rpcError);
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
        similarity: item.combined_score || 0,
        ftsScore: item.fts_score || 0,
        semanticScore: item.semantic_score || 0,
        matchSource: item.match_source as 'fts' | 'semantic' | 'hybrid'
      }));
      
      console.log(`Hybrid search found ${searchResults.length} results`);
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
    searchMode,
    clearResults
  };
}
