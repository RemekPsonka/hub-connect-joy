import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AIRecommendation {
  id: string;
  type: 'connection' | 'followup' | 'opportunity';
  title: string;
  description: string;
  contactIds?: string[];
  contactNames?: string[];
  contactDescriptions?: Record<string, string>;
  priority: 'high' | 'medium' | 'low';
  reasoning?: string;
}

export function useAIRecommendations() {
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-recommendations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );
      
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Przekroczono limit zapytań. Spróbuj za chwilę.');
        }
        if (response.status === 402) {
          throw new Error('Wymagana płatność.');
        }
        throw new Error('Błąd pobierania rekomendacji');
      }
      
      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (err) {
      console.error('Error fetching AI recommendations:', err);
      setError(err instanceof Error ? err.message : 'Błąd pobierania rekomendacji');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeRecommendation = useCallback((recommendationId: string) => {
    setRecommendations(prev => prev.filter(r => r.id !== recommendationId));
  }, []);

  return { recommendations, isLoading, error, fetchRecommendations, removeRecommendation };
}
