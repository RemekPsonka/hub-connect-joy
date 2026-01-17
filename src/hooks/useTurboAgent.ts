import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TurboAgentProgress {
  phase: 'idle' | 'analyzing' | 'selecting' | 'querying' | 'aggregating' | 'completed' | 'error';
  totalAgents: number;
  selectedAgents: number;
  agentsResponded: number;
  message: string;
}

export interface TurboContactInfo {
  contact_id: string;
  name: string;
  company?: string;
  answer: string;
  confidence: number;
}

export interface TurboCategory {
  name: string;
  count: number;
  contacts: TurboContactInfo[];
}

export interface TurboRecommendation {
  contact_id: string;
  contact_name: string;
  score: number;
  reason: string;
  suggested_action: string;
}

export interface TurboAgentResult {
  session_id: string;
  duration_ms: number;
  agents_available: number;
  agents_selected: number;
  agents_responded: number;
  relevant_responses: number;
  result: {
    summary: string;
    categories: TurboCategory[];
    top_recommendations: TurboRecommendation[];
    insights: string[];
    next_steps?: string[];
  };
}

const phaseMessages: Record<TurboAgentProgress['phase'], string> = {
  idle: 'Gotowy do analizy',
  analyzing: 'Analizuję pytanie...',
  selecting: 'Wybieram najbardziej relevantnych agentów...',
  querying: 'Odpytuję agentów równolegle...',
  aggregating: 'Syntetyzuję odpowiedzi...',
  completed: 'Analiza zakończona',
  error: 'Wystąpił błąd'
};

export function useTurboAgent() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<TurboAgentProgress>({
    phase: 'idle',
    totalAgents: 0,
    selectedAgents: 0,
    agentsResponded: 0,
    message: phaseMessages.idle
  });
  const [result, setResult] = useState<TurboAgentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const queryTurboAgent = useCallback(async (tenantId: string, query: string): Promise<TurboAgentResult | null> => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // Phase: Analyzing
      setProgress({
        phase: 'analyzing',
        totalAgents: 0,
        selectedAgents: 0,
        agentsResponded: 0,
        message: phaseMessages.analyzing
      });

      // Simulate progress updates (actual progress comes from edge function)
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev.phase === 'analyzing') {
            return { ...prev, phase: 'selecting', message: phaseMessages.selecting };
          }
          if (prev.phase === 'selecting') {
            return { ...prev, phase: 'querying', message: phaseMessages.querying };
          }
          if (prev.phase === 'querying') {
            return { 
              ...prev, 
              agentsResponded: Math.min(prev.agentsResponded + 2, prev.selectedAgents || 20),
              message: `Odpytuję agentów... (${Math.min(prev.agentsResponded + 2, prev.selectedAgents || 20)}/${prev.selectedAgents || 20})`
            };
          }
          return prev;
        });
      }, 2000);

      const { data, error: invokeError } = await supabase.functions.invoke('turbo-agent-query', {
        body: {
          tenant_id: tenantId,
          query,
          max_agents: 20,
          threshold: 0.3
        }
      });

      clearInterval(progressInterval);

      if (invokeError) {
        throw invokeError;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const turboResult = data as TurboAgentResult;
      setResult(turboResult);
      setProgress({
        phase: 'completed',
        totalAgents: turboResult.agents_available,
        selectedAgents: turboResult.agents_selected,
        agentsResponded: turboResult.agents_responded,
        message: `Ukończono w ${(turboResult.duration_ms / 1000).toFixed(1)}s`
      });

      return turboResult;

    } catch (err: any) {
      console.error('[useTurboAgent] Error:', err);
      setError(err.message || 'Wystąpił błąd podczas analizy');
      setProgress({
        phase: 'error',
        totalAgents: 0,
        selectedAgents: 0,
        agentsResponded: 0,
        message: err.message || 'Wystąpił błąd'
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setProgress({
      phase: 'idle',
      totalAgents: 0,
      selectedAgents: 0,
      agentsResponded: 0,
      message: phaseMessages.idle
    });
    setResult(null);
    setError(null);
  }, []);

  return {
    isLoading,
    progress,
    result,
    error,
    queryTurboAgent,
    reset
  };
}
