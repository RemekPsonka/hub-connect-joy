

## Plan: Edycja i usuwanie polis w harmonogramie

### Cel
Dodać możliwość edycji danych polisy oraz jej usunięcia bezpośrednio z widoku harmonogramu (Renewal Timeline). Akcje będą dostępne po kliknięciu na pasek polisy lub w tooltipie.

---

## Architektura rozwiązania

Obecnie `TimelineTooltip` wyświetla tylko checklistę i informacje o polisie. Trzeba rozszerzyć tooltip o przyciski "Edytuj" i "Usuń", a także stworzyć modal do edycji polisy (podobny do `AddPolicyModal`, ale z wczytanymi danymi).

---

## Zmiany w plikach

| Plik | Typ | Opis |
|------|-----|------|
| `src/components/renewal/EditPolicyModal.tsx` | NOWY | Modal do edycji polisy z wszystkimi polami |
| `src/components/renewal/TimelineTooltip.tsx` | MOD | Dodanie przycisków "Edytuj" i "Usuń" |
| `src/components/renewal/PolicyBar.tsx` | MOD | Przekazanie callbacków `onEdit` i `onDelete` |
| `src/components/renewal/TimelineRow.tsx` | MOD | Przekazanie callbacków do `PolicyBar` |
| `src/components/renewal/RenewalTimeline.tsx` | MOD | Integracja z `updatePolicy`, `deletePolicy` i obsługa modali |
| `src/components/renewal/index.ts` | MOD | Eksport nowego komponentu |

---

## Nowy komponent: `EditPolicyModal.tsx`

Modal do edycji polisy z formularzem analogicznym do `AddPolicyModal`, ale z wczytanymi danymi:

```
┌─────────────────────────────────────────────────────────────┐
│  Edytuj polisę                                              │
├─────────────────────────────────────────────────────────────┤
│  Typ polisy *          [Flota ▼]                            │
│  Numer polisy          [POL-2026-001        ]               │
│                                                             │
│  Nazwa polisy *        [UG flota                ]           │
│                                                             │
│  Ubezpieczyciel        [PZU SA              ]               │
│  Broker                [                    ]               │
│                                                             │
│  Data rozpoczęcia *    [01.02.2026]                         │
│  Data zakończenia *    [01.02.2027]                         │
│                                                             │
│  Suma ubezpieczenia    [5 000 000] PLN                      │
│  Składka               [   45 000] PLN                      │
│                                                             │
│  ☑ Nasza polisa (obsługujemy jako broker)                  │
│                                                             │
│  Notatki:              [________________________]           │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐│
│  │  🗑️ Usuń polisę                              [Usuń]   ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│                      [Anuluj]  [Zapisz zmiany]              │
└─────────────────────────────────────────────────────────────┘
```

---

## Modyfikacja `TimelineTooltip.tsx`

Dodanie przycisków akcji na dole tooltipa:

```typescript
interface TimelineTooltipProps {
  policy: InsurancePolicy;
  onChecklistChange: (key: keyof RenewalChecklist, value: boolean) => void;
  onEdit?: () => void;    // NOWE
  onDelete?: () => void;  // NOWE
}

// W komponencie - dodać sekcję na końcu:
<div className="border-t pt-2 mt-2 flex gap-2">
  <Button 
    variant="outline" 
    size="sm" 
    className="flex-1 text-xs"
    onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
  >
    <Pencil className="h-3 w-3 mr-1" />
    Edytuj
  </Button>
  <Button 
    variant="outline" 
    size="sm" 
    className="text-xs text-destructive hover:bg-destructive/10"
    onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
  >
    <Trash2 className="h-3 w-3" />
  </Button>
</div>
```

---

## Modyfikacja `PolicyBar.tsx`

Dodanie callbacków:

```typescript
interface PolicyBarProps {
  policy: InsurancePolicy;
  // ... istniejące
  onEdit: (policy: InsurancePolicy) => void;    // NOWE
  onDelete: (policyId: string) => void;         // NOWE
}

// W TimelineTooltip:
<TimelineTooltip
  policy={policy}
  onChecklistChange={(key, value) => onChecklistChange(policy.id, key, value)}
  onEdit={() => onEdit(policy)}
  onDelete={() => onDelete(policy.id)}
/>
```

---

## Modyfikacja `TimelineRow.tsx`

Przekazanie callbacków:

```typescript
interface TimelineRowProps {
  // ... istniejące
  onEditPolicy: (policy: InsurancePolicy) => void;
  onDeletePolicy: (policyId: string) => void;
}

// W mapowaniu PolicyBar:
<PolicyBar
  key={policy.id}
  policy={policy}
  // ... istniejące
  onEdit={onEditPolicy}
  onDelete={onDeletePolicy}
/>
```

---

## Modyfikacja `RenewalTimeline.tsx`

Integracja z hookiem i obsługa modali:

```typescript
const {
  policies,
  isLoading,
  createPolicy,
  updatePolicy,    // DODANE
  deletePolicy,    // DODANE
  updateChecklist,
  criticalPolicies,
} = useInsurancePolicies(companyId);

const [editModalOpen, setEditModalOpen] = useState(false);
const [policyToEdit, setPolicyToEdit] = useState<InsurancePolicy | null>(null);
const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
const [policyToDelete, setPolicyToDelete] = useState<string | null>(null);

// Handlery
const handleEditPolicy = useCallback((policy: InsurancePolicy) => {
  setPolicyToEdit(policy);
  setEditModalOpen(true);
}, []);

const handleUpdatePolicy = useCallback((data: UpdatePolicyInput) => {
  updatePolicy.mutate(data, {
    onSuccess: () => setEditModalOpen(false),
  });
}, [updatePolicy]);

const handleDeletePolicy = useCallback((policyId: string) => {
  setPolicyToDelete(policyId);
  setDeleteConfirmOpen(true);
}, []);

const confirmDelete = useCallback(() => {
  if (policyToDelete) {
    deletePolicy.mutate(policyToDelete, {
      onSuccess: () => {
        setDeleteConfirmOpen(false);
        setPolicyToDelete(null);
      },
    });
  }
}, [policyToDelete, deletePolicy]);

// W TimelineRow:
<TimelineRow
  // ... istniejące
  onEditPolicy={handleEditPolicy}
  onDeletePolicy={handleDeletePolicy}
/>

// Nowe modale:
<EditPolicyModal
  open={editModalOpen}
  onOpenChange={setEditModalOpen}
  policy={policyToEdit}
  onSubmit={handleUpdatePolicy}
  isLoading={updatePolicy.isPending}
/>

<AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Usunąć polisę?</AlertDialogTitle>
      <AlertDialogDescription>
        Ta operacja jest nieodwracalna. Polisa zostanie trwale usunięta z harmonogramu.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Anuluj</AlertDialogCancel>
      <AlertDialogAction onClick={confirmDelete} className="bg-destructive">
        Usuń polisę
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Przepływ użytkownika

1. **Kliknięcie na pasek polisy** → pojawia się tooltip z checklistą
2. **Przycisk "Edytuj"** → otwiera modal edycji z wczytanymi danymi
3. **Edycja pól** → zmiana typu, nazwy, dat, sumy, składki, notatek
4. **Zapisz** → wywołuje `updatePolicy.mutate()` → odświeżenie timeline
5. **Przycisk "Usuń"** → otwiera dialog potwierdzenia
6. **Potwierdzenie** → wywołuje `deletePolicy.mutate()` → polisa znika z harmonogramu

---

## Podsumowanie zmian

| Plik | Zmiany |
|------|--------|
| `EditPolicyModal.tsx` | Nowy modal z formularzem edycji |
| `TimelineTooltip.tsx` | Przyciski "Edytuj" i "Usuń" na dole tooltipa |
| `PolicyBar.tsx` | Nowe propsy `onEdit`, `onDelete` |
| `TimelineRow.tsx` | Przekazanie callbacków do PolicyBar |
| `RenewalTimeline.tsx` | Stan dla modali, handlery, integracja z hookiem |
| `index.ts` | Eksport EditPolicyModal |

---

## Korzyści

1. **Szybka edycja** - poprawka danych bez wychodzenia z harmonogramu
2. **Bezpieczne usuwanie** - dialog potwierdzenia zapobiega przypadkowemu usunięciu
3. **Pełna funkcjonalność CRUD** - tworzenie, odczyt, aktualizacja, usuwanie polis
4. **Spójne UX** - podobny wygląd modali jak przy dodawaniu polisy

