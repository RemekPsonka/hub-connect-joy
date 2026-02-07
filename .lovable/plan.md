

# Izolacja danych -- faza 2: firmy, dashboard, deals-team, sidebar

## Problem

Po wdrozeniu izolacji kontaktow (director_id + contact_shares) pozostaly luki:

1. **Dashboard** -- Pawel widzi licznik "Kontakty 2088" (caly tenant zamiast swoich)
2. **Firmy** -- Pawel widzi wszystkie 1530 firm (RLS filtruje tylko po tenant_id)
3. **Deals Team** -- "Nieznany kontakt" zamiast ukrycia rekordu
4. **Sidebar** -- Pawel widzi "Siec kontaktow", "Ofertowanie", "Dopasowania" (powinny byc ukryte)

## Zmiany

### 1. RLS na companies -- izolacja przez kontakty

Firma widoczna tylko jesli:
- Uzytkownik jest adminem tenanta, LUB
- Istnieje choc jeden kontakt w tej firmie, do ktorego uzytkownik ma dostep (can_access_contact)

```text
DROP POLICY "Companies tenant access" ON companies;

-- SELECT: admin lub ma dostep do kontaktu w firmie
CREATE POLICY "companies_director_select" ON companies
  FOR SELECT USING (
    tenant_id = get_current_tenant_id()
    AND (
      is_tenant_admin(auth.uid(), tenant_id)
      OR EXISTS (
        SELECT 1 FROM contacts c 
        WHERE c.company_id = companies.id 
        AND can_access_contact(c.id)
      )
    )
  );

-- INSERT/UPDATE/DELETE: admin lub wlasciciel kontaktu w firmie
CREATE POLICY "companies_director_modify" ON companies
  FOR ALL USING (
    tenant_id = get_current_tenant_id()
    AND (
      is_tenant_admin(auth.uid(), tenant_id)
      OR EXISTS (
        SELECT 1 FROM contacts c 
        WHERE c.company_id = companies.id 
        AND c.director_id = get_current_director_id()
      )
    )
  ) WITH CHECK (
    tenant_id = get_current_tenant_id()
  );
```

Efekt: Pawel widzi tylko firmy powiazane z kontaktami, ktore posiada lub ma udostepnione. Udostepnienie kontaktu = udostepnienie firmy automatycznie.

### 2. Dashboard stats -- per director

Przebudowa funkcji `get_dashboard_stats()` aby liczyc dane per dyrektor (nie per tenant). Zamiast MV (ktory jest per tenant), funkcja bedzie liczyc "w locie":

```text
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE(...) AS $$
DECLARE
  v_tenant_id UUID := get_current_tenant_id();
  v_director_id UUID := get_current_director_id();
  v_is_admin BOOLEAN;
BEGIN
  SELECT is_tenant_admin(auth.uid(), v_tenant_id) INTO v_is_admin;
  
  IF v_is_admin THEN
    -- Admin widzi wszystko (jak dotychczas z MV)
    RETURN QUERY SELECT ... FROM mv_dashboard_stats WHERE tenant_id = v_tenant_id;
  ELSE
    -- Dyrektor widzi tylko swoje dane
    RETURN QUERY SELECT
      (SELECT COUNT(*) FROM contacts c WHERE c.tenant_id = v_tenant_id 
       AND c.is_active = true AND can_access_contact(c.id)) AS total_contacts,
      (SELECT COUNT(*) FROM contacts c WHERE c.tenant_id = v_tenant_id 
       AND c.is_active = true AND can_access_contact(c.id)
       AND c.created_at >= NOW() - INTERVAL '30 days') AS new_contacts_30d,
      -- ... analogicznie dla pozostalych metryk
      (SELECT COUNT(*) FROM tasks tk WHERE tk.tenant_id = v_tenant_id 
       AND tk.status = 'pending' 
       AND (tk.owner_id = v_director_id OR tk.assigned_to = v_director_id)) AS pending_tasks,
      -- ... itd
      NOW() AS refreshed_at;
  END IF;
END;
$$;
```

Admin widzi globalne statystyki (szybko z MV). Dyrektor widzi tylko swoje (wolniej, ale poprawnie).

### 3. Deals Team -- ukrycie niedostepnych kontaktow

W hookach `useTeamContacts` (src/hooks/useDealsTeamContacts.ts) dodac filtr po pobraniu kontaktow CRM:

```text
// Linia 64: Po zmapowaniu kontaktow, odfiltruj te bez dostepu
return dealContacts
  .map(dc => ({ ...dc, contact: contactMap.get(dc.contact_id) }))
  .filter(dc => dc.contact !== undefined)  // <-- NOWE: ukryj "Nieznany kontakt"
  as DealTeamContact[];
```

RLS na contacts juz blokuje SELECT -- wiec kontakty bez dostepu nie wracaja z query. Wystarczy odfilrowac rekordy gdzie contact jest undefined/null.

Analogicznie w komponentach HotLeadCard, TopLeadCard, LeadCard -- jesli contact jest null, nie renderuj karty (dodatkowe zabezpieczenie).

### 4. Sidebar -- ukrycie sekcji dla nie-adminow

W `AppSidebar.tsx` przefiltruj elementy menu:

```text
// Zmiana w linii 53-57 (crmItems):
const crmItems = [
  { title: 'Kontakty', url: '/contacts', icon: Users },
  { title: 'Firmy', url: '/contacts?view=companies', icon: Building2 },
  { title: 'Siec kontaktow', url: '/network', icon: Network, adminOnly: true },
];

// Zmiana w linii 68-73 (salesItems):
const salesItems = [
  { title: 'Deals', url: '/deals', icon: TrendingUp },
  { title: 'Zespol Deals', url: '/deals-team', icon: Users2 },
  { title: 'Ofertowanie', url: '/pipeline', icon: Briefcase, adminOnly: true },
  { title: 'Dopasowania', url: '/matches', icon: Handshake, adminOnly: true },
];

// W renderowaniu (linia 214):
{group.items
  .filter(item => !item.adminOnly || isAdmin)
  .map(item => <NavItem key={...} item={item} />)}
```

### 5. Ochrona rout -- redirect dla nie-adminow

W `App.tsx` dodac `AdminGuard` na chronione route:

```text
// Nowy komponent AdminGuard -- sprawdza isAdmin, redirect na /
<Route path="/network" element={<AdminGuard><Network /></AdminGuard>} />
<Route path="/pipeline" element={<AdminGuard><PolicyPipeline /></AdminGuard>} />
<Route path="/matches" element={<AdminGuard><Matches /></AdminGuard>} />
```

To zapobiega dostepowi przez bezposredni URL.

## Kolejnosc wykonania

```text
SQL:
1. Nowa polityka RLS na companies (SELECT + MODIFY)
2. Przebudowa get_dashboard_stats() z logika per director

Frontend:
3. AppSidebar.tsx -- adminOnly filter
4. AdminGuard komponent + App.tsx routes
5. useDealsTeamContacts.ts -- filtr null kontaktow
6. HotLeadCard/TopLeadCard/LeadCard -- guard na null contact
```

## Czego NIE robimy

| Element | Powod |
|---------|-------|
| Zmiana RLS na deals | Deals juz izolowane po owner_id/team_member -- poprawne |
| Zmiana RLS na tasks | Juz zaktualizowane w poprzedniej migracji |
| Nowa tabela | Nie potrzebna -- uzywamy istniejacych mechanizmow |
| Zmiana contact_shares | Dziala poprawnie -- udostepnienie kontaktu = udostepnienie firmy przez can_access_contact |

## Bezpieczenstwo

- Companies RLS przez can_access_contact -- firma widoczna tylko jesli masz dostep do kontaktu w niej
- Dashboard stats -- admin widzi globalnie, dyrektor tylko swoje
- Route guard -- bezposredni URL do /network, /pipeline, /matches przekierowuje nie-adminow
- Sidebar filter -- czysto kosmetyczne, ale wzmocnione route guardem

