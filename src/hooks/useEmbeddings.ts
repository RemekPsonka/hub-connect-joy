import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type EmbeddingType = 'contact' | 'need' | 'offer';

interface GenerateEmbeddingParams {
  type: EmbeddingType;
  id: string;
  showToast?: boolean;
}

export function useGenerateEmbedding() {
  return useMutation({
    mutationFn: async ({ type, id, showToast = false }: GenerateEmbeddingParams) => {
      const { data, error } = await supabase.functions.invoke('generate-embedding', {
        body: { type, id }
      });
      
      if (error) {
        console.error('Embedding generation failed:', error);
        throw error;
      }
      
      if (showToast) {
        toast({
          title: 'Embedding wygenerowany',
          description: 'Profil został zaktualizowany dla wyszukiwania AI.',
        });
      }
      
      return data;
    },
    onError: (error) => {
      console.warn('Embedding generation failed silently:', error);
      // Don't show error toast - embedding generation is background task
    }
  });
}

// Helper function to generate embedding in background without blocking UI
export async function generateEmbeddingInBackground(type: EmbeddingType, id: string) {
  try {
    const { error } = await supabase.functions.invoke('generate-embedding', {
      body: { type, id }
    });
    
    if (error) {
      console.warn(`Background embedding generation failed for ${type}:${id}:`, error);
    } else {
      console.log(`Embedding generated for ${type}:${id}`);
    }
  } catch (e) {
    console.warn(`Background embedding generation error for ${type}:${id}:`, e);
  }
}
