// ============================================
// Company Analysis Types - 16 Section Structure
// ============================================

// Timeline & History
export interface TimelineEvent {
  year: number;
  event: string;
  impact?: string;
  source?: string;
}

export interface MergerAcquisition {
  year: number;
  type: 'merger' | 'acquisition' | 'spin-off' | 'other';
  details: string;
  value_pln?: number;
  target_company?: string;
}

// Financial Data
export interface Revenue {
  amount: number | null;
  year: number;
  currency: string;
  source?: string;
}

export interface RevenueHistory {
  year: number;
  amount: number;
  growth_pct?: number;
  source?: string;
}

export interface RankingPosition {
  ranking_name: string;
  position: number;
  year: number;
  category?: string;
}

// Products & Services
export interface Product {
  name: string;
  category?: string;
  description: string;
  target_customer?: string;
  price_range?: string | null;
  key_features?: string[];
  availability?: string;
}

export interface Service {
  name: string;
  description: string;
  target?: string;
  category?: string;
}

// Brands
export interface Brand {
  name: string;
  type: 'own' | 'represented' | 'distributed';
  category?: string;
  description?: string;
}

// Locations
export interface Location {
  type: 'headquarters' | 'branch' | 'factory' | 'warehouse' | 'showroom' | 'office';
  city: string;
  address?: string | null;
  region?: string;
  opening_year?: number | null;
  size_sqm?: number | null;
  employee_count?: number | null;
}

export interface Headquarters {
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  coordinates?: { lat: number; lng: number };
}

export interface GeographicCoverage {
  poland_cities?: string[];
  poland_regions?: string[];
  international_countries?: string[];
  export_markets?: string[];
}

// Clients & Projects
export interface ReferenceProject {
  name: string;
  client?: string;
  description: string;
  year?: number;
  value_pln?: number;
  industry?: string;
}

export interface KeyClient {
  name: string;
  industry?: string;
  relationship_type?: string;
  since_year?: number;
}

// Competition
export interface Competitor {
  name: string;
  strength?: string;
  weakness?: string;
  market_share?: string;
}

// Collaboration
export interface CollaborationOpportunity {
  area: string;
  description: string;
  fit_for?: string;
  priority?: 'high' | 'medium' | 'low';
}

// Management
export interface ManagementPerson {
  name: string;
  position: string;
  linkedin?: string;
  source?: string;
  photo_url?: string;
  bio?: string;
}

// News
export interface NewsItem {
  date?: string;
  title: string;
  summary: string;
  source?: string;
  url?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
}

export interface MarketSignal {
  type: 'expansion' | 'hiring' | 'investment' | 'partnership' | 'product_launch' | 'other';
  description: string;
  date?: string;
  source?: string;
}

// CSR
export interface CSRActivity {
  area: string;
  description: string;
  impact?: string;
  year?: number;
}

// Metadata
export interface EnrichmentMetadata {
  perplexity_used?: boolean;
  perplexity_queries?: number;
  perplexity_citations?: string[];
  firecrawl_used?: boolean;
  pages_scraped?: number;
  external_sources?: number;
  analyzed_at?: string;
  confidence_score?: number;
  overall_confidence?: 'high' | 'medium' | 'low';
  missing_sections?: string[];
  data_freshness?: string;
}

export interface DataSources {
  perplexity?: {
    queries_executed?: number;
    topics?: string[];
  };
  firecrawl?: {
    pages_scraped?: number;
    categories?: string[];
    total_words?: number;
  };
  lovable_ai?: {
    model?: string;
    tokens_used?: number | null;
  };
  krs_api?: {
    verified?: boolean;
    source?: string;
  };
  ceidg_api?: {
    verified?: boolean;
    source?: string;
  };
  registry_source?: 'krs_api' | 'ceidg_api' | 'firecrawl' | 'perplexity' | 'manual';
}

// Group Company structure (for group analysis)
export interface GroupCompany {
  name: string;
  nip?: string;
  revenue_amount?: number;
  revenue_year?: number;
  role?: 'parent' | 'subsidiary' | 'affiliate';
  ownership_percent?: number;
}

export interface ConsolidatedRevenue {
  amount: number;
  year: number;
  source?: string;
}

// ============================================
// Main Company Analysis Interface - 16 Sections
// ============================================
export interface CompanyAnalysis {
  // SEKCJA 1: Podstawowe informacje
  name?: string;
  short_name?: string;
  legal_form?: string | null;
  industry?: string;
  sub_industries?: string[] | string;
  description?: string;
  tagline?: string | null;
  year_founded?: number | null;
  founder_info?: string | null;
  
  // SEKCJA 2: Historia i kamienie milowe
  timeline?: TimelineEvent[];
  major_transformations?: string[];
  mergers_acquisitions?: MergerAcquisition[];
  expansion_history?: string;
  founding_story?: string;
  
  // SEKCJA 3: Dane finansowe
  revenue?: Revenue;
  revenue_history?: RevenueHistory[];
  employee_count?: string | number;
  employee_growth?: string;
  market_position?: string;
  market_share_info?: string;
  growth_rate?: number;
  ranking_positions?: RankingPosition[];
  
  // SEKCJA 4: Model biznesowy
  business_model?: string;
  value_proposition?: string;
  competitive_advantages?: string[];
  competitive_position?: string;
  core_activities?: string[] | string;
  revenue_streams?: string[];
  
  // SEKCJA 5: Produkty i usługi
  products?: Product[] | string[] | string;
  services?: Service[] | string;
  flagship_products?: string[];
  main_products_services?: string[];
  key_projects?: string[] | string;
  
  // SEKCJA 6: Marki i dealerstwa
  own_brands?: Brand[] | string[];
  represented_brands?: Brand[] | string[];
  partnerships?: string[] | string;
  dealerships?: string[];
  
  // SEKCJA 7: Lokalizacje i zasięg
  headquarters?: Headquarters;
  locations?: Location[];
  geographic_coverage?: GeographicCoverage;
  
  // SEKCJA 8: Klienci i projekty referencyjne
  reference_projects?: ReferenceProject[];
  key_clients?: KeyClient[] | string[];
  target_industries?: string[];
  target_clients?: string;
  
  // SEKCJA 9: Konkurencja
  main_competitors?: Competitor[] | string[];
  competitive_differentiation?: string;
  market_challenges?: string[];
  
  // SEKCJA 10: Co firma oferuje
  offer_summary?: string;
  unique_selling_points?: string[] | string;
  certifications?: string[] | string;
  awards?: string[];
  what_company_offers?: string;
  
  // SEKCJA 11: Czego firma szuka
  seeking_clients?: string;
  seeking_partners?: string;
  seeking_suppliers?: string;
  hiring_positions?: string[] | string;
  expansion_plans?: string;
  pain_points?: string[] | string;
  what_company_seeks?: string;
  
  // SEKCJA 12: Potencjał współpracy
  collaboration_opportunities?: CollaborationOpportunity[] | string;
  ideal_partner_profile?: string;
  synergy_potential?: string[] | string;
  collaboration_areas?: string;
  
  // SEKCJA 13: Zarząd i organizacja
  management?: ManagementPerson[] | string;
  company_size?: string;
  company_culture?: string;
  organizational_structure?: string;
  
  // SEKCJA 14: Newsy i sygnały rynkowe
  recent_news?: NewsItem[] | string;
  market_signals?: MarketSignal[] | string[] | string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  
  // SEKCJA 15: CSR i działalność społeczna
  csr_activities?: CSRActivity[] | string[];
  sustainability_initiatives?: string[];
  social_impact?: string;
  
  // SEKCJA 16: Dane rejestrowe
  nip?: string;
  regon?: string;
  krs?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  
  // SEKCJA 17: Grupa kapitałowa
  is_group?: boolean;
  group_companies?: GroupCompany[];
  consolidated_revenue?: ConsolidatedRevenue;
  parent_company_id?: string;
  
  // Metadata
  confidence?: 'high' | 'medium' | 'low';
  data_freshness?: string;
  sources?: string[] | string;
  analysis_notes?: string[] | string;
  enrichment_metadata?: EnrichmentMetadata;
  analysis_metadata?: EnrichmentMetadata;
  
  // Legacy fields for backwards compatibility
  what_company_does?: string;
  founding_year?: string;
  competitive_advantage?: string;
}

// Props for CompanyAnalysisViewer
export interface CompanyAnalysisViewerProps {
  analysis: CompanyAnalysis | null;
  confidenceScore?: number;
  missingSections?: string[];
  dataSources?: DataSources;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  companyName?: string;
}

// Section Props
export interface SectionProps {
  data: CompanyAnalysis;
}

// Helper type for section confidence
export type SectionConfidence = 'high' | 'medium' | 'low' | 'none';
