import { supabase } from '@/integrations/supabase/client';

// ============= COMPANY ANALYSIS QUERY HELPERS =============

export interface CompanyAnalysisResult {
  id: string;
  name: string;
  ai_analysis: Record<string, unknown> | null;
  analysis_confidence_score: number | null;
  company_analysis_status: string | null;
  company_analysis_date: string | null;
}

// Wyszukaj firmy po branży
export async function searchCompaniesByIndustry(industry: string, tenantId: string) {
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, ai_analysis, analysis_confidence_score, industry')
    .eq('tenant_id', tenantId)
    .eq('company_analysis_status', 'completed')
    .ilike('industry', `%${industry}%`)
    .order('analysis_confidence_score', { ascending: false, nullsFirst: false })
    .limit(20);
  
  if (error) throw error;
  return data;
}

// Wyszukaj firmy po minimalnych przychodach
export async function searchCompaniesByRevenue(
  minRevenue: number, 
  tenantId: string
) {
  // Note: Querying nested JSONB requires raw filter
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, ai_analysis, analysis_confidence_score')
    .eq('tenant_id', tenantId)
    .eq('company_analysis_status', 'completed')
    .order('analysis_confidence_score', { ascending: false, nullsFirst: false })
    .limit(50);
  
  if (error) throw error;
  
  // Filter in JS for revenue (nested JSONB)
  return data?.filter(company => {
    const analysis = company.ai_analysis as Record<string, unknown> | null;
    const revenue = analysis?.revenue as { amount?: number } | undefined;
    return revenue?.amount && revenue.amount >= minRevenue;
  }).slice(0, 20) || [];
}

// Wyszukaj firmy po lokalizacji (miasto)
export async function searchCompaniesByLocation(
  city: string, 
  tenantId: string
) {
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, ai_analysis, analysis_confidence_score, city')
    .eq('tenant_id', tenantId)
    .eq('company_analysis_status', 'completed')
    .ilike('city', `%${city}%`)
    .order('analysis_confidence_score', { ascending: false, nullsFirst: false })
    .limit(20);
  
  if (error) throw error;
  return data;
}

// Pobierz analizy wysokiej jakości (confidence >= 0.7)
export async function getHighConfidenceAnalyses(tenantId: string) {
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, industry, ai_analysis, analysis_confidence_score, company_analysis_date')
    .eq('tenant_id', tenantId)
    .eq('company_analysis_status', 'completed')
    .gte('analysis_confidence_score', 0.7)
    .order('analysis_confidence_score', { ascending: false });
  
  if (error) throw error;
  return data;
}

// Pobierz analizy wymagające uzupełnienia (confidence < 0.5)
export async function getIncompleteAnalyses(tenantId: string) {
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, analysis_missing_sections, analysis_confidence_score')
    .eq('tenant_id', tenantId)
    .eq('company_analysis_status', 'completed')
    .lt('analysis_confidence_score', 0.5)
    .order('analysis_confidence_score', { ascending: true });
  
  if (error) throw error;
  return data;
}

// Pobierz firmy z nieudanymi analizami
export async function getFailedAnalyses(tenantId: string) {
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, company_analysis_status, company_analysis_date')
    .eq('tenant_id', tenantId)
    .eq('company_analysis_status', 'failed')
    .order('company_analysis_date', { ascending: false, nullsFirst: false });
  
  if (error) throw error;
  return data;
}

// Statystyki analiz dla tenant
export interface AnalysisStats {
  total: number;
  completed: number;
  inProgress: number;
  failed: number;
  notStarted: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  averageConfidence: number;
}

export async function getAnalysisStats(tenantId: string): Promise<AnalysisStats> {
  const { data, error } = await supabase
    .from('companies')
    .select('company_analysis_status, analysis_confidence_score')
    .eq('tenant_id', tenantId);
  
  if (error) throw error;
  
  const companies = data || [];
  const completed = companies.filter(c => c.company_analysis_status === 'completed');
  const confidenceScores = completed
    .map(c => c.analysis_confidence_score)
    .filter((s): s is number => s !== null);
  
  return {
    total: companies.length,
    completed: completed.length,
    inProgress: companies.filter(c => c.company_analysis_status === 'in_progress').length,
    failed: companies.filter(c => c.company_analysis_status === 'failed').length,
    notStarted: companies.filter(c => 
      c.company_analysis_status === 'not_started' || c.company_analysis_status === null
    ).length,
    highConfidence: confidenceScores.filter(s => s >= 0.7).length,
    mediumConfidence: confidenceScores.filter(s => s >= 0.5 && s < 0.7).length,
    lowConfidence: confidenceScores.filter(s => s < 0.5).length,
    averageConfidence: confidenceScores.length > 0
      ? Math.round((confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length) * 100) / 100
      : 0
  };
}

// Wyszukaj firmy po produktach/usługach
export async function searchCompaniesByProduct(
  productKeyword: string,
  tenantId: string
) {
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, ai_analysis, analysis_confidence_score')
    .eq('tenant_id', tenantId)
    .eq('company_analysis_status', 'completed')
    .order('analysis_confidence_score', { ascending: false, nullsFirst: false })
    .limit(100);
  
  if (error) throw error;
  
  const keyword = productKeyword.toLowerCase();
  
  // Filter in JS - search in products array
  return data?.filter(company => {
    const analysis = company.ai_analysis as Record<string, unknown> | null;
    if (!analysis) return false;
    
    // Check products array
    const products = analysis.products as Array<{ name?: string; description?: string }> | undefined;
    if (products?.some(p => 
      p.name?.toLowerCase().includes(keyword) || 
      p.description?.toLowerCase().includes(keyword)
    )) return true;
    
    // Check flagship_products
    const flagship = analysis.flagship_products as string[] | undefined;
    if (flagship?.some(p => p.toLowerCase().includes(keyword))) return true;
    
    // Check main_products_services (legacy)
    const mainProducts = analysis.main_products_services as string[] | undefined;
    if (mainProducts?.some(p => p.toLowerCase().includes(keyword))) return true;
    
    return false;
  }).slice(0, 20) || [];
}

// Wyszukaj firmy według czego szukają (seeking)
export async function searchCompaniesBySeeking(
  seekingKeyword: string,
  tenantId: string
) {
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, ai_analysis, analysis_confidence_score')
    .eq('tenant_id', tenantId)
    .eq('company_analysis_status', 'completed')
    .order('analysis_confidence_score', { ascending: false, nullsFirst: false })
    .limit(100);
  
  if (error) throw error;
  
  const keyword = seekingKeyword.toLowerCase();
  
  return data?.filter(company => {
    const analysis = company.ai_analysis as Record<string, unknown> | null;
    if (!analysis) return false;
    
    // Check all seeking fields
    const seekingClients = (analysis.seeking_clients as string || '').toLowerCase();
    const seekingPartners = (analysis.seeking_partners as string || '').toLowerCase();
    const seekingSuppliers = (analysis.seeking_suppliers as string || '').toLowerCase();
    const collabOpps = analysis.collaboration_opportunities as string[] | undefined;
    
    return seekingClients.includes(keyword) ||
           seekingPartners.includes(keyword) ||
           seekingSuppliers.includes(keyword) ||
           collabOpps?.some(o => o.toLowerCase().includes(keyword)) ||
           false;
  }).slice(0, 20) || [];
}
