import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface DailySerendipity {
  id: string;
  tenant_id: string;
  director_id: string;
  date: string;
  type: 'connection' | 'opportunity' | 'insight' | 'reminder';
  title: string;
  description: string;
  reasoning?: string;
  contact_a_id?: string;
  contact_b_id?: string;
  need_id?: string;
  offer_id?: string;
  match_id?: string;
  viewed_at?: string;
  acted_on: boolean;
  acted_at?: string;
  feedback?: string;
  created_at: string;
  contact_a?: {
    id: string;
    full_name: string;
    company?: string;
  };
  contact_b?: {
    id: string;
    full_name: string;
    company?: string;
  };
}

export const useDailySerendipity = () => {
  const { director } = useAuth();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const { data: serendipity, isLoading, refetch } = useQuery({
    queryKey: ['daily-serendipity', director?.tenant_id, today],
    queryFn: async () => {
      if (!director?.tenant_id) return null;

      const { data, error } = await supabase
        .from('daily_serendipity')
        .select(`
          *,
          contact_a:contacts!daily_serendipity_contact_a_id_fkey(id, full_name, company),
          contact_b:contacts!daily_serendipity_contact_b_id_fkey(id, full_name, company)
        `)
        .eq('tenant_id', director.tenant_id)
        .eq('director_id', director.id)
        .eq('date', today)
        .maybeSingle();

      if (error) {
        console.error('Error fetching serendipity:', error);
        return null;
      }

      return data as DailySerendipity | null;
    },
    enabled: !!director?.tenant_id,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  const generateSerendipity = async () => {
    if (!director?.tenant_id || !director?.id) {
      toast.error('Nie można wygenerować odkrycia - brak danych użytkownika');
      return null;
    }

    setIsGenerating(true);
    try {
      const response = await supabase.functions.invoke('generate-daily-serendipity', {
        body: {
          tenant_id: director.tenant_id,
          director_id: director.id
        }
      });

      if (response.error) {
        throw response.error;
      }

      const { serendipity: newSerendipity, cached } = response.data;
      
      if (!cached) {
        toast.success('Wygenerowano nowe Odkrycie Dnia!');
      }

      await refetch();
      return newSerendipity;
    } catch (error) {
      console.error('Error generating serendipity:', error);
      toast.error('Nie udało się wygenerować odkrycia');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const markAsViewed = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('daily_serendipity')
        .update({ viewed_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-serendipity'] });
    }
  });

  const markFeedback = useMutation({
    mutationFn: async ({ id, feedback }: { id: string; feedback: 'helpful' | 'not_helpful' | 'dismissed' }) => {
      const { error } = await supabase
        .from('daily_serendipity')
        .update({ feedback })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['daily-serendipity'] });
      
      if (variables.feedback === 'helpful') {
        toast.success('Dziękujemy za feedback! 👍');
      } else if (variables.feedback === 'not_helpful') {
        toast('Dziękujemy za feedback - poprawimy się! 📝');
      }
    }
  });

  const markActedOn = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('daily_serendipity')
        .update({ 
          acted_on: true, 
          acted_at: new Date().toISOString() 
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-serendipity'] });
      toast.success('Świetnie! Działanie odnotowane ✨');
    }
  });

  return {
    serendipity,
    isLoading,
    isGenerating,
    generateSerendipity,
    markAsViewed: (id: string) => markAsViewed.mutate(id),
    markFeedback: (id: string, feedback: 'helpful' | 'not_helpful' | 'dismissed') => 
      markFeedback.mutate({ id, feedback }),
    markActedOn: (id: string) => markActedOn.mutate(id)
  };
};
