

# Wizualny konfigurator przepływu etapów (3 kanbany)

## Cel
Dodanie wizualnego konfiguratora pozwalającego na definiowanie etapów, ich kolejności, parametrów (ikona, kolor, etykieta) oraz dozwolonych przejść miedzy nimi -- dla wszystkich 3 kanbanów:
1. **Lejek główny** (KanbanBoard) -- kategorie: HOT, TOP, OFFERING, AUDIT, LEAD, 10X, COLD, KLIENT, PRZEGRANE
2. **Sub-kanbany** (SubKanbanView) -- pod-etapy wewnątrz kategorii (np. Handshake -> Pełnomocnictwo -> ...)
3. **Kanban zadań** (MyTeamTasksView, tryb workflow) -- kolumny workflow mapowane z kategorii + pod-etapu

Obecnie cała konfiguracja jest zakodowana na sztywno w `src/config/pipelineStages.ts`. Plan przenosi ją do bazy danych (per zespół) i dodaje wizualny edytor oparty na React Flow (`@xyflow/react`, już zainstalowany).

---

## Część 1: Schemat bazy danych

### Nowa tabela: `pipeline_stages`
Przechowuje etapy per zespół (zastępuje hardcoded `CATEGORY_OPTIONS`, `SUB_KANBAN_CONFIGS`, `WORKFLOW_COLUMNS`).

```sql
CREATE TABLE public.pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES deal_teams(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  -- Identyfikacja
  stage_key TEXT NOT NULL,           -- np. 'hot', 'offering', 'meeting_plan', 'handshake'
  kanban_type TEXT NOT NULL,         -- 'main' | 'sub' | 'workflow'
  parent_stage_key TEXT,             -- dla sub/workflow: klucz kategorii nadrzednej (np. 'offering')
  
  -- Wyświetlanie
  label TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '',
  
  -- Pozycja i logika
  position INT NOT NULL DEFAULT 0,
  is_default BOOLEAN DEFAULT false,  -- domyślny etap po przeniesieniu do kategorii
  section TEXT,                      -- dla workflow: 'spotkania', 'ofertowanie', itp.
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(team_id, kanban_type, stage_key)
);
```

### Nowa tabela: `pipeline_transitions`
Definiuje dozwolone przejścia miedzy etapami.

```sql
CREATE TABLE public.pipeline_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES deal_teams(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  from_stage_id UUID NOT NULL REFERENCES pipeline_stages(id) ON DELETE CASCADE,
  to_stage_id UUID NOT NULL REFERENCES pipeline_stages(id) ON DELETE CASCADE,
  kanban_type TEXT NOT NULL,         -- 'main' | 'sub' | 'workflow'
  
  label TEXT,                        -- opcjonalna etykieta przejścia
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(team_id, from_stage_id, to_stage_id)
);
```

### RLS
- Odczyt: członkowie zespołu (`is_deal_team_member`)
- Zapis: liderzy zespołu (role = 'leader') lub admin tenanta

### Migracja seedowa
Trigger lub funkcja `seed_pipeline_stages_for_team(team_id)` ktora przy tworzeniu zespolu (lub na zadanie) wstawia domyslne etapy z obecnej konfiguracji `pipelineStages.ts`.

---

## Część 2: Hook i logika konfiguracji

### Nowy hook: `src/hooks/usePipelineConfig.ts`

```text
usePipelineStages(teamId, kanbanType?)  -- pobiera etapy z DB
usePipelineTransitions(teamId, kanbanType?)  -- pobiera dozwolone przejścia
useUpsertPipelineStage()  -- tworzenie/edycja etapu
useDeletePipelineStage()  -- usuwanie etapu
useUpsertTransition()  -- dodawanie/usuwanie dozwolonego przejścia
useAllowedTransitions(teamId, currentStageKey, kanbanType)  -- zwraca dozwolone cele
```

### Adapter: `src/config/pipelineStagesAdapter.ts`

Funkcje konwertujace dane z DB na formaty uzywane przez istniejace komponenty:
- `toCategeryOptions(stages)` -> `CategoryConfig[]`
- `toSubKanbanConfigs(stages)` -> `Record<string, SubKanbanConfig>`
- `toWorkflowColumns(stages)` -> `WorkflowColumn[]`

Gdy dane z DB nie sa jeszcze zaladowane, fallback do obecnych hardcoded wartosci.

---

## Część 3: Wizualny konfigurator (React Flow)

### Nowy komponent: `src/components/deals-team/PipelineConfigurator.tsx`

Otwarcie z `TeamSettings.tsx` jako nowa sekcja "Konfigurator przepływu" z przyciskiem otwierajacym pelnoekranowy dialog.

#### UI konfiguratora:

1. **Zakladki u gory**: "Lejek glowny" | "Sub-kanbany" | "Kanban zadan" -- przelaczanie miedzy 3 kanbanami

2. **Obszar React Flow** (canvas):
   - Kazdy etap jako **node** (prostokat z ikona, etykieta, kolorem)
   - Dozwolone przejscia jako **edge** (strzalki miedzy nodami)
   - Uklad automatyczny (dagre -- juz zainstalowany) -- lewo-prawo lub gora-dol

3. **Panel boczny** (po kliknieciu na node):
   - Edycja etykiety, ikony (emoji picker), koloru (color presets jak w TeamSettings)
   - Checkbox "Etap domyslny"
   - Przycisk "Usun etap" (z potwierdzeniem)

4. **Akcje**:
   - Przycisk "+ Dodaj etap" -- dodaje nowy node
   - Laczenie nodow przez przeciaganie (React Flow native) = definiowanie dozwolonego przejscia
   - Klik na edge -> usun przejscie
   - Przycisk "Resetuj do domyslnych" -- przywraca hardcoded konfiguracje

5. **Zakladka Sub-kanbany**:
   - Dropdown do wyboru kategorii nadrzednej (hot, top, offering, audit)
   - Pokazuje pod-etapy tej kategorii jako nody + przejscia miedzy nimi

6. **Zakladka Kanban zadan**:
   - Nody pogrupowane wizualnie wg sekcji (Spotkania, Ofertowanie, Audyt, Zamkniecie, Inne)
   - Przejscia miedzy kolumnami workflow

#### Podkomponenty:
- `StageNode.tsx` -- niestandardowy node React Flow z ikona i etykieta
- `TransitionEdge.tsx` -- niestandardowy edge z etykieta i przyciskiem usuwania
- `StageEditPanel.tsx` -- panel boczny edycji etapu

---

## Część 4: Integracja z istniejacymi widokami

### Zmiany w istniejacych komponentach:

1. **`KanbanBoard.tsx`** -- zamiast importu `CATEGORY_OPTIONS` z pliku, uzywa `usePipelineStages(teamId, 'main')` + adapter. Przy D&D sprawdza `useAllowedTransitions` -- jezeli przejscie jest niedozwolone, blokuje drop i pokazuje toast.

2. **`SubKanbanView.tsx`** -- zamiast hardcoded `stages` prop, pobiera dane z `usePipelineStages(teamId, 'sub')` filtrowane po `parent_stage_key`. Przy D&D waliduje dozwolone przejscia.

3. **`MyTeamTasksView.tsx`** -- zamiast `WORKFLOW_COLUMNS` z pliku, buduje kolumny dynamicznie z `usePipelineStages(teamId, 'workflow')` + adapter. Przy D&D waliduje przejscia.

4. **`TeamSettings.tsx`** -- dodanie sekcji "Konfigurator przepływu" z przyciskiem otwierajacym `PipelineConfigurator` w pelnoekranowym dialogu.

5. **`TaskDetailSheet.tsx`** -- dropdowny kategorii/etapu filtruja opcje na podstawie dozwolonych przejsc z aktualnego etapu.

6. **`src/config/pipelineStages.ts`** -- plik pozostaje jako fallback / seed data, ale nie jest juz jedynym zrodlem prawdy.

---

## Część 5: Walidacja przejsc

Logika walidacji przejsc jest stosowana w:
- **D&D w KanbanBoard** (glowny lejek) -- `handleDrop` sprawdza czy przejscie z aktualnej kategorii do docelowej jest dozwolone
- **D&D w SubKanbanView** -- `handleDrop` sprawdza przejscia miedzy pod-etapami
- **D&D w MyTeamTasksView** (workflow kanban) -- `handleDragEnd` sprawdza przejscia
- **Dropdowny w TaskDetailSheet** -- filtruje opcje do dozwolonych celow
- **Jezeli brak zdefiniowanych przejsc** (tabela pusta dla danego kanban_type) -- wszystkie przejscia dozwolone (backward compatibility)

---

## Kolejnosc implementacji

1. Migracja DB (tabele + RLS + seed function)
2. Hook `usePipelineConfig.ts` + adapter
3. Komponent `PipelineConfigurator.tsx` z React Flow
4. Integracja z `TeamSettings.tsx`
5. Aktualizacja `KanbanBoard`, `SubKanbanView`, `MyTeamTasksView` -- dynamiczne etapy + walidacja przejsc
6. Aktualizacja `TaskDetailSheet` -- filtrowanie dropdownow

### Modyfikowane / tworzone pliki:
- **Nowe**: `src/hooks/usePipelineConfig.ts`, `src/config/pipelineStagesAdapter.ts`, `src/components/deals-team/PipelineConfigurator.tsx`, `src/components/deals-team/StageNode.tsx`, `src/components/deals-team/StageEditPanel.tsx`
- **Modyfikowane**: `TeamSettings.tsx`, `KanbanBoard.tsx`, `SubKanbanView.tsx`, `MyTeamTasksView.tsx`, `TaskDetailSheet.tsx`, `src/config/pipelineStages.ts` (dodanie funkcji seed)
- **Migracja SQL**: 1 migracja z 2 tabelami + RLS + seed function

