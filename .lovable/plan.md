

# Logiczny układ konfiguratora przepływu

## Problem
Obecny konfigurator używa algorytmu dagre do rozmieszczania etapów. Bez zdefiniowanych połączeń dagre nie wie jak ułożyć nody -- wynik jest chaotyczny i nieczytelny. Etapy z różnych kanbanów mieszają się ze sobą.

## Rozwiązanie
Zastąpienie dagre prostym, deterministycznym układem siatkowym (grid), który zawsze wygląda logicznie niezależnie od tego czy są połączenia czy nie.

### Układ wizualny

```text
LEJEK GŁÓWNY          SUB-KANBANY                    WORKFLOW ZADAŃ
(kolumna 1)           (kolumna 2)                    (kolumna 3)

🔥 HOT LEAD           --- HOT/TOP ---                --- Spotkania ---
⭐ TOP LEAD            📋 Zaplanować spotkanie        📞 Zaplanować spotkanie
📝 OFERTOWANIE         📅 Spotkanie umówione          📅 Spotkanie umówione
📋 AUDYT               ✅ Spotkanie odbyte             ✅ Spotkanie odbyte
📋 LEAD                                               
🚀 10X                 --- OFERTOWANIE ---             --- Ofertowanie ---
❄️ COLD LEAD           🤝 Handshake                   🤝 Handshake
✅ KLIENT              📄 Pełnomocnictwo              📄 Pełnomocnictwo
✖️ PRZEGRANE           📋 Przygotowanie               📋 Przygotowanie
                       💬 Negocjacje                  💬 Negocjacje
                       ✅ Zaakceptowano                🎉 Zaakceptowano
                       ✖️ Przegrano                   ✖️ Przegrano

                       --- AUDYT ---                   --- Audyt ---
                       📋 Do zaplanowania              🔍 Do zaplanowania
                       📅 Zaplanowany                  📅 Zaplanowany
                       ✅ Odbyty                       ✅ Odbyty

                                                      --- Zamknięcie ---
                                                      🏆 Klient
                                                      ✖️ Przegrane

                                                      --- Inne ---
                                                      📁 Inne
```

Każda kolumna ma nagłówek (nieklikalna etykieta). Sub-kanbany mają podgrupowe nagłówki (np. "HOT/TOP", "OFERTOWANIE", "AUDYT"). Etapy ułożone pionowo w stałych odstępach -- czytelne i przewidywalne.

## Plan techniczny

### Plik: `src/components/deals-team/PipelineConfigurator.tsx`

1. **Usunięcie dagre** -- zastąpienie funkcji `layoutGroup` prostym algorytmem pozycjonowania:
   - Kolumna Main: x=0, etapy co 100px w pionie
   - Kolumna Sub: x=350, etapy pogrupowane wg parent_stage_key, z nagłówkami grup, co 90px
   - Kolumna Workflow: x=700, etapy pogrupowane wg section, z nagłówkami, co 90px

2. **Nagłówki grup** -- dodanie "label nodes" (type: 'group-label') -- prostokąty z tytułem sekcji, bez handles, niereagujące na kliknięcia. Każda z 3 kolumn ma nagłówek główny, sub i workflow mają też nagłówki podgrup.

3. **Handles** -- zmiana pozycji: Handle source na dole (Position.Bottom), target na górze (Position.Top) w pionie, ALBO pozostawienie Left/Right dla połączeń cross-kanban. Najlepiej: handles na wszystkich 4 stronach żeby połączenia wyglądały dobrze niezależnie od kierunku.

4. **fitView** -- zachowanie, żeby canvas automatycznie skalował się do widoku.

### Plik: `src/components/deals-team/StageNode.tsx`

Dodanie handles na wszystkich 4 pozycjach (Top, Bottom, Left, Right) żeby połączenia między kolumnami wyglądały naturalnie.

### Logika pozycjonowania (pseudokod)

```text
function buildNodes(allStages, selectedId):
  nodes = []
  
  // Kolumna 1: Main (x=0)
  nodes.push(labelNode("LEJEK GŁÓWNY", 0, 0))
  mainStages = allStages.filter(main).sortBy(position)
  mainStages.forEach((s, i) => nodes.push(stageNode(s, 0, 50 + i * 100)))
  
  // Kolumna 2: Sub (x=350)  
  nodes.push(labelNode("SUB-KANBANY", 350, 0))
  subGroups = groupBy(allStages.filter(sub), parent_stage_key)
  offsetY = 50
  subGroups.forEach((parentKey, stages) => {
    nodes.push(labelNode(parentKey.toUpperCase(), 350, offsetY))
    offsetY += 35
    stages.forEach((s, i) => {
      nodes.push(stageNode(s, 350, offsetY))
      offsetY += 90
    })
    offsetY += 20  // gap between groups
  })
  
  // Kolumna 3: Workflow (x=700)
  nodes.push(labelNode("WORKFLOW ZADAŃ", 700, 0))
  workGroups = groupBy(allStages.filter(workflow), section)
  offsetY = 50
  workGroups.forEach((section, stages) => {
    nodes.push(labelNode(section, 700, offsetY))
    offsetY += 35
    stages.forEach((s, i) => {
      nodes.push(stageNode(s, 700, offsetY))
      offsetY += 90
    })
    offsetY += 20
  })
  
  return nodes
```

### Modyfikowane pliki
- `src/components/deals-team/PipelineConfigurator.tsx` -- nowa logika pozycjonowania, usunięcie dagre
- `src/components/deals-team/StageNode.tsx` -- handles na 4 pozycjach

