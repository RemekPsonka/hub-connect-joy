import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
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

async function generateQueryEmbedding(text: string): Promise<number[] | null> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-embedding', {
      body: { text }
    });
    
    if (error) {
      console.error('Failed to generate query embedding:', error);
      return null;
    }
    
    return data?.embedding || null;
  } catch (e) {
    console.error('Query embedding error:', e);
    return null;
  }
}

export function useSemanticSearch() {
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const search = useCallback(async ({
    query,
    types = ['contact', 'need', 'offer'],
    threshold = 0.5,
    limit = 10
  }: SemanticSearchParams) => {
    if (!query.trim()) {
      setResults([]);
      return [];
    }
    
    setIsSearching(true);
    setError(null);
    
    try {
      // Generate embedding for the query
      const embedding = await generateQueryEmbedding(query);
      
      if (!embedding) {
        setError('Nie udało się przetworzyć zapytania');
        setResults([]);
        return [];
      }
      
      const embeddingString = JSON.stringify(embedding);
      const allResults: SearchResult[] = [];
      
      // Get current tenant_id
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
      
      // Search in parallel
      const searchPromises: Promise<void>[] = [];
      
      if (types.includes('contact')) {
        const contactPromise = (async () => {
          const { data, error } = await supabase.rpc('search_contacts_semantic', {
            p_query_embedding: embeddingString,
            p_tenant_id: tenantId,
            p_threshold: threshold,
            p_limit: limit
          });
          if (error) {
            console.error('Contact search error:', error);
            return;
          }
          if (data) {
            allResults.push(...data.map((item: any) => ({
              id: item.contact_id,
              type: 'contact' as const,
              title: item.full_name,
              subtitle: item.company,
              description: item.job_position,
              similarity: item.similarity
            })));
          }
        })();
        searchPromises.push(contactPromise);
      }
      
      if (types.includes('need')) {
        const needPromise = (async () => {
          const { data, error } = await supabase.rpc('search_needs_semantic', {
            p_query_embedding: embeddingString,
            p_tenant_id: tenantId,
            p_threshold: threshold,
            p_limit: limit
          });
          if (error) {
            console.error('Need search error:', error);
            return;
          }
          if (data) {
            allResults.push(...data.map((item: any) => ({
              id: item.need_id,
              type: 'need' as const,
              title: item.need_title,
              subtitle: item.contact_name,
              description: item.need_description,
              similarity: item.similarity
            })));
          }
        })();
        searchPromises.push(needPromise);
      }
      
      if (types.includes('offer')) {
        const offerPromise = (async () => {
          const { data, error } = await supabase.rpc('search_offers_semantic', {
            p_query_embedding: embeddingString,
            p_tenant_id: tenantId,
            p_threshold: threshold,
            p_limit: limit
          });
          if (error) {
            console.error('Offer search error:', error);
            return;
          }
          if (data) {
            allResults.push(...data.map((item: any) => ({
              id: item.offer_id,
              type: 'offer' as const,
              title: item.offer_title,
              subtitle: item.contact_name,
              description: item.offer_description,
              similarity: item.similarity
            })));
          }
        })();
        searchPromises.push(offerPromise);
      }
      
      await Promise.all(searchPromises);
      
      // Sort by similarity
      allResults.sort((a, b) => b.similarity - a.similarity);
      
      setResults(allResults);
      return allResults;
    } catch (e) {
      console.error('Semantic search error:', e);
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
