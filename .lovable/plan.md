
# Panel PROSPECTING -- nowa zakladka w Zespole Deals

## Koncepcja

Nowa zakladka "Prospecting" na stronie Zespol Deals (`/deals-team`), ktora umozliwia:

1. **Import listy uczestnikow** -- upload PDF/Excel z lista osob ze spotkan/konferencji
2. **AI rozpoznaje osoby** -- edge function parsuje dokument i zwraca liste osob (imie, nazwisko, firma, branza, stanowisko)
3. **Checkbox "rozpocznij prospecting"** -- uzytkownik zaznacza, ktore osoby go interesuja
4. **Lista prospecting spotkan** -- zaznaczone osoby trafiaja na dedykowana liste z notatkami
5. **Awans do HOT/TOP/LEAD** -- z listy prospecting osoba moze byc awansowana na Kanban zespolu
6. **Konwersja na kontakt CRM** -- pelna konwersja z uzupelnieniem danych

## Architektura

### Nowa tabela: `meeting_prospects`
Niezalezna tabela (nie zasmiecamy `contacts` ani `deal_team_prospects`):

```sql
CREATE TABLE public.meeting_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.deal_teams(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  -- Dane osoby (minimalne)
  full_name TEXT NOT NULL,
  company TEXT,
  position TEXT,
  industry TEXT,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  -- Zrodlo importu
  source_event TEXT,          -- np. "Konferencja XYZ 2026"
  source_file_name TEXT,      -- nazwa uploadowanego pliku
  imported_at TIMESTAMPTZ DEFAULT now(),
  imported_by UUID NOT NULL,
  -- Prospecting
  is_prospecting BOOLEAN DEFAULT false,
  prospecting_notes TEXT,
  prospecting_status TEXT DEFAULT 'new' CHECK (prospecting_status IN ('new', 'contacted', 'interested', 'not_interested', 'converted')),
  -- Konwersja
  converted_to_contact_id UUID REFERENCES public.contacts(id),
  converted_to_team_contact_id UUID,
  converted_at TIMESTAMPTZ,
  -- Meta
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.meeting_prospects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant access" ON public.meeting_prospects
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.directors WHERE id = auth.uid()));
```

### Nowa edge function: `parse-meeting-list`
- Przyjmuje plik (base64 PDF/Excel) + nazwe wydarzenia
- Uzywa Lovable AI (Gemini) do ekstrakcji listy osob
- Zwraca tablice: `{ full_name, company, position, industry }`
- Nie wymaga dodatkowych kluczy API

### Nowe komponenty UI

#### `src/components/deals-team/ProspectingTab.tsx` (glowny)
Trzy sekcje:
1. **Import** -- drag & drop / przycisk upload + pole "Nazwa spotkania/wydarzenia"
2. **Podglad zaimportowanych** -- tabela z checkboxami "Rozpocznij prospecting"
3. **Lista prospecting** -- filtrowana lista osob ze statusem, notatkami, akcjami

#### `src/components/deals-team/ProspectingImportDialog.tsx`
- Upload pliku (PDF, XLSX, CSV)
- Pole "Nazwa wydarzenia/spotkania"
- Wywolanie edge function
- Podglad wynikow z checkboxami
- Przycisk "Importuj zaznaczone"

#### `src/components/deals-team/ProspectingList.tsx`
- Lista osob z `is_prospecting = true`
- Kolumny: imie/nazwisko, firma, branza, status, notatki, akcje
- Statusy: Nowy -> Skontaktowany -> Zainteresowany -> Skonwertowany / Niezainteresowany
- Akcje: edytuj notatke, zmien status, konwertuj na kontakt, awansuj na Kanban (LEAD)

#### `src/components/deals-team/ProspectingConvertDialog.tsx`
- Konwersja na kontakt CRM + dodanie do zespolu jako LEAD
- Formularz uzupelnienia danych (email, telefon, etc.)

### Hook: `src/hooks/useMeetingProspects.ts`
- `useMeetingProspects(teamId)` -- lista prospektow
- `useImportMeetingProspects()` -- bulk insert
- `useUpdateMeetingProspect()` -- zmiana statusu/notatek
- `useConvertMeetingProspect()` -- konwersja na kontakt

### Zmiany w istniejacych plikach

#### `src/pages/DealsTeamDashboard.tsx`
- Dodanie nowej zakladki "Prospecting" w TabsList (obok Kanban i Tabela)
- Nowy ViewMode: `'kanban' | 'table' | 'prospecting'`

#### `src/components/deals-team/index.ts`
- Export nowych komponentow

## Flow uzytkowania

```text
1. Uzytkownik klika zakladke "Prospecting"
2. Klika "Importuj liste" -> dialog
3. Wrzuca PDF z lista uczestnikow konferencji
4. Wpisuje nazwe "Konferencja IT 2026"
5. AI parsuje -> wyswietla liste 50 osob
6. Zaznacza 8 interesujacych -> "Importuj"
7. 8 osob pojawia sie na liscie prospecting
8. Dodaje notatki, zmienia statusy
9. Jak jest zainteresowany -> "Konwertuj na kontakt"
   -> tworzy kontakt CRM + dodaje na Kanban jako LEAD
```

## Pliki do utworzenia / modyfikacji

| Plik | Akcja |
|------|-------|
| Migracja SQL | Nowa tabela `meeting_prospects` |
| `supabase/functions/parse-meeting-list/index.ts` | Nowa edge function |
| `src/hooks/useMeetingProspects.ts` | Nowy hook |
| `src/components/deals-team/ProspectingTab.tsx` | Nowy komponent glowny |
| `src/components/deals-team/ProspectingImportDialog.tsx` | Dialog importu |
| `src/components/deals-team/ProspectingList.tsx` | Lista prospektow |
| `src/components/deals-team/ProspectingConvertDialog.tsx` | Dialog konwersji |
| `src/pages/DealsTeamDashboard.tsx` | Dodanie zakladki |
| `src/components/deals-team/index.ts` | Eksporty |
