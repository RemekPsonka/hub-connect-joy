import { supabase } from '@/integrations/supabase/client';

export type Intent = 'simple' | 'network' | 'match' | 'briefing' | 'analysis';

interface ClassifyResult {
  intent: Intent;
  confidence: number;
}

// Quick local classification for obvious patterns - bypasses AI call
export function quickClassify(query: string): Intent | null {
  const lowerQuery = query.toLowerCase().trim();
  
  // Network patterns
  if (
    lowerQuery.includes('kto zna') ||
    lowerQuery.includes('kto mógłby znać') ||
    lowerQuery.includes('połączenie do') ||
    lowerQuery.includes('drogę do') ||
    lowerQuery.includes('jak dotrzeć do') ||
    lowerQuery.includes('wprowadzenie do')
  ) {
    return 'network';
  }
  
  // Match patterns
  if (
    (lowerQuery.includes('potrzebuje') && lowerQuery.includes('oferuje')) ||
    lowerQuery.includes('dopasuj') ||
    lowerQuery.includes('synerg') ||
    lowerQuery.includes('kto powinien poznać') ||
    lowerQuery.includes('najlepsze dopasowania') ||
    lowerQuery.includes('match')
  ) {
    return 'match';
  }
  
  // Briefing patterns
  if (
    lowerQuery.includes('briefing') ||
    lowerQuery.includes('przygotuj mnie do') ||
    lowerQuery.includes('przed spotkaniem') ||
    lowerQuery.includes('co wiem o') ||
    lowerQuery.includes('podsumowanie branży')
  ) {
    return 'briefing';
  }
  
  // Analysis patterns
  if (
    lowerQuery.includes('klastry') ||
    lowerQuery.includes('analiza sieci') ||
    lowerQuery.includes('statystyki') ||
    lowerQuery.includes('kluczowi gracze') ||
    lowerQuery.includes('trendy w sieci') ||
    lowerQuery.includes('struktura sieci')
  ) {
    return 'analysis';
  }
  
  // Simple patterns (common quick questions)
  if (
    lowerQuery.includes('jak się masz') ||
    lowerQuery.includes('cześć') ||
    lowerQuery.includes('dzień dobry') ||
    lowerQuery.includes('pomóż mi napisać') ||
    lowerQuery.includes('co to jest') ||
    lowerQuery.length < 20
  ) {
    return 'simple';
  }
  
  // Cannot determine - need AI
  return null;
}

// AI-based classification using the router function
export async function classifyIntent(query: string): Promise<ClassifyResult> {
  // First try quick local classification
  const quickResult = quickClassify(query);
  if (quickResult) {
    return { intent: quickResult, confidence: 0.9 };
  }
  
  try {
    const { data, error } = await supabase.functions.invoke('ai-chat-router', {
      body: { query }
    });
    
    if (error) {
      console.error('Intent classification error:', error);
      return { intent: 'simple', confidence: 0.5 };
    }
    
    return {
      intent: data.intent || 'simple',
      confidence: data.confidence || 0.5
    };
  } catch (error) {
    console.error('Failed to classify intent:', error);
    return { intent: 'simple', confidence: 0.5 };
  }
}

// Helper to determine if intent needs Master Agent
export function needsMasterAgent(intent: Intent): boolean {
  return intent !== 'simple';
}

// Get display info for intent
export function getIntentDisplay(intent: Intent): { icon: string; label: string; color: string } {
  switch (intent) {
    case 'network':
      return { icon: '🔗', label: 'Analiza połączeń', color: 'text-blue-500' };
    case 'match':
      return { icon: '✨', label: 'Dopasowanie', color: 'text-amber-500' };
    case 'briefing':
      return { icon: '📋', label: 'Briefing', color: 'text-green-500' };
    case 'analysis':
      return { icon: '📊', label: 'Analiza sieci', color: 'text-purple-500' };
    default:
      return { icon: '⚡', label: 'Szybka odpowiedź', color: 'text-primary' };
  }
}
