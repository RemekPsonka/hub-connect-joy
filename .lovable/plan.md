

## Plan: Moduł Wizualizacji Struktury Korporacyjnej

### Cel
Stworzenie interaktywnego modułu wizualizacji struktury holdingowej opartego na **React Flow** (@xyflow/react), służącego brokerom ubezpieczeniowym do audytu pokrycia ubezpieczeniowego wszystkich podmiotów w grupie kapitałowej.

---

## Architektura

### Nowa zależność

```json
"@xyflow/react": "^12.3.0",
"@dagrejs/dagre": "^1.1.4"
```

React Flow został wybrany zamiast rozszerzania istniejącego Sigma.js, ponieważ:
- Lepsze wsparcie dla niestandardowych węzłów (karty z danymi)
- Wbudowane funkcje drag & drop
- Łatwiejsza integracja z panelem właściwości
- Algorytm dagre dla hierarchicznego układu (spółka matka → zależne)

---

### Nowe pliki do utworzenia

| Plik | Cel |
|------|-----|
| `src/components/structure/StructureVisualization.tsx` | Główny komponent z pełnoekranowym canvas |
| `src/components/structure/StructureCanvas.tsx` | React Flow container z logiką grafu |
| `src/components/structure/nodes/ParentCompanyNode.tsx` | Węzeł spółki matki (Crown icon) |
| `src/components/structure/nodes/SubsidiaryNode.tsx` | Węzeł spółki zależnej |
| `src/components/structure/nodes/AssetLocationNode.tsx` | Węzeł aktywa/lokalizacji |
| `src/components/structure/PropertiesSidebar.tsx` | Panel boczny z właściwościami węzła |
| `src/components/structure/StructureToolbar.tsx` | Pasek narzędzi (Auto-Layout, Coverage Overlay) |
| `src/components/structure/hooks/useStructureLayout.ts` | Hook do automatycznego układu dagre |
| `src/components/structure/types.ts` | Typy dla węzłów i krawędzi |

### Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/company/CompanyFlatTabs.tsx` | Dodanie zakładki "Struktura" z ikoną Network |
| `package.json` | Dodanie zależności @xyflow/react i @dagrejs/dagre |

---

## Layout interfejsu

### Układ główny (Pełnoekranowy)

```text
+-----------------------------------------------------------------------------------+
|  [Toolbar]                                                                         |
|  +Auto-Layout+  +Pokrycie polisą: [Toggle]+  +Zoom In/Out+  +Eksportuj PNG+       |
+-----------------------------------------------------------------------------------+
|                                                                                    |
|                        CANVAS (Drag & Drop)                                        |
|                                                                                    |
|                           +--------------------+                                   |
|                           |  👑 SPÓŁKA MATKA   |                                   |
|                           |  Holding XYZ S.A.  |                                   |
|                           |  ● Ubezpieczona    |                                   |
|                           +--------------------+                                   |
|                                    |                                               |
|                  +----------------+----------------+                               |
|                  |                                 |                               |
|       +-------------------+             +-------------------+                      |
|       |  Spółka Zależna A |             |  Spółka Zależna B |                      |
|       |  Produkcja Sp.z.o.|             |  Logistyka Sp.z.o.|                      |
|       |  ● Ubezpieczona   |             |  ⚠ LUKA           |                      |
|       +-------------------+             +-------------------+                      |
|                  |                               |                                 |
|       +-------------------+            +-------------------+                       |
|       |  🏭 Fabryka A     |            |  🏢 Magazyn B     |                       |
|       |  ul. Przemysłowa  |            |  ul. Logistyczna  |                       |
|       |  ● Ubezpieczona   |            |  ⚠ NIEZNANE       |                       |
|       +-------------------+            +-------------------+                       |
|                                                                                    |
|                                                            +---------------------+ |
|                                                            |  WŁAŚCIWOŚCI        | |
|                                                            |                     | |
|                                                            |  Nazwa: Spółka A    | |
|                                                            |  NIP: 123-456-78-90 | |
|                                                            |  Przychód: 50 mln   | |
|                                                            |  Broker: ABC Broker | |
|                                                            |                     | |
|                                                            |  Status: ● LUKA     | |
|                                                            +---------------------+ |
+-----------------------------------------------------------------------------------+
```

---

## Typy węzłów

### 1. Węzeł Spółki Matki (ParentCompanyNode)

```typescript
interface ParentCompanyNodeData {
  label: string;
  nip?: string;
  krs?: string;
  revenue?: number;
  insuranceStatus: 'insured' | 'gap' | 'unknown' | 'pending';
  broker?: string;
}
```

- **Stylizacja**: Większy rozmiar, tło navy/indigo, ikona Crown (👑)
- **Pozycja**: Zawsze na górze hierarchii

### 2. Węzeł Spółki Zależnej (SubsidiaryNode)

```typescript
interface SubsidiaryNodeData {
  label: string;
  role: 'subsidiary' | 'affiliate' | 'branch';
  ownershipPercent?: number;
  nip?: string;
  krs?: string;
  revenue?: number;
  insuranceStatus: 'insured' | 'gap' | 'unknown' | 'pending';
  broker?: string;
  linkedCompanyId?: string; // jeśli powiązana z firmą w bazie
}
```

- **Stylizacja**: Średni rozmiar, ramka kolorowa wg statusu
- **Ikona**: GitBranch dla subsidiary, Link2 dla affiliate

### 3. Węzeł Aktywa/Lokalizacji (AssetLocationNode)

```typescript
interface AssetLocationNodeData {
  label: string;
  type: 'factory' | 'warehouse' | 'office' | 'land' | 'other';
  address?: string;
  insuranceStatus: 'insured' | 'gap' | 'unknown' | 'pending';
  sumInsured?: number;
}
```

- **Stylizacja**: Mniejszy rozmiar, ikony wg typu (Factory, Warehouse, Building)
- **Pozycja**: Pod powiązaną spółką

---

## Wskaźniki statusu ubezpieczenia (Sygnalizacja świetlna)

```typescript
type InsuranceStatus = 'insured' | 'gap' | 'unknown' | 'pending';

const STATUS_COLORS = {
  insured: '#3B82F6',   // Niebieski - W pełni ubezpieczone
  gap: '#EF4444',       // Czerwony - Nieubezpieczone / LUKA
  pending: '#F59E0B',   // Żółty - Oczekuje na pokrycie
  unknown: '#6B7280',   // Szary - Nieznany status
};

const STATUS_LABELS = {
  insured: 'Ubezpieczone',
  gap: 'LUKA',
  pending: 'Oczekuje',
  unknown: 'Nieznane',
};
```

---

## Panel właściwości (PropertiesSidebar)

Otwiera się po kliknięciu węzła:

```text
+---------------------------+
|  WŁAŚCIWOŚCI PODMIOTU     |
+---------------------------+
|  Nazwa:                   |
|  [Spółka Zależna A]       |
|                           |
|  NIP: 123-456-78-90       |
|  KRS: 0000123456          |
|                           |
|  Przychody:               |
|  50 000 000 PLN (2024)    |
|                           |
|  Udział w grupie:         |
|  100%                     |
|                           |
|  Aktualny broker:         |
|  ABC Insurance Broker     |
|                           |
+---------------------------+
|  STATUS UBEZPIECZENIA     |
+---------------------------+
|  [●] Ubezpieczone         |
|  [ ] LUKA                 |
|  [ ] Oczekuje             |
|  [ ] Nieznane             |
+---------------------------+
|  [Przejdź do firmy]       |
|  [Edytuj dane]            |
+---------------------------+
```

---

## Funkcje kluczowe

### 1. Auto-Layout (Przycisk)

Używa algorytmu **dagre** do organizacji węzłów w czytelne drzewo hierarchiczne:

```typescript
import dagre from '@dagrejs/dagre';

function getLayoutedElements(nodes, edges, direction = 'TB') {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, nodesep: 80, ranksep: 100 });
  
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { 
      width: node.type === 'parent' ? 220 : 180, 
      height: node.type === 'asset' ? 80 : 100 
    });
  });
  
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });
  
  dagre.layout(dagreGraph);
  
  return nodes.map((node) => {
    const position = dagreGraph.node(node.id);
    return { ...node, position: { x: position.x, y: position.y } };
  });
}
```

### 2. Coverage Overlay (Nakładka polisowa)

Toggle który wizualnie grupuje węzły objęte tą samą polisą zbiorczą:

```typescript
interface PolicyGroup {
  policyNumber: string;
  policyName: string;
  nodeIds: string[];
  color: string;
}
```

Po włączeniu rysuje półprzezroczyste okręgi/prostokąty wokół węzłów z tej samej polisy.

### 3. Eksport PNG

Umożliwia pobranie wizualizacji jako obrazu PNG do prezentacji/raportów.

---

## Integracja z danymi

### Źródła danych

1. **capital_group_members** - Relacje spółka matka → zależne
2. **insurance_risk_assessments** - Status ubezpieczenia firmy
3. **companies** - Dane podstawowe firm (NIP, KRS, przychody)

### Hook do pobierania danych struktury

```typescript
function useStructureData(companyId: string) {
  // Pobierz członków grupy kapitałowej
  const { data: members } = useCapitalGroupMembers(companyId);
  
  // Pobierz status ubezpieczeniowy dla każdego członka
  // ...
  
  // Konwertuj na węzły i krawędzie React Flow
  const nodes = convertToNodes(members, insuranceStatuses);
  const edges = convertToEdges(members);
  
  return { nodes, edges };
}
```

---

## Schemat bazy danych

Opcjonalne rozszerzenie tabeli `capital_group_members` o pole statusu ubezpieczenia:

```sql
ALTER TABLE capital_group_members
ADD COLUMN insurance_status TEXT DEFAULT 'unknown' 
  CHECK (insurance_status IN ('insured', 'gap', 'pending', 'unknown'));

ALTER TABLE capital_group_members
ADD COLUMN broker_name TEXT;

ALTER TABLE capital_group_members
ADD COLUMN master_policy_id TEXT;
```

---

## Podsumowanie zmian w plikach

| Plik | Typ zmiany | Opis |
|------|------------|------|
| `package.json` | Modyfikacja | Dodanie @xyflow/react, @dagrejs/dagre |
| `src/components/structure/types.ts` | **NOWY** | Typy dla węzłów i krawędzi |
| `src/components/structure/StructureVisualization.tsx` | **NOWY** | Główny komponent pełnoekranowy |
| `src/components/structure/StructureCanvas.tsx` | **NOWY** | React Flow container |
| `src/components/structure/nodes/ParentCompanyNode.tsx` | **NOWY** | Custom node - spółka matka |
| `src/components/structure/nodes/SubsidiaryNode.tsx` | **NOWY** | Custom node - spółka zależna |
| `src/components/structure/nodes/AssetLocationNode.tsx` | **NOWY** | Custom node - lokalizacja |
| `src/components/structure/PropertiesSidebar.tsx` | **NOWY** | Panel właściwości węzła |
| `src/components/structure/StructureToolbar.tsx` | **NOWY** | Pasek narzędzi |
| `src/components/structure/hooks/useStructureLayout.ts` | **NOWY** | Hook auto-layout dagre |
| `src/components/structure/hooks/useStructureData.ts` | **NOWY** | Hook pobierania danych |
| `src/components/company/CompanyFlatTabs.tsx` | Modyfikacja | Dodanie zakładki "Struktura" |

---

## Przepływ użytkownika

1. Użytkownik wchodzi do widoku firmy → zakładka **"Struktura"**
2. Widzi interaktywny canvas z węzłami (spółka główna + zależne)
3. Węzły są kolorowane wg statusu ubezpieczenia (niebieski/czerwony/żółty/szary)
4. Może przeciągać węzły lub kliknąć **"Auto-Layout"** dla czytelnego układu
5. Kliknięcie węzła otwiera **panel właściwości** z danymi podmiotu
6. Może włączyć **"Pokrycie polisą"** żeby zobaczyć grupowanie wg polis zbiorczych
7. Może wyeksportować wizualizację do PNG dla raportu

---

## Paleta kolorów

- **Spółka matka**: `bg-indigo-100 border-indigo-500` + Crown icon (amber)
- **Spółka zależna**: `bg-blue-50 border-blue-400`
- **Oddział**: `bg-green-50 border-green-400`
- **Stowarzyszona**: `bg-slate-50 border-slate-400`
- **Lokalizacja**: `bg-amber-50 border-amber-400`

**Statusy:**
- Ubezpieczone: `#3B82F6` (niebieski)
- LUKA: `#EF4444` (czerwony) + animowany puls
- Oczekuje: `#F59E0B` (żółty)
- Nieznane: `#6B7280` (szary)

