

# Konfigurator przeplyvu na jednym ekranie

## Problem
Obecny konfigurator rozdziela 3 kanbany na osobne zakladki -- nie mozna laczyc etapow miedzy nimi. Uzytkownik chce widziec wszystkie etapy na jednym canvas React Flow i moc definiowac polaczenia miedzy dowolnymi etapami (w tym cross-kanban).

## Rozwiazanie

Przebudowa `PipelineConfigurator.tsx` tak, aby na jednym ekranie React Flow wyswietlaly sie WSZYSTKIE etapy ze wszystkich 3 kanbanow, pogrupowane wizualnie w sekcje (z etykietami grup). Istniejace polaczenia (transitions) z bazy beda wczytywane i wyswietlane na starcie.

### Uklad wizualny na canvas

```text
+---------------------------+     +---------------------------+     +---------------------------+
| LEJEK GLOWNY              |     | SUB-KANBANY               |     | KANBAN ZADAN              |
|                           |     |                           |     |                           |
| [HOT] [TOP] [OFFERING]   |     | hot:                      |     | [Zaplanowac spotkanie]    |
| [AUDIT] [LEAD] [10X]     |     |   [plan] [scheduled] [done]|    | [Spotkanie umowione]      |
| [COLD] [KLIENT] [PRZEG.] |     | offering:                 |     | [Handshake] [Pelnom.]     |
|                           |     |   [handshake] [pelnom] ...|     | [Przygotowanie] ...       |
+---------------------------+     +---------------------------+     +---------------------------+
```

Nody beda rozmieszczone automatycznie przez dagre z `rankdir: 'TB'` (top-bottom) wewnatrz kazdej grupy, a grupy ulozone obok siebie (offsetX per kanban_type).

### Zmiany w StageNode

Dodanie informacji o typie kanbana (np. mala etykieta "main" / "sub:hot" / "workflow") i kolorowe tlo grup, zeby wizualnie rozrozniac sekcje.

### Zmiany w onConnect

Przy tworzeniu polaczenia miedzy nodami z roznych kanban_type -- `kanban_type` w transition zostanie ustawiony na `'cross'` lub na typ zrodlowego noda. Upsert transition bedzie dzialal jak dotychczas (klucz unikalny to `team_id, from_stage_id, to_stage_id`).

### Wczytywanie istniejacych polaczen

Obecnie transitions sa filtrowane po `kanban_type === tab` -- to filtrowanie zostanie usuniete. Wszystkie transitions dla teamId beda wyswietlane jako edge'e na canvas.

## Plan techniczny

### Plik: `src/components/deals-team/PipelineConfigurator.tsx`

1. **Usunac zakladki (Tabs)** -- zamiast przelaczania miedzy main/sub/workflow, wszystko na jednym canvas
2. **Usunac filtrowanie `filteredStages`** -- uzywac `allStages` bezposrednio
3. **Usunac filtrowanie `filteredTransitions`** -- uzywac `allTransitions` bezposrednio
4. **Zmodyfikowac budowanie nodow** -- dodac grupowanie wizualne:
   - Etapy `main` -- offset X=0, uklad pionowy
   - Etapy `sub` pogrupowane wg `parent_stage_key` -- offset X=400, kazda grupa pod soba
   - Etapy `workflow` -- offset X=800, uklad pionowy
   - Dodac "group label" nody (nieklikalne) jako naglowki sekcji
5. **Zmodyfikowac `onConnect`** -- wyznaczac `kanban_type` z noda zrodlowego (lub 'cross' jesli rozne typy)
6. **Zmodyfikowac `onNodeClick`** -- szukac w `allStages` zamiast `filteredStages`
7. **Zmodyfikowac `handleAddStage`** -- dodac dropdown lub domyslnie dodawac do 'main'
8. **Zachowac Select do sub-parent** przy dodawaniu nowych etapow sub-kanban

### Plik: `src/components/deals-team/StageNode.tsx`

Dodac wyswietlanie typu kanbana jako mala etykieta pod nazwa (np. "main", "sub: offering", "workflow") zeby wizualnie rozrozniac etapy na jednym canvas.

### Plik: `src/hooks/usePipelineConfig.ts`

Bez zmian -- hook juz pobiera wszystkie etapy i transitions gdy nie podano kanbanType.

### Logika layoutu

Zamiast jednego wywolania `getLayoutedElements` na wszystkich nodach (co pomieszaloby grupy), zastosowac layout per grupa z offsetem:

```text
function layoutAllStages(allStages, allTransitions) {
  // Grupa 1: main stages -> dagre layout, offsetX = 0
  // Grupa 2: sub stages per parent -> dagre layout, offsetX = 500
  // Grupa 3: workflow stages -> dagre layout, offsetX = 1000
  // Polacz wszystkie nody i edge'e w jeden zestaw
}
```

### Modyfikowane pliki
- `src/components/deals-team/PipelineConfigurator.tsx` -- glowna przebudowa
- `src/components/deals-team/StageNode.tsx` -- dodanie etykiety typu kanbana

