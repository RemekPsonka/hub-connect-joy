import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { LiabilityExposureProfile, LiabilityRiskAlert, Currency } from '@/components/liability/types';

interface ProfileInput {
  total_annual_revenue: number;
  currency: Currency;
  territory_poland_pct: number;
  territory_eu_oecd_pct: number;
  territory_usa_canada_pct: number;
  territory_rest_world_pct: number;
  activity_manufacturing: boolean;
  activity_services: boolean;
  activity_installation: boolean;
  activity_trading: boolean;
  services_advisory_pct: number | null;
  exposure_aviation_auto_rail_offshore: boolean;
  exposure_ecommerce: boolean;
  b2b_vs_b2c_pct: number;
  notes?: string | null;
}

function roundToNiceNumber(value: number): number {
  if (value <= 0) return 1_000_000;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  
  if (normalized <= 1) return magnitude;
  if (normalized <= 2) return 2 * magnitude;
  if (normalized <= 5) return 5 * magnitude;
  return 10 * magnitude;
}

function calculateSuggestedLimit(profile: LiabilityExposureProfile): number {
  let baseLimit = 1_000_000; // 1M EUR base
  
  // Revenue factor (logarithmic scale)
  if (profile.total_annual_revenue > 0) {
    const revenueFactor = Math.log10(profile.total_annual_revenue / 1_000_000 + 1);
    baseLimit *= (1 + revenueFactor * 0.5);
  }
  
  // USA/Canada multiplier (critical risk)
  if (profile.territory_usa_canada_pct > 0) {
    const usaMultiplier = 1 + (profile.territory_usa_canada_pct / 100) * 3;
    baseLimit *= usaMultiplier;
  }
  
  // High-risk industries (aviation, auto, rail, offshore)
  if (profile.exposure_aviation_auto_rail_offshore) {
    baseLimit *= 2.5;
  }
  
  // Manufacturing increases product liability risk
  if (profile.activity_manufacturing) {
    baseLimit *= 1.5;
  }
  
  // e-Commerce adds cyber risk
  if (profile.exposure_ecommerce) {
    baseLimit *= 1.2;
  }
  
  // Professional services add professional indemnity exposure
  if (profile.activity_services) {
    baseLimit *= 1.3;
  }
  
  return roundToNiceNumber(baseLimit);
}

function generateRecommendationReason(profile: LiabilityExposureProfile): string {
  const reasons: string[] = [];
  
  if (profile.territory_usa_canada_pct > 0) {
    reasons.push(`${profile.territory_usa_canada_pct}% ekspozycji na USA/Kanadę wymaga wyższych limitów i rozszerzonego zakresu terytorialnego`);
  }
  
  if (profile.exposure_aviation_auto_rail_offshore) {
    reasons.push('Branże wysokiego ryzyka (lotnictwo/automotive/kolej/offshore) wymagają specjalistycznych polis');
  }
  
  if (profile.activity_manufacturing) {
    reasons.push('Działalność produkcyjna generuje znaczące ryzyko produktowe');
  }
  
  if (profile.exposure_ecommerce) {
    reasons.push('Sprzedaż online wymaga dodatkowego ubezpieczenia cyber i ochrony danych');
  }
  
  if (profile.activity_services) {
    reasons.push('Usługi doradcze wymagają OC zawodowego');
  }
  
  if (profile.territory_eu_oecd_pct > 30) {
    reasons.push(`${profile.territory_eu_oecd_pct}% eksportu do UE/OECD wymaga zakresu terytorialnego Worldwide excl. USA`);
  }
  
  if (reasons.length === 0) {
    reasons.push('Standardowy profil ryzyka - rekomendowany limit bazowy');
  }
  
  return reasons.join('\n• ');
}

function generateRiskAlerts(profile: LiabilityExposureProfile): LiabilityRiskAlert[] {
  const alerts: LiabilityRiskAlert[] = [];
  
  // USA/Canada exposure - critical
  if (profile.territory_usa_canada_pct > 0) {
    alerts.push({
      id: 'usa-exposure',
      type: 'critical',
      message: `Ekspozycja na USA/Kanadę (${profile.territory_usa_canada_pct}%) wymaga rozszerzonego zakresu OC i wyższych limitów`,
      trigger: 'territory_usa > 0%',
    });
  }
  
  // High-severity industries
  if (profile.exposure_aviation_auto_rail_offshore) {
    alerts.push({
      id: 'high-severity',
      type: 'critical',
      message: 'Branże wysokiego ryzyka (lotnictwo/automotive/kolej/offshore) - wymagana specjalistyczna polisa',
      trigger: 'aviation_auto_rail_offshore = true',
    });
  }
  
  // e-Commerce cyber risk
  if (profile.exposure_ecommerce) {
    alerts.push({
      id: 'cyber-privacy',
      type: 'warning',
      message: 'Sprzedaż online generuje ryzyko Cyber i RODO - rozważ ubezpieczenie Cyber',
      trigger: 'ecommerce = true',
    });
  }
  
  // Manufacturing with export
  if (profile.activity_manufacturing && 
      (profile.territory_eu_oecd_pct > 20 || profile.territory_usa_canada_pct > 0)) {
    alerts.push({
      id: 'product-export',
      type: 'warning',
      message: 'Produkcja z eksportem wymaga OC produktowego z rozszerzonym zakresem terytorialnym',
      trigger: 'manufacturing + export',
    });
  }
  
  // B2C exposure
  if (profile.b2b_vs_b2c_pct < 30) {
    alerts.push({
      id: 'b2c-exposure',
      type: 'info',
      message: 'Duża ekspozycja na klientów indywidualnych (B2C) - większe ryzyko roszczeń konsumenckich',
      trigger: 'b2b_pct < 30%',
    });
  }
  
  return alerts;
}

export function useLiabilityDNA(companyId: string) {
  const queryClient = useQueryClient();
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;

  const { data: profile, isLoading } = useQuery({
    queryKey: ['liability-dna', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('liability_exposure_profiles')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) throw error;
      return data as LiabilityExposureProfile | null;
    },
    enabled: !!companyId && !!tenantId,
  });

  const saveProfile = useMutation({
    mutationFn: async (input: ProfileInput) => {
      if (!tenantId) throw new Error('Brak tenant_id');

      const payload = {
        company_id: companyId,
        tenant_id: tenantId,
        ...input,
      };

      if (profile?.id) {
        // Update existing
        const { data, error } = await supabase
          .from('liability_exposure_profiles')
          .update(payload)
          .eq('id', profile.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('liability_exposure_profiles')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liability-dna', companyId] });
      toast.success('Profil ekspozycji zapisany');
    },
    onError: (error) => {
      console.error('Error saving liability profile:', error);
      toast.error('Błąd zapisu profilu');
    },
  });

  const generateAIRecommendation = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error('Brak profilu do analizy');

      const suggestedLimit = calculateSuggestedLimit(profile);
      const reason = generateRecommendationReason(profile);

      const { data, error } = await supabase
        .from('liability_exposure_profiles')
        .update({
          ai_suggested_limit_eur: suggestedLimit,
          ai_recommendation_reason: reason,
          ai_generated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)
        .select()
        .single();

      if (error) throw error;
      return { suggestedLimit, reason, data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liability-dna', companyId] });
      toast.success('Wygenerowano rekomendację limitu');
    },
    onError: (error) => {
      console.error('Error generating AI recommendation:', error);
      toast.error('Błąd generowania rekomendacji');
    },
  });

  const riskAlerts = useMemo(() => {
    if (!profile) return [];
    return generateRiskAlerts(profile);
  }, [profile]);

  return {
    profile,
    isLoading,
    saveProfile,
    generateAIRecommendation,
    riskAlerts,
    tenantId,
  };
}
