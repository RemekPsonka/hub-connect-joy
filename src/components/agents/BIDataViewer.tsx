import { Building2, Users, Target, TrendingUp, Handshake, Heart, Loader2, FileQuestion } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useBIData, BIProfile } from '@/hooks/useBIInterview';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface BIDataViewerProps {
  contactId: string;
}

// Section configuration
const SECTIONS = [
  { key: 'section_1_basic_info', label: 'Podstawowe', icon: Building2 },
  { key: 'section_2_business_metrics', label: 'Metryki', icon: TrendingUp },
  { key: 'section_3_priorities_challenges', label: 'Priorytety', icon: Target },
  { key: 'section_4_investments', label: 'Inwestycje', icon: TrendingUp },
  { key: 'section_5_cc_relations', label: 'Relacje CC', icon: Handshake },
  { key: 'section_6_personal', label: 'Prywatne', icon: Heart },
] as const;

// Field labels in Polish
const FIELD_LABELS: Record<string, string> = {
  full_name: 'Imię i nazwisko',
  company_main: 'Główna firma',
  industry: 'Branża',
  nip: 'NIP',
  website: 'Strona www',
  linkedin: 'LinkedIn',
  assistant_name: 'Asystent - imię',
  assistant_email: 'Asystent - email',
  assistant_phone: 'Asystent - telefon',
  headquarters: 'Siedziba',
  residence: 'Miejsce zamieszkania',
  founded_year: 'Rok założenia',
  company_age_years: 'Wiek firmy (lata)',
  employees_count: 'Liczba pracowników',
  clients_current: 'Obecna liczba klientów',
  clients_plan_this_year: 'Plan klientów na rok',
  revenue_last_year: 'Przychody (ostatni rok)',
  revenue_plan_this_year: 'Plan przychodów',
  ebitda_last_year: 'EBITDA (ostatni rok)',
  ebitda_plan_this_year: 'Plan EBITDA',
  ebitda_yoy_change_percent: 'Zmiana EBITDA r/r (%)',
  other_kpis: 'Inne KPI',
  main_activity: 'Główna działalność',
  markets: 'Rynki',
  top_products: 'Top produkty',
  value_proposition: 'Propozycja wartości',
  formal_role: 'Formalna rola',
  ownership_structure: 'Struktura własności',
  total_business_scale: 'Skala biznesu',
  other_businesses: 'Inne biznesy',
  top_3_priorities: 'Top 3 priorytety',
  biggest_challenge: 'Największe wyzwanie',
  biggest_achievement: 'Największe osiągnięcie',
  proudest_products: 'Dumne produkty',
  top_3_clients: 'Top 3 klienci',
  client_profile: 'Profil klienta',
  what_seeking: 'Czego szuka',
  strategy_2_3_years: 'Strategia 2-3 lata',
  consults_decisions_with: 'Konsultuje decyzje z',
  economic_situation_impact: 'Wpływ sytuacji ekonomicznej',
  recent_investments: 'Ostatnie inwestycje',
  planned_investments: 'Planowane inwestycje',
  source_of_contact: 'Źródło kontaktu',
  attended_cc_meetings: 'Obecność na spotkaniach CC',
  wants_to_meet: 'Chce poznać',
  currently_cooperates_with: 'Współpracuje z',
  value_to_cc: 'Wartość dla CC',
  engagement_in_cc: 'Zaangażowanie w CC',
  family: 'Rodzina',
  work_life_balance: 'Work-life balance',
  personal_goals_2_3_years: 'Cele osobiste 2-3 lata',
  succession_plan: 'Plan sukcesji',
  passions: 'Pasje',
  life_principles: 'Zasady życiowe',
  philanthropy: 'Filantropia',
  other_memberships: 'Inne członkostwa',
};

// Format value for display
function formatValue(value: any): string {
  if (value === null || value === undefined) return 'brak danych';
  if (typeof value === 'boolean') return value ? 'Tak' : 'Nie';
  if (typeof value === 'number') {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M PLN`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k PLN`;
    return value.toString();
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return 'brak danych';
    return value.join(', ');
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value).filter(([_, v]) => v !== null && v !== undefined);
    if (entries.length === 0) return 'brak danych';
    return entries.map(([k, v]) => `${FIELD_LABELS[k] || k}: ${formatValue(v)}`).join('; ');
  }
  return String(value);
}

// Calculate section completeness
function getSectionCompleteness(sectionData: any, sectionKey: string): number {
  if (!sectionData) return 0;
  
  const fieldCounts: Record<string, number> = {
    section_1_basic_info: 13,
    section_2_business_metrics: 17,
    section_3_priorities_challenges: 10,
    section_4_investments: 2,
    section_5_cc_relations: 6,
    section_6_personal: 8,
  };
  
  const totalFields = fieldCounts[sectionKey] || 10;
  const filledFields = Object.values(sectionData).filter(v => 
    v !== null && v !== undefined && v !== '' && 
    !(Array.isArray(v) && v.length === 0) &&
    !(typeof v === 'object' && Object.keys(v).length === 0)
  ).length;
  
  return Math.round((filledFields / totalFields) * 100);
}

// Section content renderer
function SectionContent({ sectionKey, data }: { sectionKey: string; data: any }) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileQuestion className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">
          Brak danych w tej sekcji. Przeprowadź wywiad BI, aby uzupełnić.
        </p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            {FIELD_LABELS[key] || key}
          </p>
          <p className={`text-sm ${value ? '' : 'text-muted-foreground/50 italic'}`}>
            {formatValue(value)}
          </p>
        </div>
      ))}
    </div>
  );
}

export function BIDataViewer({ contactId }: BIDataViewerProps) {
  const { data: biData, isLoading, error } = useBIData(contactId);

  if (isLoading) {
    return (
      <Card className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="min-h-[400px] flex items-center justify-center">
        <p className="text-destructive">Błąd ładowania danych BI</p>
      </Card>
    );
  }

  if (!biData) {
    return (
      <Card className="min-h-[400px]">
        <CardHeader>
          <CardTitle>Dane Business Intelligence</CardTitle>
          <CardDescription>
            Brak danych BI dla tego kontaktu. Przeprowadź wywiad BI w zakładce "Wywiad BI".
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileQuestion className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground text-center max-w-md">
            Wywiad BI pozwala zebrać strukturalne informacje o kontakcie 
            w 6 kategoriach: podstawowe dane, metryki biznesowe, priorytety, 
            inwestycje, relacje CC oraz informacje prywatne.
          </p>
        </CardContent>
      </Card>
    );
  }

  const profile = biData.bi_profile || {};
  const completeness = Math.round((biData.completeness_score || 0) * 100);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Dane Business Intelligence</CardTitle>
            <CardDescription>
              Strukturalne dane zebrane podczas wywiadu BI
            </CardDescription>
          </div>
          <Badge variant={biData.bi_status === 'complete' ? 'default' : 'secondary'}>
            {biData.bi_status === 'complete' ? 'Kompletny' : 
             biData.bi_status === 'in_progress' ? 'W trakcie' : 'Niekompletny'}
          </Badge>
        </div>
        
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Kompletność danych</span>
            <span className="font-medium">{completeness}%</span>
          </div>
          <Progress value={completeness} className="h-2" />
          
          {biData.last_bi_update && (
            <p className="text-xs text-muted-foreground">
              Ostatnia aktualizacja: {format(new Date(biData.last_bi_update), 'dd MMM yyyy, HH:mm', { locale: pl })}
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="section_1_basic_info" className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-4">
            {SECTIONS.map(({ key, label, icon: Icon }) => {
              const sectionData = profile[key as keyof BIProfile];
              const sectionCompleteness = getSectionCompleteness(sectionData, key);
              
              return (
                <TabsTrigger key={key} value={key} className="relative">
                  <div className="flex flex-col items-center gap-1">
                    <Icon className="h-4 w-4" />
                    <span className="text-xs hidden sm:inline">{label}</span>
                  </div>
                  {sectionCompleteness > 0 && (
                    <div 
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center"
                    >
                      {sectionCompleteness > 60 ? '✓' : Math.round(sectionCompleteness / 10)}
                    </div>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {SECTIONS.map(({ key, label }) => (
            <TabsContent key={key} value={key} className="mt-4">
              <div className="mb-4">
                <h3 className="font-semibold">{label}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Progress 
                    value={getSectionCompleteness(profile[key as keyof BIProfile], key)} 
                    className="h-1 flex-1 max-w-[200px]" 
                  />
                  <span className="text-xs text-muted-foreground">
                    {getSectionCompleteness(profile[key as keyof BIProfile], key)}% kompletności
                  </span>
                </div>
              </div>
              <SectionContent 
                sectionKey={key} 
                data={profile[key as keyof BIProfile]} 
              />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
