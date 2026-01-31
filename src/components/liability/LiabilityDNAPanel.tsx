import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { useLiabilityDNA } from '@/hooks/useLiabilityDNA';
import { RevenueInput } from './RevenueInput';
import { TerritorialSplit } from './TerritorialSplit';
import { ActivityRiskProfile } from './ActivityRiskProfile';
import { SpecialExposureCards } from './SpecialExposureCards';
import { LiabilityLimitRecommender } from './LiabilityLimitRecommender';
import type { Currency, TerritorialSplit as TerritorialSplitType, ActivityProfile, SpecialExposures } from './types';

interface LiabilityDNAPanelProps {
  companyId: string;
}

export function LiabilityDNAPanel({ companyId }: LiabilityDNAPanelProps) {
  const { profile, isLoading, saveProfile, generateAIRecommendation, riskAlerts, tenantId } = useLiabilityDNA(companyId);

  // Local state for form
  const [revenue, setRevenue] = useState(0);
  const [currency, setCurrency] = useState<Currency>('PLN');
  const [territorialSplit, setTerritorialSplit] = useState<TerritorialSplitType>({
    poland_pct: 100,
    eu_oecd_pct: 0,
    usa_canada_pct: 0,
    rest_world_pct: 0,
  });
  const [activityProfile, setActivityProfile] = useState<ActivityProfile>({
    manufacturing: false,
    services: false,
    installation: false,
    trading: false,
  });
  const [servicesAdvisoryPct, setServicesAdvisoryPct] = useState<number>(50);
  const [specialExposures, setSpecialExposures] = useState<SpecialExposures>({
    aviation_auto_rail_offshore: false,
    ecommerce: false,
    b2b_vs_b2c_pct: 50,
  });

  // Sync local state with profile data
  useEffect(() => {
    if (profile) {
      setRevenue(Number(profile.total_annual_revenue) || 0);
      setCurrency(profile.currency as Currency);
      setTerritorialSplit({
        poland_pct: Number(profile.territory_poland_pct) || 0,
        eu_oecd_pct: Number(profile.territory_eu_oecd_pct) || 0,
        usa_canada_pct: Number(profile.territory_usa_canada_pct) || 0,
        rest_world_pct: Number(profile.territory_rest_world_pct) || 0,
      });
      setActivityProfile({
        manufacturing: profile.activity_manufacturing,
        services: profile.activity_services,
        installation: profile.activity_installation,
        trading: profile.activity_trading,
      });
      setServicesAdvisoryPct(Number(profile.services_advisory_pct) || 50);
      setSpecialExposures({
        aviation_auto_rail_offshore: profile.exposure_aviation_auto_rail_offshore,
        ecommerce: profile.exposure_ecommerce,
        b2b_vs_b2c_pct: Number(profile.b2b_vs_b2c_pct) || 50,
      });
    }
  }, [profile]);

  const handleSave = () => {
    saveProfile.mutate({
      total_annual_revenue: revenue,
      currency,
      territory_poland_pct: territorialSplit.poland_pct,
      territory_eu_oecd_pct: territorialSplit.eu_oecd_pct,
      territory_usa_canada_pct: territorialSplit.usa_canada_pct,
      territory_rest_world_pct: territorialSplit.rest_world_pct,
      activity_manufacturing: activityProfile.manufacturing,
      activity_services: activityProfile.services,
      activity_installation: activityProfile.installation,
      activity_trading: activityProfile.trading,
      services_advisory_pct: activityProfile.services ? servicesAdvisoryPct : null,
      exposure_aviation_auto_rail_offshore: specialExposures.aviation_auto_rail_offshore,
      exposure_ecommerce: specialExposures.ecommerce,
      b2b_vs_b2c_pct: specialExposures.b2b_vs_b2c_pct,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Save Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">DNA Ekspozycji Finansowej i Odpowiedzialności</h2>
          <p className="text-sm text-muted-foreground">
            Analiza struktury przychodów dla oceny ryzyka OC
          </p>
        </div>
        <Button onClick={handleSave} disabled={saveProfile.isPending}>
          {saveProfile.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Zapisz
        </Button>
      </div>

      {/* 1. Revenue Input */}
      <RevenueInput
        value={revenue}
        currency={currency}
        onChange={setRevenue}
        onCurrencyChange={setCurrency}
      />

      {/* 2. Territorial Split */}
      <TerritorialSplit
        split={territorialSplit}
        totalRevenue={revenue}
        currency={currency}
        onChange={setTerritorialSplit}
      />

      {/* 3. Activity Risk Profile */}
      <ActivityRiskProfile
        profile={activityProfile}
        servicesAdvisoryPct={servicesAdvisoryPct}
        onChange={setActivityProfile}
        onServicesAdvisoryChange={setServicesAdvisoryPct}
      />

      {/* 4. Special Exposures */}
      <SpecialExposureCards
        exposures={specialExposures}
        onChange={setSpecialExposures}
      />

      {/* 5. AI Limit Recommender */}
      <LiabilityLimitRecommender
        suggestedLimit={profile?.ai_suggested_limit_eur ? Number(profile.ai_suggested_limit_eur) : null}
        reason={profile?.ai_recommendation_reason || null}
        generatedAt={profile?.ai_generated_at || null}
        riskAlerts={riskAlerts}
        isGenerating={generateAIRecommendation.isPending}
        onGenerate={() => generateAIRecommendation.mutate()}
        hasProfile={!!profile}
      />
    </div>
  );
}
