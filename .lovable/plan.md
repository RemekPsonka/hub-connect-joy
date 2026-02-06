
# Plan: Utworzenie tabeli Deals (Pipeline Sprzedażowy)

## Cel
Dodanie systemu zarządzania szansami sprzedaży (deals) z etapami pipeline'u, śledzeniem wartości i powiązaniem z kontaktami/firmami.

---

## Krok 1: Utworzenie tabeli `deal_stages`

Najpierw potrzebujemy tabeli z etapami pipeline'u, do której odwołuje się `deals.stage_id`.

```sql
CREATE TABLE public.deal_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#6366f1',
  is_closed_won BOOLEAN DEFAULT false,
  is_closed_lost BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

CREATE INDEX idx_deal_stages_tenant ON deal_stages(tenant_id);
CREATE INDEX idx_deal_stages_position ON deal_stages(tenant_id, position);
```

---

## Krok 2: Utworzenie tabeli `deals`

Główna tabela przechowująca szanse sprzedaży zgodnie ze schematem podanym przez użytkownika:

```sql
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  
  title TEXT NOT NULL,
  description TEXT,
  value DECIMAL(15, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'PLN',
  
  stage_id UUID NOT NULL REFERENCES public.deal_stages(id),
  probability INTEGER NOT NULL DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  
  owner_id UUID REFERENCES public.directors(id),
  source TEXT, -- 'inbound', 'outbound', 'referral', 'partner'
  
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'won', 'lost'
  won_at TIMESTAMPTZ,
  lost_reason TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT deals_contact_or_company_required 
    CHECK (contact_id IS NOT NULL OR company_id IS NOT NULL)
);
```

**Indeksy dla wydajności:**
```sql
CREATE INDEX idx_deals_tenant ON deals(tenant_id);
CREATE INDEX idx_deals_stage ON deals(stage_id);
CREATE INDEX idx_deals_contact ON deals(contact_id);
CREATE INDEX idx_deals_company ON deals(company_id);
CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_deals_owner ON deals(owner_id);
CREATE INDEX idx_deals_expected_close ON deals(expected_close_date);
```

---

## Krok 3: Opcjonalna tabela `deal_activities`

Śledzenie historii zmian i notatek do deali:

```sql
CREATE TABLE public.deal_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'note', 'stage_change', 'value_change', 'call', 'email', 'meeting'
  description TEXT,
  old_value TEXT,
  new_value TEXT,
  created_by UUID REFERENCES public.directors(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deal_activities_deal ON deal_activities(deal_id);
CREATE INDEX idx_deal_activities_created_at ON deal_activities(created_at);
```

---

## Krok 4: RLS (Row Level Security)

Zabezpieczenie dostępu do danych zgodnie z wzorcem multi-tenant:

```sql
ALTER TABLE public.deal_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_activities ENABLE ROW LEVEL SECURITY;

-- Deal stages - dostęp tylko dla swojego tenanta
CREATE POLICY "tenant_access" ON public.deal_stages
  FOR ALL USING (tenant_id = public.get_current_tenant_id());

-- Deals - dostęp tylko dla swojego tenanta
CREATE POLICY "tenant_access" ON public.deals
  FOR ALL USING (tenant_id = public.get_current_tenant_id());

-- Deal activities - przez relację do deals
CREATE POLICY "tenant_access" ON public.deal_activities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.deals d 
      WHERE d.id = deal_id 
      AND d.tenant_id = public.get_current_tenant_id()
    )
  );
```

---

## Krok 5: Trigger dla `updated_at`

Automatyczna aktualizacja znacznika czasu:

```sql
CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

---

## Krok 6: Domyślne etapy pipeline'u

Funkcja do tworzenia standardowych etapów dla nowego tenanta:

```sql
-- Wstawienie domyślnych etapów (można uruchomić ręcznie lub przez trigger)
-- Przykład dla istniejącego tenanta:
INSERT INTO public.deal_stages (tenant_id, name, position, color, is_closed_won, is_closed_lost) VALUES
  ('<tenant_id>', 'Lead', 0, '#94a3b8', false, false),
  ('<tenant_id>', 'Kwalifikacja', 1, '#3b82f6', false, false),
  ('<tenant_id>', 'Propozycja', 2, '#8b5cf6', false, false),
  ('<tenant_id>', 'Negocjacje', 3, '#f59e0b', false, false),
  ('<tenant_id>', 'Zamknięty - Wygrany', 4, '#22c55e', true, false),
  ('<tenant_id>', 'Zamknięty - Przegrany', 5, '#ef4444', false, true);
```

---

## Pliki do utworzenia/modyfikacji

| Plik | Akcja |
|------|-------|
| `supabase/migrations/..._create_deals.sql` | **Migracja** - schemat bazy |

---

## Podsumowanie struktury

```text
deal_stages                    deals                         deal_activities
┌──────────────────┐          ┌──────────────────────┐       ┌────────────────────┐
│ id (PK)          │          │ id (PK)              │       │ id (PK)            │
│ tenant_id (FK)   │◄─────────│ stage_id (FK)        │◄──────│ deal_id (FK)       │
│ name             │          │ tenant_id (FK)       │       │ activity_type      │
│ position         │          │ contact_id (FK)  ────┼──► contacts│ description      │
│ color            │          │ company_id (FK)  ────┼──► companies│ old_value        │
│ is_closed_won    │          │ owner_id (FK)    ────┼──► directors│ new_value        │
│ is_closed_lost   │          │ title, value, status │       │ created_by (FK)    │
└──────────────────┘          └──────────────────────┘       └────────────────────┘
```

Po zatwierdzeniu utworzę migrację z kompletnym schematem.
