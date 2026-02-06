

# Plan: Rozszerzenie polityk RLS dla tabel Deals

## Cel
Zastąpienie generycznych polityk `FOR ALL` bardziej granularnymi politykami opartymi na rolach, zapewniającymi:
- Izolację danych między tenantami
- Kontrolę operacji INSERT/UPDATE/DELETE tylko dla uprawnionych użytkowników

---

## Analiza obecnego stanu

### Istniejące polityki (zbyt permisywne)

| Tabela | Obecna polityka | Problem |
|--------|-----------------|---------|
| `deals` | `FOR ALL USING (tenant_id = get_current_tenant_id())` | Każdy użytkownik tenanta może wszystko |
| `deal_stages` | `FOR ALL USING (tenant_id = get_current_tenant_id())` | Każdy użytkownik może zmieniać etapy |
| `deal_products` | `FOR ALL USING/WITH CHECK (przez deals)` | Brak kontroli ról |
| `deal_activities` | `FOR ALL USING (przez deals)` | Brak kontroli zapisu |

### Dostępne funkcje pomocnicze

```sql
-- Pobiera tenant_id aktualnego użytkownika
public.get_current_tenant_id() → UUID

-- Sprawdza czy user ma konkretną rolę w tenancie
public.has_role(_user_id UUID, _tenant_id UUID, _role app_role) → BOOLEAN

-- Sprawdza czy user jest adminem (owner/admin)
public.is_tenant_admin(_user_id UUID, _tenant_id UUID) → BOOLEAN
```

Typy ról w `app_role`: `owner`, `admin`, `director`, `viewer`

---

## Krok 1: Migracja - usunięcie starych i dodanie nowych polityk

### 1.1 Tabela `deals`

```sql
-- Usunięcie starej polityki
DROP POLICY IF EXISTS "tenant_access" ON public.deals;

-- SELECT - wszyscy w tenancie mogą widzieć
CREATE POLICY "deals_select" ON public.deals
  FOR SELECT
  USING (tenant_id = public.get_current_tenant_id());

-- INSERT - tylko użytkownicy z rolą (owner/admin/director)
CREATE POLICY "deals_insert" ON public.deals
  FOR INSERT
  WITH CHECK (
    tenant_id = public.get_current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.directors 
      WHERE user_id = auth.uid() 
      AND tenant_id = public.get_current_tenant_id()
    )
  );

-- UPDATE - tylko użytkownicy z rolą
CREATE POLICY "deals_update" ON public.deals
  FOR UPDATE
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (
    tenant_id = public.get_current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.directors 
      WHERE user_id = auth.uid()
    )
  );

-- DELETE - tylko admini
CREATE POLICY "deals_delete" ON public.deals
  FOR DELETE
  USING (
    tenant_id = public.get_current_tenant_id()
    AND public.is_tenant_admin(auth.uid(), tenant_id)
  );
```

### 1.2 Tabela `deal_stages`

```sql
DROP POLICY IF EXISTS "tenant_access" ON public.deal_stages;

-- SELECT - wszyscy w tenancie
CREATE POLICY "deal_stages_select" ON public.deal_stages
  FOR SELECT
  USING (tenant_id = public.get_current_tenant_id());

-- INSERT/UPDATE/DELETE - tylko admini (konfiguracja pipeline)
CREATE POLICY "deal_stages_modify" ON public.deal_stages
  FOR ALL
  USING (
    tenant_id = public.get_current_tenant_id()
    AND public.is_tenant_admin(auth.uid(), tenant_id)
  )
  WITH CHECK (
    tenant_id = public.get_current_tenant_id()
    AND public.is_tenant_admin(auth.uid(), tenant_id)
  );
```

### 1.3 Tabela `deal_products`

```sql
DROP POLICY IF EXISTS "tenant_access" ON public.deal_products;

-- SELECT - przez relację do deals
CREATE POLICY "deal_products_select" ON public.deal_products
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.deals d 
      WHERE d.id = deal_id 
      AND d.tenant_id = public.get_current_tenant_id()
    )
  );

-- INSERT/UPDATE/DELETE - przez relację + sprawdzenie roli
CREATE POLICY "deal_products_modify" ON public.deal_products
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.deals d 
      WHERE d.id = deal_id 
      AND d.tenant_id = public.get_current_tenant_id()
    )
    AND EXISTS (
      SELECT 1 FROM public.directors 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.deals d 
      WHERE d.id = deal_id 
      AND d.tenant_id = public.get_current_tenant_id()
    )
  );
```

### 1.4 Tabela `deal_activities`

```sql
DROP POLICY IF EXISTS "tenant_access" ON public.deal_activities;

-- SELECT - przez relację do deals
CREATE POLICY "deal_activities_select" ON public.deal_activities
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.deals d 
      WHERE d.id = deal_id 
      AND d.tenant_id = public.get_current_tenant_id()
    )
  );

-- INSERT - dyrektorzy mogą dodawać aktywności
CREATE POLICY "deal_activities_insert" ON public.deal_activities
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.deals d 
      WHERE d.id = deal_id 
      AND d.tenant_id = public.get_current_tenant_id()
    )
    AND EXISTS (
      SELECT 1 FROM public.directors 
      WHERE user_id = auth.uid()
    )
  );

-- UPDATE/DELETE - tylko admini lub autor
CREATE POLICY "deal_activities_modify" ON public.deal_activities
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.deals d 
      WHERE d.id = deal_id 
      AND d.tenant_id = public.get_current_tenant_id()
    )
    AND (
      created_by = (SELECT id FROM public.directors WHERE user_id = auth.uid() LIMIT 1)
      OR public.is_tenant_admin(auth.uid(), public.get_current_tenant_id())
    )
  );
```

---

## Podsumowanie zmian

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| `deals` | Tenant | Director | Director | Admin |
| `deal_stages` | Tenant | Admin | Admin | Admin |
| `deal_products` | Tenant (via deal) | Director | Director | Director |
| `deal_activities` | Tenant (via deal) | Director | Autor/Admin | Autor/Admin |

---

## Plik do utworzenia

| Plik | Akcja |
|------|-------|
| `supabase/migrations/[timestamp]_rls_deals_granular.sql` | **Utworzyć** |

---

## Korzyści

- Granularna kontrola dostępu oparta na rolach
- Etapy pipeline mogą być zmieniane tylko przez adminów
- Ochrona przed przypadkowym usunięciem danych przez nieuprawnionych
- Aktywności mogą być edytowane tylko przez autora lub admina

