// Business Interview Types

export interface BusinessInterview {
  id: string;
  contact_id: string;
  tenant_id: string;
  status: 'draft' | 'completed' | 'ai_processed' | 'approved';
  version: number;
  section_a_basic: SectionABasic;
  section_c_company_profile: SectionCCompanyProfile;
  section_d_scale: SectionDScale;
  section_f_strategy: SectionFStrategy;
  section_g_needs: SectionGNeeds;
  section_h_investments: SectionHInvestments;
  section_j_value_for_cc: SectionJValueForCC;
  section_k_engagement: SectionKEngagement;
  section_l_personal: SectionLPersonal;
  section_m_organizations: SectionMOrganizations;
  section_n_followup: SectionNFollowup;
  filled_by: string | null;
  meeting_date: string | null;
  created_at: string;
  updated_at: string;
}

// Section A: Dane podstawowe + Kontekst spotkania (B merged into A)
export interface SectionABasic {
  // Dane podstawowe
  branza?: string;
  typ_kontaktu?: 'znajomy' | 'klient';
  branza_tagi?: string[];
  email_bezposredni?: string;
  telefon_prywatny?: string;
  www?: string;
  nip?: string;
  email_asystenta?: string;
  telefon_asystenta?: string;
  zrodlo_kontaktu?: string;
  // Kontekst spotkania (B)
  podpowiedzi_brief?: string;
  status_relacji?: 'nowy' | 'polecony' | 'powracajacy';
  rozważa_aplikacje_cc?: 'tak' | 'nie' | 'nie_wiem';
  firma_nieznana?: boolean;
}

// Section C: Firma główna - profil
export interface SectionCCompanyProfile {
  // Profil działalności
  zakres_dzialalnosci?: string;
  rynki?: string;
  produkty_uslugi?: string[];
  wartosc_dla_klientow?: string;
  powod_dumy?: string;
  // Rola
  tytul_rola?: string;
  ceo_operacyjny?: boolean;
  poziom_decyzyjnosci?: number; // 1-5
  // Własność
  procent_udzialow?: number;
  wspolnicy?: boolean;
  lista_wspolnikow?: Array<{ nazwa: string; procent: number }>;
  inwestor_finansowy?: boolean;
}

// Section D: Skala biznesu i inne biznesy
export interface SectionDScale {
  // Skala grupy
  przychody_ostatni_rok?: string;
  przychody_plan?: string;
  ebitda_ostatni?: string;
  ebitda_plan?: string;
  pracownicy?: string;
  pojazdy?: number;
  liczba_spolek?: number;
  glowna_vs_holding?: boolean;
  // Pozostałe biznesy
  inne_branze?: string[];
  skala_pl?: string;
  skala_zagranica?: string;
  kraje_dzialalnosci?: string[];
}

// Section F: Strategia 2-3 lata
export interface SectionFStrategy {
  cele_strategiczne?: string;
  wplyw_makro?: string;
  szanse?: string;
  ryzyka?: string;
}

// Section G: Potrzeby biznesowe
export interface SectionGNeeds {
  top3_priorytety?: string[];
  najwieksze_wyzwanie?: string;
  czego_poszukuje?: string[];
  jakich_kontaktow?: string;
  jakich_rekomendacji?: string;
  grupa_docelowa?: string;
  horyzont_czasowy?: '0-6' | '6-18' | '18+';
  priorytet?: 'niski' | 'sredni' | 'wysoki';
}

// Section H: Inwestycje
export interface SectionHInvestments {
  // Ostatnie
  ostatnie_typ?: string;
  ostatnie_kwota?: string;
  ostatnie_doradcy?: string;
  ostatnie_decydenci?: string;
  // Planowane
  planowane_projekty?: string;
  czego_brakuje?: string;
  czego_brakuje_typ?: ('kontakt' | 'finansowanie' | 'udzialowiec' | 'vendor')[];
  status?: 'idea' | 'w_trakcie' | 'loi' | 'closed';
}

// Section J: Wartość dla CC
export interface SectionJValueForCC {
  kontakty?: string;
  knowhow?: string;
  zasoby?: string;
}

// Section K: Zaangażowanie w CC
export interface SectionKEngagement {
  mentoring?: boolean;
  mentoring_opis?: string;
  leadership?: boolean;
  leadership_opis?: string;
  edukacja?: boolean;
  edukacja_opis?: string;
  filantropia?: boolean;
  filantropia_opis?: string;
  integracja?: boolean;
  integracja_opis?: string;
}

// Rodzina - członek rodziny
export interface CzlonekRodziny {
  imie?: string;
  wiek?: number;
  zajecie?: string;
}

// Section L: Prywatne
export interface SectionLPersonal {
  miasto_bazowe?: string;
  czeste_lokalizacje?: string[];
  hobby?: string[];
  cele_prywatne?: string;
  sukcesja?: boolean;
  sukcesja_opis?: string;
  zasady?: string;
  // Rodzina
  partner?: CzlonekRodziny;
  dzieci?: CzlonekRodziny[];
}

// Section M: Organizacje/fundacje
export interface SectionMOrganizations {
  fundacje_csr?: string[];
  organizacje_branzowe?: string[];
  izby_handlowe?: string[];
  stowarzyszenia?: string[];
  inne?: string;
}

// Section N: Follow-up
export interface SectionNFollowup {
  pytania_klienta?: string;
  kolejne_spotkanie?: string;
  wizyta_cc?: string;
  doslanie_dokumentow?: string;
  email_podsumowanie?: string;
  ustalenia_koncowe?: string;
}

// AI Output Types
export interface BIAIOutput {
  id: string;
  business_interview_id: string;
  tenant_id: string;
  version: number;
  missing_info: MissingInfoItem[];
  needs_offers: NeedOfferProposal[];
  task_proposals: TaskProposal[];
  connection_recommendations: ConnectionRecommendation[];
  summary: BISummary;
  processing_status: 'pending' | 'processing' | 'completed' | 'error';
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface MissingInfoItem {
  id: string;
  question: string;
  field: string;
  section: string;
  priority: number;
  answered: boolean;
  answer?: string;
}

export interface NeedOfferProposal {
  id: string;
  need: string;
  proposed_offer: string;
  reasoning: string;
  confidence: number;
  source_fields: string[];
  accepted: boolean | null;
  edited: boolean;
}

export interface TaskProposal {
  id: string;
  title: string;
  description: string;
  type: 'followup' | 'sales' | 'networking';
  due_date?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  confidence: number;
  source_fields: string[];
  accepted: boolean | null;
  created_task_id?: string;
  // For connection tasks
  is_cross_task?: boolean;
  target_contact_id?: string;
  target_contact_name?: string;
  connection_reason?: string;
  suggested_intro?: string;
}

export interface ConnectionRecommendation {
  id: string;
  contact_id: string;
  contact_name: string;
  company?: string;
  match_reason: string;
  connection_type: 'intro' | 'consultation' | 'vendor' | 'investor' | 'partner';
  suggested_intro: string;
  confidence: number;
  source_fields: string[];
  accepted: boolean | null;
  created_task_id?: string;
}

export interface BISummary {
  kluczowe_wnioski?: string[];
  glowne_potrzeby?: string[];
  potencjal_cc?: string;
  proponowany_status?: 'lead' | 'candidate' | 'active';
  confidence?: number;
}

// Validation result
export interface BIValidationResult {
  valid: boolean;
  missing: string[];
}

// Revenue/EBITDA presets
export const REVENUE_PRESETS = [
  { value: 'do_10mln', label: 'do 10 mln PLN' },
  { value: '10_50mln', label: '10-50 mln PLN' },
  { value: '50_100mln', label: '50-100 mln PLN' },
  { value: '100_300mln', label: '100-300 mln PLN' },
  { value: '300_500mln', label: '300-500 mln PLN' },
  { value: '500mln_1mld', label: '500 mln - 1 mld PLN' },
  { value: 'powyzej_1mld', label: 'powyżej 1 mld PLN' },
];

// Seeking categories
export const SEEKING_CATEGORIES = [
  { value: 'klienci', label: 'Klienci' },
  { value: 'ekspansja', label: 'Ekspansja' },
  { value: 'kapital', label: 'Kapitał' },
  { value: 'ma', label: 'M&A' },
  { value: 'inwestor', label: 'Inwestor' },
  { value: 'hr', label: 'HR / Kadry' },
  { value: 'optymalizacja', label: 'Optymalizacja' },
  { value: 'technologia', label: 'Technologia' },
];
