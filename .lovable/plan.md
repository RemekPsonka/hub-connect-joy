
# Plan: Grupy współpracy (Deal Teams) z ograniczoną widocznością danych

## ✅ STATUS: ZAIMPLEMENTOWANO

## Podsumowanie dla użytkownika

Zbuduję system "grup współpracy" (Deal Teams), gdzie:
- **Admin definiuje zespoły** - np. "SGU", "Remek-Paweł", "Remek-Darek-Rajmund"
- **Przy tworzeniu deala** - użytkownik wybiera z zespołów, do których należy
- **Widoczność** - widzisz tylko deals przypisane do zespołów, których jesteś członkiem

### Twój przykład - jak to będzie działać

| Zespół | Członkowie | Kto widzi deals tego zespołu |
|--------|------------|------------------------------|
| SGU | Adam, Remek, Paweł | Adam, Remek, Paweł |
| Remek-Paweł | Remek, Paweł | Remek, Paweł |
| Remek-Darek | Remek, Darek | Remek, Darek |
| Remek-Darek-Rajmund | Remek, Darek, Rajmund | Remek, Darek, Rajmund |
| Rajmund-solo | Rajmund | Tylko Rajmund |

**Kluczowe:**
- Adam tworząc deal wybiera: "SGU" lub "Remek-Adam-Paweł" (tylko te widzi)
- Darek tworząc deal wybiera: "Remek-Darek" lub "Remek-Darek-Rajmund" (NIE widzi SGU, Pawła)
- Remek (Admin) widzi WSZYSTKIE deals

### Maskowanie danych kontaktów

Tylko Admin widzi pełne dane kontaktów:
- **Admin**: notatki, BI, KI, agent memory
- **Pozostali**: podstawowe dane + AI summary + dane rejestrowe firmy

---

## Szczegóły techniczne

### Architektura

```text
┌─────────────────────────────────────────────────────────────┐
│                      DEAL TEAMS                             │
├─────────────────────────────────────────────────────────────┤
│  deal_teams (id, name, tenant_id, created_by)               │
│  deal_team_members (team_id, director_id)                   │
│                                                             │
│  Deals mają nowe pole: team_id (zamiast owner_id)           │
│  RLS: widzisz deal jeśli jesteś członkiem tego teamu        │
│  Admin: bypass - widzi wszystko                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Krok 1: Migracja bazy danych

#### 1.1 Nowa tabela: deal_teams

```sql
CREATE TABLE public.deal_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.directors(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

ALTER TABLE public.deal_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_teams_select" ON public.deal_teams 
  FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY "deal_teams_manage" ON public.deal_teams 
  FOR ALL USING (is_tenant_admin(auth.uid(), tenant_id));
```

#### 1.2 Nowa tabela: deal_team_members

```sql
CREATE TABLE public.deal_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.deal_teams(id) ON DELETE CASCADE,
  director_id UUID NOT NULL REFERENCES public.directors(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, director_id)
);

ALTER TABLE public.deal_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_members_select" ON public.deal_team_members 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM deal_teams dt 
      WHERE dt.id = team_id AND dt.tenant_id = get_current_tenant_id()
    )
  );

CREATE POLICY "team_members_manage" ON public.deal_team_members 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM deal_teams dt 
      WHERE dt.id = team_id 
        AND is_tenant_admin(auth.uid(), dt.tenant_id)
    )
  );
```

#### 1.3 Modyfikacja tabeli deals

```sql
-- Dodaj kolumnę team_id
ALTER TABLE public.deals ADD COLUMN team_id UUID REFERENCES public.deal_teams(id);

-- Funkcja pomocnicza: użytkownik jest członkiem zespołu?
CREATE OR REPLACE FUNCTION public.is_deal_team_member(_user_id UUID, _team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM deal_team_members dtm
    INNER JOIN directors d ON d.id = dtm.director_id
    WHERE dtm.team_id = _team_id
      AND d.user_id = _user_id
  )
$$;

-- Nowa polityka RLS dla deals
DROP POLICY IF EXISTS "deals_select" ON public.deals;

CREATE POLICY "deals_select" ON public.deals FOR SELECT
USING (
  tenant_id = get_current_tenant_id()
  AND (
    -- Admin widzi wszystko
    is_tenant_admin(auth.uid(), tenant_id)
    OR
    -- Deals bez team_id - widzi owner
    (team_id IS NULL AND owner_id = (
      SELECT id FROM directors WHERE user_id = auth.uid() LIMIT 1
    ))
    OR
    -- Deals z team_id - widzi członek zespołu
    (team_id IS NOT NULL AND is_deal_team_member(auth.uid(), team_id))
  )
);
```

#### 1.4 Maskowanie danych kontaktów (RLS)

```sql
-- Business interviews - tylko admin
DROP POLICY IF EXISTS "business_interviews_select" ON public.business_interviews;
CREATE POLICY "business_interviews_select" ON public.business_interviews 
  FOR SELECT USING (
    tenant_id = get_current_tenant_id()
    AND is_tenant_admin(auth.uid(), tenant_id)
  );

-- Contact agent memory - tylko admin
DROP POLICY IF EXISTS "contact_agent_memory_select" ON public.contact_agent_memory;
CREATE POLICY "contact_agent_memory_select" ON public.contact_agent_memory 
  FOR SELECT USING (
    tenant_id = get_current_tenant_id()
    AND is_tenant_admin(auth.uid(), tenant_id)
  );
```

---

### Krok 2: Panel Admin - Zarządzanie zespołami

#### 2.1 Nowa zakładka w Owner.tsx

Dodanie zakładki "Zespoły deals" z funkcjonalnością:
- Lista wszystkich zespołów
- Tworzenie nowego zespołu (nazwa, kolor)
- Edycja członków zespołu (multi-select z listy użytkowników)
- Usuwanie zespołu

#### 2.2 Nowy hook: useDealTeams

```typescript
// src/hooks/useDealTeams.ts
export interface DealTeam {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  members: Array<{ director_id: string; director: { full_name: string } }>;
}

export function useDealTeams() {
  // SELECT deal_teams + deal_team_members + directors
}

export function useCreateDealTeam() {
  // INSERT deal_teams + deal_team_members
}

export function useUpdateDealTeam() {
  // UPDATE deal_teams + UPSERT deal_team_members
}

export function useDeleteDealTeam() {
  // DELETE deal_teams (cascade usunie members)
}

export function useMyDealTeams() {
  // Zespoły, których jestem członkiem (dla CreateDealModal)
}
```

#### 2.3 Nowy komponent: DealTeamsManager

```typescript
// src/components/owner/DealTeamsManager.tsx
- Tabela z listą zespołów
- Kolumny: Nazwa, Kolor, Członkowie, Akcje
- Modal tworzenia/edycji z multi-select użytkowników
```

---

### Krok 3: Modyfikacja CreateDealModal

#### 3.1 Dodanie wyboru zespołu

Nowe pole w formularzu:
- Label: "Zespół współpracy"
- Select z dostępnymi zespołami (tylko te, których user jest członkiem)
- Dla Admina: wszystkie zespoły + opcja "Bez zespołu (tylko ja)"

```typescript
// W CreateDealModal.tsx
const { data: myTeams } = useMyDealTeams();
const { isAdmin } = useOwnerPanel();

// W formSchema:
team_id: z.string().optional(), // wymagane dla nie-adminów

// W onSubmit:
team_id: values.team_id || null,
```

---

### Krok 4: Frontend - Maskowanie danych kontaktów

#### 4.1 Modyfikacja useContact hook

Warunkowe pobieranie danych w zależności od roli:

```typescript
// src/hooks/useContacts.ts
export function useContact(id: string) {
  const { isAdmin } = useOwnerPanel();
  
  return useQuery({
    queryKey: ['contact', id, isAdmin],
    queryFn: async () => {
      const baseSelect = `
        id, full_name, company, position, phone, email,
        profile_summary, company:companies(*), ...
      `;
      
      const adminSelect = `
        ${baseSelect},
        notes,
        business_interviews(*),
        contact_agent_memory(*)
      `;
      
      const { data } = await supabase
        .from('contacts')
        .select(isAdmin ? adminSelect : baseSelect)
        .eq('id', id)
        .single();
      
      return data;
    },
  });
}
```

#### 4.2 Modyfikacja ContactDetail.tsx

Ukrycie zakładek dla nie-adminów:

```typescript
// W ContactDetail.tsx
const { isAdmin } = useOwnerPanel();

<Tabs>
  <TabsList>
    <TabsTrigger value="profile">Profil</TabsTrigger>
    <TabsTrigger value="company">Firma</TabsTrigger>
    {isAdmin && <TabsTrigger value="notes">Notatki</TabsTrigger>}
    {isAdmin && <TabsTrigger value="bi">BI</TabsTrigger>}
    {isAdmin && <TabsTrigger value="ki">KI</TabsTrigger>}
  </TabsList>
</Tabs>
```

---

## Pliki do modyfikacji

| Plik | Akcja |
|------|-------|
| **Migracja SQL** | CREATE TABLE deal_teams, deal_team_members, ALTER deals, funkcje, RLS |
| `src/hooks/useDealTeams.ts` | **NOWY** - CRUD dla zespołów |
| `src/hooks/useDeals.ts` | Dodać team_id do Deal interface i createDeal |
| `src/hooks/useContacts.ts` | Warunkowe pobieranie wrażliwych danych |
| `src/hooks/useOwnerPanel.ts` | Export isAdmin (już jest) |
| `src/pages/Owner.tsx` | Dodać zakładkę "Zespoły" |
| `src/components/owner/DealTeamsManager.tsx` | **NOWY** - zarządzanie zespołami |
| `src/components/owner/DealTeamModal.tsx` | **NOWY** - modal tworzenia/edycji |
| `src/components/deals/CreateDealModal.tsx` | Dodać wybór zespołu |
| `src/pages/ContactDetail.tsx` | Ukrycie zakładek BI/KI/Notatki |

---

## Przykład konfiguracji zespołów

Po wdrożeniu, w panelu Zarządzanie → Zespoły dodasz:

| Zespół | Członkowie |
|--------|------------|
| SGU | Adam, Remek, Paweł |
| Remek-Paweł | Remek, Paweł |
| Remek-Darek | Remek, Darek |
| Remek-Darek-Rajmund | Remek, Darek, Rajmund |
| Rajmund-solo | Rajmund |

**Co widzi każda osoba:**

- **Remek (Admin)**: WSZYSTKIE deals (bypass RLS)
- **Adam**: deals zespołu "SGU" (wspólne z Remkiem i Pawłem)
- **Paweł**: deals "SGU" + deals "Remek-Paweł"
- **Darek**: deals "Remek-Darek" + deals "Remek-Darek-Rajmund"
- **Rajmund**: deals "Remek-Darek-Rajmund" + deals "Rajmund-solo"

---

## Korzyści rozwiązania

1. **Pełna elastyczność** - Admin tworzy dowolne kombinacje zespołów
2. **Bezpieczeństwo RLS** - filtrowanie na poziomie bazy danych
3. **Jeden tenant** - nie trzeba komplikować z cross-tenant sharing
4. **Skalowalne** - łatwo dodać nowych użytkowników i zespoły
5. **Maskowanie danych** - wrażliwe informacje chronione na poziomie RLS + UI

---

## Alternatywa: Osobne tenanty

Rozwiązanie z osobnymi tenantami dla Darka i Rajmunda byłoby prostsze koncepcyjnie, ale:
- Wymagałoby cross-tenant sharing kontaktów (skomplikowane RLS)
- Duplikacja danych kontaktów między tenantami
- Trudniejsze zarządzanie

**Rekomendacja**: Zostań przy jednym tenant z systemem zespołów.
