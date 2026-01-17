import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AIRecommendation {
  id: string;
  type: 'connection' | 'followup' | 'opportunity';
  title: string;
  description: string;
  contactIds?: string[];
  contactNames?: string[];
  priority: 'high' | 'medium' | 'low';
  reasoning?: string;
}

export function generateRecommendationHash(rec: AIRecommendation): string {
  const sortedIds = [...(rec.contactIds || [])].sort().join('-');
  return `${rec.type}-${sortedIds}-${rec.title.slice(0, 50)}`;
}

async function getTenantId(): Promise<string> {
  const { data } = await supabase
    .from('directors')
    .select('tenant_id')
    .single();
  
  if (!data?.tenant_id) {
    throw new Error('No tenant found');
  }
  return data.tenant_id;
}

export function useRecommendationActions() {
  const queryClient = useQueryClient();

  const dismissRecommendation = useMutation({
    mutationFn: async (recommendation: AIRecommendation) => {
      const tenantId = await getTenantId();
      const hash = generateRecommendationHash(recommendation);
      
      const { error } = await supabase
        .from('ai_recommendation_actions')
        .insert({
          tenant_id: tenantId,
          recommendation_hash: hash,
          recommendation_type: recommendation.type,
          recommendation_title: recommendation.title,
          action_taken: 'dismissed',
          contact_ids: recommendation.contactIds || [],
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-recommendations'] });
      toast.success('Rekomendacja odrzucona');
    },
    onError: (error) => {
      console.error('Error dismissing recommendation:', error);
      toast.error('Błąd podczas odrzucania rekomendacji');
    },
  });

  const completeRecommendation = useMutation({
    mutationFn: async ({ 
      recommendation, 
      taskId 
    }: { 
      recommendation: AIRecommendation; 
      taskId?: string;
    }) => {
      const tenantId = await getTenantId();
      const hash = generateRecommendationHash(recommendation);
      
      const { error } = await supabase
        .from('ai_recommendation_actions')
        .insert({
          tenant_id: tenantId,
          recommendation_hash: hash,
          recommendation_type: recommendation.type,
          recommendation_title: recommendation.title,
          action_taken: 'completed',
          related_task_id: taskId || null,
          contact_ids: recommendation.contactIds || [],
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-recommendations'] });
      toast.success('Rekomendacja zrealizowana');
    },
    onError: (error) => {
      console.error('Error completing recommendation:', error);
      toast.error('Błąd podczas realizacji rekomendacji');
    },
  });

  return { 
    dismissRecommendation, 
    completeRecommendation,
    isDismissing: dismissRecommendation.isPending,
    isCompleting: completeRecommendation.isPending,
  };
}
