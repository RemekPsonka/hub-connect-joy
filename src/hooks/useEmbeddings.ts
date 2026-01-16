import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type EmbeddingType = 'contact' | 'need' | 'offer';

interface GenerateEmbeddingParams {
  type: EmbeddingType;
  id: string;
  showToast?: boolean;
}

const typeLabels: Record<EmbeddingType, string> = {
  contact: 'kontaktu',
  need: 'potrzeby',
  offer: 'oferty',
};

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
        toast.success('Embedding wygenerowany', {
          description: 'Profil został zaktualizowany dla wyszukiwania AI.',
        });
      }
      
      return data;
    },
    onError: (error) => {
      console.warn('Embedding generation failed silently:', error);
    }
  });
}

// Helper function to generate embedding in background with toast notifications
export async function generateEmbeddingInBackground(type: EmbeddingType, id: string, showNotifications = true) {
  const toastId = showNotifications 
    ? toast.loading(`Indeksowanie ${typeLabels[type]} dla wyszukiwania AI...`)
    : undefined;
  
  try {
    const { error } = await supabase.functions.invoke('generate-embedding', {
      body: { type, id }
    });
    
    if (error) {
      console.warn(`Background embedding generation failed for ${type}:${id}:`, error);
      if (toastId) {
        toast.error('Nie udało się zaindeksować dla AI', {
          id: toastId,
          description: 'Wyszukiwanie semantyczne może nie działać poprawnie.',
        });
      }
    } else {
      console.log(`Embedding generated for ${type}:${id}`);
      if (toastId) {
        toast.success('Zaindeksowano dla wyszukiwania AI', {
          id: toastId,
        });
      }
    }
  } catch (e) {
    console.warn(`Background embedding generation error for ${type}:${id}:`, e);
    if (toastId) {
      toast.error('Błąd indeksowania AI', {
        id: toastId,
      });
    }
  }
}
