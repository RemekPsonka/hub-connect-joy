

# Plan: Zakładka "Eksport danych" w Settings

## Cel

Dodanie nowej zakładki "Eksport danych" w Settings umożliwiającej eksport surowych danych CRM do formatów Excel (XLSX) i JSON.

---

## Obecny stan

### Istniejące elementy
| Element | Status |
|---------|--------|
| `Settings.tsx` | 6 zakładek (general, tasks, security, krs, bi, ai) |
| `exportReports.ts` | Eksport raportów analitycznych (PDF/Excel) - osobna funkcjonalność |
| `xlsx` library | Zainstalowana w projekcie |
| Obsługa ról | Asystenci widzą tylko formularz zmiany hasła i 2FA |

### Tabele do eksportu
| Tabela | Bezpieczne kolumny |
|--------|-------------------|
| `contacts` | full_name, email, phone, company, position, city, tags, created_at, last_contact_date |
| `companies` | name, nip, krs, city, industry, company_status, employee_count, revenue_amount, created_at |
| `consultations` | scheduled_at, status, notes, ai_summary, duration_minutes, location |
| `tasks` | title, description, status, priority, due_date, created_at |
| `needs` | title, description, category, status, priority, created_at |
| `offers` | title, description, category, status, created_at |

---

## Składniki implementacji

### Krok 1: Nowy komponent `src/components/settings/DataExportSettings.tsx`

```typescript
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, FileJson, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const EXPORT_ENTITIES = [
  { 
    key: 'contacts', 
    label: 'Kontakty', 
    table: 'contacts',
    columns: ['full_name','email','phone','company','position','city','tags','created_at','last_contact_date']
  },
  { 
    key: 'companies', 
    label: 'Firmy', 
    table: 'companies',
    columns: ['name','nip','krs','city','industry','company_status','employee_count','revenue_amount','created_at']
  },
  { 
    key: 'consultations', 
    label: 'Konsultacje', 
    table: 'consultations',
    columns: ['scheduled_at','status','notes','ai_summary','duration_minutes','location']
  },
  { 
    key: 'tasks', 
    label: 'Zadania', 
    table: 'tasks',
    columns: ['title','description','status','priority','due_date','created_at']
  },
  { 
    key: 'needs', 
    label: 'Potrzeby', 
    table: 'needs',
    columns: ['title','description','category','status','priority','created_at']
  },
  { 
    key: 'offers', 
    label: 'Oferty', 
    table: 'offers',
    columns: ['title','description','category','status','created_at']
  },
];
```

**UI komponentu:**
- Card z listą encji
- Każda encja to wiersz z ikoną, nazwą i dwoma przyciskami (Excel, JSON)
- Stan ładowania dla każdego przycisku osobno
- Komunikaty sukcesu/błędu przez toast

### Krok 2: Logika eksportu Excel

```typescript
async function exportToExcel(entity: typeof EXPORT_ENTITIES[0]) {
  setExporting({ ...exporting, [entity.key + '_excel']: true });
  
  try {
    const { data, error } = await supabase
      .from(entity.table)
      .select(entity.columns.join(','))
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    const ws = XLSX.utils.json_to_sheet(data || []);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, entity.label);
    
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `${entity.key}_export_${dateStr}.xlsx`);
    
    toast.success('Eksport zakończony', { 
      description: `Pobrano ${data?.length || 0} rekordów` 
    });
  } catch (err) {
    toast.error('Błąd eksportu', { description: String(err) });
  } finally {
    setExporting({ ...exporting, [entity.key + '_excel']: false });
  }
}
```

### Krok 3: Logika eksportu JSON

```typescript
async function exportToJson(entity: typeof EXPORT_ENTITIES[0]) {
  setExporting({ ...exporting, [entity.key + '_json']: true });
  
  try {
    const { data, error } = await supabase
      .from(entity.table)
      .select(entity.columns.join(','))
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    const dateStr = new Date().toISOString().split('T')[0];
    a.download = `${entity.key}_export_${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Eksport zakończony', { 
      description: `Pobrano ${data?.length || 0} rekordów` 
    });
  } catch (err) {
    toast.error('Błąd eksportu', { description: String(err) });
  } finally {
    setExporting({ ...exporting, [entity.key + '_json']: false });
  }
}
```

### Krok 4: Integracja w Settings.tsx

```typescript
// Import nowego komponentu
import { DataExportSettings } from '@/components/settings/DataExportSettings';

// W TabsList (po "AI & Embeddingi"):
<TabsTrigger value="export">
  <Download className="h-4 w-4 mr-1" />
  Eksport danych
</TabsTrigger>

// Nowy TabsContent:
<TabsContent value="export" className="space-y-6">
  <DataExportSettings />
</TabsContent>
```

---

## Bezpieczeństwo

| Zabezpieczenie | Implementacja |
|----------------|---------------|
| Tylko director | Zakładka nie pojawia się dla asystentów (isAssistant early return) |
| RLS | Automatyczne filtrowanie po tenant_id |
| Bez wrażliwych danych | Eksportowane tylko bezpieczne kolumny (brak password_hash, tokens, internal IDs) |
| Brak embeddings | Kolumna profile_embedding wykluczony z eksportu |

---

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/settings/DataExportSettings.tsx` | NOWY - komponent eksportu |
| `src/pages/Settings.tsx` | Dodanie zakładki + import komponentu |

---

## Struktura UI

```text
┌─────────────────────────────────────────────────────────┐
│ Card: Eksport danych CRM                                │
├─────────────────────────────────────────────────────────┤
│ Pobierz pełne dane z systemu w formacie Excel lub JSON │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 👥 Kontakty                    [📊 Excel] [📄 JSON] │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ 🏢 Firmy                       [📊 Excel] [📄 JSON] │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ 📅 Konsultacje                 [📊 Excel] [📄 JSON] │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ ✓ Zadania                      [📊 Excel] [📄 JSON] │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ 💡 Potrzeby                    [📊 Excel] [📄 JSON] │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ 📦 Oferty                      [📊 Excel] [📄 JSON] │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ⚠️ Dane są filtrowane według Twojego konta.            │
└─────────────────────────────────────────────────────────┘
```

---

## Bez zmian

| Element | Status |
|---------|--------|
| `src/utils/exportReports.ts` | Bez zmian (osobna funkcjonalność Analytics) |
| Istniejące zakładki Settings | Bez zmian |
| Edge Functions | Bez zmian |
| Baza danych | Bez zmian |

---

## Testy weryfikacyjne

1. Otwórz `/settings` → zakładka "Eksport danych" widoczna
2. Kliknij Excel przy Kontaktach → plik `.xlsx` się pobiera
3. Otwórz plik Excel → dane poprawne, bez wrażliwych kolumn
4. Kliknij JSON przy Firmach → plik `.json` z poprawnymi danymi
5. Zaloguj się jako asystent → zakładka "Eksport" niewidoczna
6. Network tab → zapytania filtrują po tenant (RLS)

