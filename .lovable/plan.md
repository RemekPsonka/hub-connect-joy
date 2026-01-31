

## Plan: Dokończenie Modułu Grupy Kapitałowej i Wizualizacji Struktury

### Cel
Połączyć funkcjonalność dodawania spółek do grupy kapitałowej z wizualizacją struktury. Użytkownik z poziomu zakładki "Struktura" powinien móc dodawać firmy do grupy i widzieć je na grafie React Flow.

---

## Analiza Obecnego Stanu

### Co już działa:
1. **`CapitalGroupViewer`** - pełny widok grupy kapitałowej z tabelą, grafikiem statycznym i modalem dodawania
2. **`StructureVisualization`** + **`StructureCanvas`** - wizualizacja React Flow z węzłami i krawędziami
3. **`AddCapitalGroupMemberModal`** - modal do dodawania spółek ręcznie
4. **`useCapitalGroupMembers`** hook - CRUD dla tabeli `capital_group_members`
5. **Węzły graficzne** (`ParentCompanyNode`, `SubsidiaryNode`) - komponenty React Flow

### Wykryty Problem:
W widoku kontaktu (zakładka "Struktura") użytkownik widzi pusty graf z komunikatem "Dodaj spółki zależne w zakładce 'Grupa kapitałowa'", ale takiej zakładki nie ma w tym widoku. Przycisk dodawania spółek jest niedostępny.

---

## Architektura Rozwiązania

### 1. Rozszerzenie `StructureVisualization` o możliwość dodawania spółek

Zmodyfikuj `StructureVisualization.tsx`:
- Dodaj przycisk "Dodaj spółkę do grupy" w pustym stanie
- Dodaj integrację z `AddCapitalGroupMemberModal`
- Dodaj toolbar z opcją szybkiego dodawania

### 2. Rozszerzenie modala dodawania o wybór z bazy CRM

Zmodyfikuj `AddCapitalGroupMemberModal.tsx`:
- Dodaj opcję wyszukiwania i wyboru istniejącej firmy z bazy
- Automatyczne wypełnianie pól (NIP, KRS, przychody) z wybranej firmy
- Automatyczne linkowanie (`member_company_id`)

### 3. Rozbudowa toolbara struktury

Zmodyfikuj `StructureToolbar.tsx`:
- Dodaj przycisk "Dodaj podmiot" obok istniejących narzędzi

---

## Szczegóły Implementacji

### Plik 1: `src/components/structure/StructureVisualization.tsx`

**Zmiany:**
```typescript
// Dodaj importy
import { useState } from 'react';
import { Plus, Network, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddCapitalGroupMemberModal } from '@/components/company/AddCapitalGroupMemberModal';

// Dodaj state w komponencie
const [isAddModalOpen, setIsAddModalOpen] = useState(false);

// Zmień pusty stan na:
if (members.length === 0) {
  return (
    <div className="flex flex-col items-center justify-center h-96 text-center">
      <Network className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium text-foreground mb-2">
        Brak struktury grupy kapitałowej
      </h3>
      <p className="text-sm text-muted-foreground max-w-md mb-4">
        Dodaj spółki zależne, aby zobaczyć wizualizację struktury holdingowej.
      </p>
      <Button onClick={() => setIsAddModalOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Dodaj spółkę do grupy
      </Button>
      
      <AddCapitalGroupMemberModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        parentCompanyId={company.id}
      />
    </div>
  );
}

// Dodaj modal również do głównego widoku z grafem:
return (
  <div className="h-[600px] w-full border rounded-lg overflow-hidden bg-background relative">
    <StructureCanvas ... />
    
    <AddCapitalGroupMemberModal
      open={isAddModalOpen}
      onOpenChange={setIsAddModalOpen}
      parentCompanyId={company.id}
    />
  </div>
);
```

### Plik 2: `src/components/company/AddCapitalGroupMemberModal.tsx`

**Zmiany - dodaj wyszukiwanie firm z CRM:**

```typescript
// Dodaj import
import { useCompaniesList } from '@/hooks/useCompanies';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

// Dodaj w komponencie:
const { data: companies = [] } = useCompaniesList();
const [selectedCompany, setSelectedCompany] = useState<{id: string; name: string} | null>(null);
const [mode, setMode] = useState<'search' | 'manual'>('search');

// Struktura UI:
<DialogContent className="max-w-lg">
  <DialogHeader>
    <DialogTitle>Dodaj spółkę do grupy kapitałowej</DialogTitle>
  </DialogHeader>
  
  <Tabs value={mode} onValueChange={(v) => setMode(v as 'search' | 'manual')}>
    <TabsList className="grid w-full grid-cols-2">
      <TabsTrigger value="search">Wybierz z bazy</TabsTrigger>
      <TabsTrigger value="manual">Dodaj ręcznie</TabsTrigger>
    </TabsList>
    
    <TabsContent value="search">
      <Command>
        <CommandInput placeholder="Szukaj firmy w CRM..." />
        <CommandList>
          <CommandEmpty>Nie znaleziono firmy</CommandEmpty>
          <CommandGroup>
            {companies.map((company) => (
              <CommandItem
                key={company.id}
                onSelect={() => {
                  setSelectedCompany(company);
                  // Auto-fill form fields from company data
                }}
              >
                {company.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </TabsContent>
    
    <TabsContent value="manual">
      {/* Existing form */}
    </TabsContent>
  </Tabs>
</DialogContent>
```

### Plik 3: `src/components/structure/StructureToolbar.tsx`

**Zmiany - dodaj przycisk dodawania:**

```typescript
// Dodaj prop
interface StructureToolbarProps {
  // ...existing props
  onAddEntity?: () => void;
}

// W komponencie dodaj przycisk:
{onAddEntity && (
  <Button onClick={onAddEntity} size="sm" className="gap-1.5">
    <Plus className="h-4 w-4" />
    Dodaj podmiot
  </Button>
)}
```

### Plik 4: `src/components/structure/StructureCanvas.tsx`

**Zmiany - przekaż callback do toolbara:**

```typescript
interface StructureCanvasProps {
  // ...existing props
  onAddEntity?: () => void;
}

// Przekaż do StructureToolbar:
<StructureToolbar
  // ...existing props
  onAddEntity={props.onAddEntity}
/>
```

### Plik 5: `src/hooks/useCapitalGroupMembers.ts`

**Rozszerzenie - dodaj funkcję linkowania z firmą:**

```typescript
export function useAddCapitalGroupMemberFromCompany() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      parentCompanyId, 
      companyId, 
      relationshipType, 
      ownershipPercent 
    }: { 
      parentCompanyId: string; 
      companyId: string; 
      relationshipType: 'subsidiary' | 'affiliate' | 'parent' | 'branch';
      ownershipPercent?: number;
    }) => {
      // Pobierz dane firmy
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('name, nip, krs, regon, revenue_amount, revenue_year')
        .eq('id', companyId)
        .single();
      
      if (companyError) throw companyError;
      
      // Pobierz tenant_id
      const { data: { user } } = await supabase.auth.getUser();
      const { data: director } = await supabase
        .from('directors')
        .select('tenant_id')
        .eq('user_id', user!.id)
        .single();
      
      // Wstaw członka grupy z linkiem do firmy
      const { data, error } = await supabase
        .from('capital_group_members')
        .insert({
          tenant_id: director!.tenant_id,
          parent_company_id: parentCompanyId,
          member_company_id: companyId,
          external_name: company.name,
          external_nip: company.nip,
          external_krs: company.krs,
          external_regon: company.regon,
          relationship_type: relationshipType,
          ownership_percent: ownershipPercent,
          revenue_amount: company.revenue_amount,
          revenue_year: company.revenue_year,
          data_source: 'crm_link'
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['capital-group-members', variables.parentCompanyId] });
      toast.success('Powiązano firmę z grupą kapitałową');
    },
    onError: (error: Error) => {
      toast.error(`Błąd: ${error.message}`);
    }
  });
}
```

---

## Podsumowanie Zmian w Plikach

| Plik | Typ | Opis |
|------|-----|------|
| `src/components/structure/StructureVisualization.tsx` | Modyfikacja | Dodanie przycisku "Dodaj spółkę" i modala |
| `src/components/structure/StructureToolbar.tsx` | Modyfikacja | Przycisk "Dodaj podmiot" w toolbarze |
| `src/components/structure/StructureCanvas.tsx` | Modyfikacja | Przekazanie callback do toolbara |
| `src/components/company/AddCapitalGroupMemberModal.tsx` | Modyfikacja | Dodanie zakładki "Wybierz z bazy" z wyszukiwarką firm CRM |
| `src/hooks/useCapitalGroupMembers.ts` | Modyfikacja | Nowa funkcja `useAddCapitalGroupMemberFromCompany` |

---

## Przepływ Użytkownika (Po Zmianach)

1. Użytkownik wchodzi w kontakt → przełącza na "FIRMA" → zakładka "Struktura"
2. Widzi pusty stan z przyciskiem "Dodaj spółkę do grupy"
3. Klika przycisk → otwiera się modal z dwoma zakładkami:
   - **Wybierz z bazy**: wyszukiwarka firm CRM z autouzupełnieniem
   - **Dodaj ręcznie**: formularz do wprowadzenia danych spółki zewnętrznej
4. Po dodaniu spółki graf React Flow automatycznie się odświeża
5. Użytkownik widzi strukturę z węzłami spółki matki i zależnych
6. Może kliknąć węzeł aby zobaczyć szczegóły w sidebarze
7. Jeśli spółka jest zlinkowana z CRM, może przejść do jej profilu

---

## Wizualizacja Przepływu

```
┌────────────────────────────────────────────────────────────────┐
│  FIRMA: SGU Brokers                                            │
├────────────────────────────────────────────────────────────────┤
│  [Źródła] [Struktura✓] [Ubezpieczenia] [Ekspozycja] [DNA OC]  │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│  [+ Dodaj podmiot]  [Auto-Layout]  [Export PNG]  [Zoom]       │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│                    ┌─────────────┐                             │
│                    │   👑        │                             │
│                    │ Spółka      │                             │
│                    │ Matka       │                             │
│                    │ SGU Brokers │                             │
│                    └──────┬──────┘                             │
│                           │                                    │
│           ┌───────────────┼───────────────┐                    │
│           │               │               │                    │
│     ┌─────┴─────┐   ┌─────┴─────┐   ┌─────┴─────┐             │
│     │ Spółka    │   │ Spółka    │   │ Oddział   │             │
│     │ Zależna 1 │   │ Zależna 2 │   │ Wrocław   │             │
│     │ 100%      │   │ 51%       │   │           │             │
│     │ [W bazie] │   │           │   │           │             │
│     └───────────┘   └───────────┘   └───────────┘             │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Szczegóły Techniczne

### Rozszerzony Modal z Zakładkami

```
┌───────────────────────────────────────────────────────────────┐
│  Dodaj spółkę do grupy kapitałowej                      [X]  │
├───────────────────────────────────────────────────────────────┤
│  [Wybierz z bazy]  [Dodaj ręcznie]                           │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  🔍 Szukaj firmy w CRM...                                    │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ ABC Transport Sp. z o.o.                                │ │
│  │ XYZ Logistics S.A.                                      │ │
│  │ Fabryka Mebli Sp.j.                                    │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Typ powiązania *         Udział procentowy                  │
│  [Spółka zależna  ▼]      [      %]                          │
│                                                               │
│                              [Anuluj]  [Dodaj spółkę]        │
└───────────────────────────────────────────────────────────────┘
```

