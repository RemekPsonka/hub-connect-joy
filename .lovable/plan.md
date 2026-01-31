

## Plan: Panel Zarządzania Ofertowaniem i Raportami Finansowymi Polis

### Cel
Stworzenie kompleksowego widoku do zarządzania procesem ofertowania polis ubezpieczeniowych ze wszystkich firm, z lejkiem sprzedażowym, timeline'em i raportami finansowymi. System odróżnia "nasze polisy" od "obcych" i pozwala śledzić postęp prac nad odnowieniami.

---

## Architektura Rozwiązania

### Nowe pliki do utworzenia

| Plik | Cel |
|------|-----|
| `src/pages/PolicyPipeline.tsx` | Główna strona zarządzania ofertowaniem |
| `src/components/pipeline/PolicyPipelineDashboard.tsx` | Dashboard z podsumowaniem i lejkiem |
| `src/components/pipeline/PolicyTimelineView.tsx` | Lewy panel - timeline wszystkich polis |
| `src/components/pipeline/PolicyFunnelView.tsx` | Lejek sprzedażowy z etapami |
| `src/components/pipeline/PolicyFinancialReports.tsx` | Raporty finansowe (zakładka) |
| `src/components/pipeline/PolicyKPICards.tsx` | Karty KPI dla dashboardu |
| `src/components/pipeline/OurPoliciesReport.tsx` | Raport "Naszych polis" |
| `src/components/pipeline/index.ts` | Eksporty modułu |
| `src/hooks/useAllPolicies.ts` | Hook pobierający polisy wszystkich firm |

### Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/layout/AppSidebar.tsx` | Dodanie nawigacji "Ofertowanie" |
| `src/App.tsx` | Nowa trasa `/pipeline` |
| `src/components/renewal/AddPolicyModal.tsx` | Auto-obliczanie daty końcowej +1 rok |
| `src/components/renewal/types.ts` | Dodanie pola `is_our_policy` |

---

## Zmiany w Bazie Danych

### Migracja: Rozszerzenie tabeli `insurance_policies`

```sql
-- Dodaj pole do rozróżnienia "naszych" polis od "obcych"
ALTER TABLE public.insurance_policies
ADD COLUMN is_our_policy BOOLEAN DEFAULT false;

-- Dodaj pole workflow status dla lejka
ALTER TABLE public.insurance_policies
ADD COLUMN workflow_status TEXT DEFAULT 'backlog' 
CHECK (workflow_status IN ('backlog', 'preparation', 'finalization', 'completed', 'lost'));

-- Dodaj datę przejęcia do finalizacji
ALTER TABLE public.insurance_policies
ADD COLUMN moved_to_finalization_at TIMESTAMPTZ;

-- Dodaj datę zamknięcia
ALTER TABLE public.insurance_policies
ADD COLUMN closed_at TIMESTAMPTZ;

-- Indeks dla szybkich raportów
CREATE INDEX idx_insurance_policies_workflow ON public.insurance_policies(tenant_id, workflow_status, end_date);
CREATE INDEX idx_insurance_policies_our ON public.insurance_policies(tenant_id, is_our_policy);
```

---

## Logika Automatycznych Obliczeń

### 1. Auto-obliczanie dat (AddPolicyModal)

```typescript
// Przy zmianie daty początkowej - auto +1 rok
const handleStartDateChange = (startDate: string) => {
  const start = new Date(startDate);
  const end = addYears(start, 1);
  setFormData(prev => ({
    ...prev,
    start_date: startDate,
    end_date: format(end, 'yyyy-MM-dd'),
  }));
};
```

### 2. Okresy akcji (120 dni przed końcem)

```typescript
// Automatyczne wykrywanie fazy:
const getPolicyPhase = (policy: InsurancePolicy): PolicyPhase => {
  const today = new Date();
  const endDate = new Date(policy.end_date);
  const daysLeft = differenceInDays(endDate, today);
  
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= 30) return 'finalization'; // 30 dni - finalizacja
  if (daysLeft <= 120) return 'preparation'; // 90 dni + 30 = 120 dni - przygotowanie
  return 'active'; // Normalne pokrycie
};
```

---

## Layout UI

### Główny widok Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  OFERTOWANIE                                                  [Filtry] [Export] │
├─────────────────────────────────────────────────────────────────────────────────┤
│  [Dashboard]  [Timeline]  [Raporty Finansowe]                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │  KPI CARDS                                                                │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │ │
│  │  │ Do zrobienia │ │ Przygotowanie│ │ Finalizacja  │ │ Nasze polisy │     │ │
│  │  │     23       │ │      8       │ │      3       │ │     45       │     │ │
│  │  │ +5 vs m-1    │ │ W tym m-cu   │ │ Pilne!       │ │ 2.4M PLN     │     │ │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘     │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  ┌────────────────────────────────┐ ┌────────────────────────────────────────┐ │
│  │  TIMELINE (lewy panel)         │ │  LEJEK SPRZEDAŻOWY                     │ │
│  │                                │ │                                        │ │
│  │  STY  LUT  MAR  KWI  MAJ  CZE │ │  ┌────────────────────────────────┐   │ │
│  │  ─────────────────────────────│ │  │ BACKLOG (Do zrobienia) - 23    │   │ │
│  │  Majątek:    ▓▓▓▓ (3)         │ │  │ ┌──────────────────────────┐   │   │ │
│  │  Flota:      ▓▓ (2)           │ │  │ │ ABC Corp - Majątek       │   │   │ │
│  │  OC:         ▓▓▓▓▓ (5)        │ │  │ │ wygasa: 15.03.2026       │   │   │ │
│  │  D&O:        ▓▓ (2)           │ │  │ └──────────────────────────┘   │   │ │
│  │  Cyber:      ▓ (1)            │ │  └────────────────────────────────┘   │ │
│  │                                │ │                                        │ │
│  │  Podsumowanie wg miesiąca:    │ │  ┌────────────────────────────────┐   │ │
│  │  • Luty: 4 polisy (320k PLN)  │ │  │ PRZYGOTOWANIE - 8              │   │ │
│  │  • Marzec: 6 polis (540k PLN) │ │  │ ☑ Aktualizacja danych          │   │ │
│  │  • Kwiecień: 3 polisy         │ │  │ ☐ Przetarg rynkowy             │   │ │
│  │                                │ │  └────────────────────────────────┘   │ │
│  │                                │ │                                        │ │
│  │                                │ │  ┌────────────────────────────────┐   │ │
│  │                                │ │  │ FINALIZACJA - 3        🔴      │   │ │
│  │                                │ │  │ ☑ Negocjacje zakończone        │   │ │
│  │                                │ │  │ ☐ Zgoda Zarządu                │   │ │
│  │                                │ │  └────────────────────────────────┘   │ │
│  └────────────────────────────────┘ └────────────────────────────────────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Zakładka "Raporty Finansowe"

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  RAPORTY FINANSOWE                                            [2026 ▼] [Export]│
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │  NASZE POLISY (is_our_policy = true)                                      │ │
│  │  ┌──────────────────────────────────────────────────────────────────────┐│ │
│  │  │ Cel roczny: 5 000 000 PLN składki                      [Ustaw cel]  ││ │
│  │  │ ═══════════════════════════════════════════════░░░░░░░░░░░░░░░░░░░░ ││ │
│  │  │ Realizacja: 2 400 000 PLN (48%)                                     ││ │
│  │  └──────────────────────────────────────────────────────────────────────┘│ │
│  │                                                                           │ │
│  │  Sprzedaż wg typu polisy:                                                │ │
│  │  ┌────────────────┬──────────────┬─────────────┬───────────────────────┐ │ │
│  │  │ Typ            │ Liczba polis │ Składka PLN │ % portfela            │ │ │
│  │  ├────────────────┼──────────────┼─────────────┼───────────────────────┤ │ │
│  │  │ Majątek        │ 12           │ 1 200 000   │ ▓▓▓▓▓▓▓▓░░ 50%       │ │ │
│  │  │ Flota          │ 8            │ 600 000     │ ▓▓▓▓▓░░░░░ 25%       │ │ │
│  │  │ OC             │ 15           │ 400 000     │ ▓▓▓░░░░░░░ 17%       │ │ │
│  │  │ Inne           │ 10           │ 200 000     │ ▓░░░░░░░░░ 8%        │ │ │
│  │  └────────────────┴──────────────┴─────────────┴───────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │  OBCE POLISY (potencjał do przejęcia)                                    │ │
│  │                                                                           │ │
│  │  Łączna składka obcych polis: 8 500 000 PLN                              │ │
│  │  Liczba klientów z obcymi polisami: 34                                   │ │
│  │                                                                           │ │
│  │  Polisy wygasające w najbliższych 120 dniach:                            │ │
│  │  ┌────────────────────────────────────────────────────────────────────┐  │ │
│  │  │ Firma              │ Typ      │ Składka   │ Wygasa    │ Dni │ Akcja│  │ │
│  │  ├────────────────────┼──────────┼───────────┼───────────┼─────┼──────┤  │ │
│  │  │ XYZ Manufacturing  │ Majątek  │ 450 000   │ 28.02.26  │ 28  │ [📋]│  │ │
│  │  │ ABC Logistics      │ Flota    │ 120 000   │ 15.03.26  │ 43  │ [📋]│  │ │
│  │  └────────────────────┴──────────┴───────────┴───────────┴─────┴──────┘  │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Struktura Komponentów

### 1. Hook: useAllPolicies

```typescript
export function useAllPolicies() {
  const { director } = useAuth();
  const tenantId = director?.tenant_id;

  const { data: policies, isLoading } = useQuery({
    queryKey: ['all-policies', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurance_policies')
        .select(`
          *,
          company:companies(id, name, short_name, logo_url)
        `)
        .eq('tenant_id', tenantId)
        .order('end_date', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Computed stats
  const stats = useMemo(() => {
    if (!policies) return null;
    
    const today = new Date();
    
    // Grupowanie wg fazy
    const backlog: PolicyWithCompany[] = [];
    const preparation: PolicyWithCompany[] = [];
    const finalization: PolicyWithCompany[] = [];
    
    policies.forEach(p => {
      const daysLeft = differenceInDays(new Date(p.end_date), today);
      if (daysLeft <= 30) finalization.push(p);
      else if (daysLeft <= 120) preparation.push(p);
      else backlog.push(p);
    });
    
    // Nasze vs obce
    const ourPolicies = policies.filter(p => p.is_our_policy);
    const foreignPolicies = policies.filter(p => !p.is_our_policy);
    
    // Składki
    const ourPremium = ourPolicies.reduce((sum, p) => sum + (p.premium || 0), 0);
    const foreignPremium = foreignPolicies.reduce((sum, p) => sum + (p.premium || 0), 0);
    
    return {
      backlog,
      preparation,
      finalization,
      ourPolicies,
      foreignPolicies,
      ourPremium,
      foreignPremium,
      byType: groupByType(policies),
      byMonth: groupByExpiryMonth(policies),
    };
  }, [policies]);

  return { policies, stats, isLoading, ... };
}
```

### 2. PolicyTimelineView (lewy panel)

```typescript
interface PolicyTimelineViewProps {
  policies: PolicyWithCompany[];
}

export function PolicyTimelineView({ policies }: PolicyTimelineViewProps) {
  // Grupowanie polis wg miesiąca wygaśnięcia
  const byMonth = useMemo(() => {
    const grouped = new Map<string, PolicyWithCompany[]>();
    
    policies.forEach(p => {
      const month = format(new Date(p.end_date), 'yyyy-MM');
      if (!grouped.has(month)) grouped.set(month, []);
      grouped.get(month)!.push(p);
    });
    
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b));
  }, [policies]);

  // Grupowanie wg typu polisy
  const byType = useMemo(() => 
    Object.entries(
      policies.reduce((acc, p) => {
        acc[p.policy_type] = (acc[p.policy_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ),
    [policies]
  );

  return (
    <div className="space-y-4">
      {/* Mini timeline z barami */}
      <div className="space-y-2">
        {byType.map(([type, count]) => (
          <div key={type} className="flex items-center gap-2">
            <span className="w-20 text-sm">{POLICY_TYPE_LABELS[type]}</span>
            <div 
              className="h-6 rounded" 
              style={{ 
                width: `${(count / policies.length) * 100}%`,
                backgroundColor: POLICY_TYPE_COLORS[type]
              }}
            />
            <span className="text-sm text-muted-foreground">({count})</span>
          </div>
        ))}
      </div>
      
      {/* Lista wg miesięcy */}
      <div className="space-y-3">
        {byMonth.map(([month, monthPolicies]) => (
          <Card key={month}>
            <CardHeader className="py-2">
              <CardTitle className="text-sm">
                {format(new Date(month), 'LLLL yyyy', { locale: pl })}
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <p className="text-lg font-bold">
                {monthPolicies.length} polis
              </p>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(monthPolicies.reduce((s, p) => s + (p.premium || 0), 0))} PLN
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

### 3. PolicyFunnelView (lejek)

```typescript
export function PolicyFunnelView({ stats }: { stats: PipelineStats }) {
  const stages = [
    { 
      id: 'backlog', 
      label: 'Do zrobienia', 
      count: stats.backlog.length,
      color: 'bg-slate-100',
      icon: Clock,
    },
    { 
      id: 'preparation', 
      label: 'Przygotowanie (90 dni)', 
      count: stats.preparation.length,
      color: 'bg-emerald-50',
      icon: FileEdit,
    },
    { 
      id: 'finalization', 
      label: 'Finalizacja (30 dni)', 
      count: stats.finalization.length,
      color: 'bg-red-50',
      icon: AlertTriangle,
      urgent: true,
    },
  ];

  return (
    <div className="space-y-4">
      {stages.map(stage => (
        <Card key={stage.id} className={stage.color}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <stage.icon className="h-4 w-4" />
                {stage.label}
              </CardTitle>
              <Badge variant={stage.urgent ? 'destructive' : 'secondary'}>
                {stage.count}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              {stats[stage.id].map(policy => (
                <PolicyFunnelCard 
                  key={policy.id} 
                  policy={policy}
                  showChecklist={stage.id !== 'backlog'}
                />
              ))}
            </ScrollArea>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

---

## Logika Biznesowa

### Workflow Status Transitions

```typescript
// Automatyczna aktualizacja statusu workflow na podstawie daty
async function updatePolicyWorkflowStatus(policyId: string) {
  const { data: policy } = await supabase
    .from('insurance_policies')
    .select('end_date, workflow_status')
    .eq('id', policyId)
    .single();
    
  const daysLeft = differenceInDays(new Date(policy.end_date), new Date());
  let newStatus = policy.workflow_status;
  
  // Auto-promote based on time
  if (daysLeft <= 30 && policy.workflow_status === 'preparation') {
    newStatus = 'finalization';
  } else if (daysLeft <= 120 && policy.workflow_status === 'backlog') {
    newStatus = 'preparation';
  }
  
  if (newStatus !== policy.workflow_status) {
    await supabase
      .from('insurance_policies')
      .update({ 
        workflow_status: newStatus,
        ...(newStatus === 'finalization' ? { moved_to_finalization_at: new Date() } : {})
      })
      .eq('id', policyId);
  }
}
```

### Oznaczanie "Naszej Polisy"

```typescript
// W PolicyCard lub w modalu edycji
const toggleOurPolicy = useMutation({
  mutationFn: async ({ policyId, isOurs }: { policyId: string; isOurs: boolean }) => {
    const { error } = await supabase
      .from('insurance_policies')
      .update({ is_our_policy: isOurs })
      .eq('id', policyId);
    
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['all-policies'] });
    toast.success(isOurs ? 'Oznaczono jako nasza polisa' : 'Oznaczono jako obca polisa');
  },
});
```

---

## Modyfikacja AddPolicyModal

### Auto-obliczanie daty końcowej

```typescript
// W handleStartDateChange:
const handleStartDateChange = (startDate: string) => {
  const start = new Date(startDate);
  const end = addYears(start, 1);
  
  setFormData(prev => ({
    ...prev,
    start_date: startDate,
    end_date: format(end, 'yyyy-MM-dd'),
  }));
};

// Dodaj checkbox "Nasza polisa" w formularzu:
<div className="flex items-center space-x-2">
  <Checkbox 
    id="is_our_policy"
    checked={formData.is_our_policy}
    onCheckedChange={(checked) => 
      setFormData(prev => ({ ...prev, is_our_policy: !!checked }))
    }
  />
  <Label htmlFor="is_our_policy" className="text-sm font-medium">
    Nasza polisa (obsługujemy jako broker)
  </Label>
</div>
```

---

## Nawigacja

### Dodanie do AppSidebar

```typescript
// W mainNavigationItems:
{ title: 'Ofertowanie', url: '/pipeline', icon: Briefcase },
```

### Nowa trasa w App.tsx

```typescript
<Route path="/pipeline" element={<DirectorGuard><PolicyPipeline /></DirectorGuard>} />
```

---

## Podsumowanie Plików

| Plik | Typ | Opis |
|------|-----|------|
| **Baza danych** |
| Migracja SQL | NOWY | Kolumny `is_our_policy`, `workflow_status` |
| **Strony** |
| `src/pages/PolicyPipeline.tsx` | NOWY | Główna strona modułu |
| **Komponenty** |
| `src/components/pipeline/PolicyPipelineDashboard.tsx` | NOWY | Dashboard z zakładkami |
| `src/components/pipeline/PolicyTimelineView.tsx` | NOWY | Lewy panel - timeline |
| `src/components/pipeline/PolicyFunnelView.tsx` | NOWY | Lejek sprzedażowy |
| `src/components/pipeline/PolicyFinancialReports.tsx` | NOWY | Raporty finansowe |
| `src/components/pipeline/PolicyKPICards.tsx` | NOWY | Karty KPI |
| `src/components/pipeline/OurPoliciesReport.tsx` | NOWY | Raport naszych polis |
| `src/components/pipeline/PolicyFunnelCard.tsx` | NOWY | Karta polisy w lejku |
| `src/components/pipeline/index.ts` | NOWY | Eksporty |
| **Hooks** |
| `src/hooks/useAllPolicies.ts` | NOWY | Pobieranie wszystkich polis |
| **Modyfikacje** |
| `src/components/renewal/AddPolicyModal.tsx` | MOD | Auto +1 rok, checkbox "nasza polisa" |
| `src/components/renewal/types.ts` | MOD | Nowe pola w interfejsie |
| `src/components/layout/AppSidebar.tsx` | MOD | Link do /pipeline |
| `src/App.tsx` | MOD | Nowa trasa |

---

## Przepływ Użytkownika

1. **Dodawanie polisy** → Użytkownik wybiera datę początkową, system automatycznie ustawia koniec +1 rok
2. **Polisy trafiają do lejka** → System automatycznie przypisuje fazę na podstawie dni do wygaśnięcia
3. **Backlog (>120 dni)** → Polisy daleko od wygaśnięcia - tylko monitoring
4. **Przygotowanie (30-120 dni)** → 90 dni na audyt, zebranie danych, przetarg
5. **Finalizacja (<30 dni)** → Ostatnie negocjacje, zgoda zarządu
6. **Oznaczenie "nasza polisa"** → Polisa trafia do osobnego raportu sprzedaży
7. **Raporty finansowe** → Agregacja składek, cele roczne, porównanie nasze/obce

---

## Kluczowe Funkcjonalności

### Timeline (lewy panel):
- Wizualizacja wszystkich polis na osi czasu
- Grupowanie wg typu polisy (kolorowe bary)
- Podsumowanie wg miesiąca wygaśnięcia
- Szybki podgląd ile polis i jaka składka w danym okresie

### Lejek sprzedażowy:
- 3 etapy: Backlog → Przygotowanie → Finalizacja
- Karty polis z checklistą (te same 4 punkty co w harmonogramie)
- Alerty dla polis krytycznych
- Możliwość ręcznego przesuwania między etapami

### Raporty finansowe:
- **Nasze polisy**: Cel roczny, realizacja, sprzedaż wg typu
- **Obce polisy**: Potencjał do przejęcia, lista wygasających
- Eksport do PDF/Excel

