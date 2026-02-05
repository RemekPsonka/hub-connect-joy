
# Plan: Migracja ForceAtlas2 do Web Workera

## Cel

Przeniesienie synchronicznych obliczeń layoutu grafu (150 iteracji ForceAtlas2) do Web Workera, aby wyeliminować freeze UI trwający 2-5 sekund przy grafach >500 węzłów.

---

## Obecny stan (problem P0)

```text
┌─────────────────────────────────────────────────────────────┐
│ ConnectionGraph.tsx                                         │
├─────────────────────────────────────────────────────────────┤
│ useEffect                                                   │
│   ├── Budowanie grafu (nodes + edges)                       │
│   ├── forceAtlas2.assign(graph, { iterations: 150, ... })  │  ← BLOKUJE UI
│   │       └── 150 iteracji synchronicznych                  │
│   └── loadGraph(graph)                                      │
└─────────────────────────────────────────────────────────────┘
```

**Problem:** `forceAtlas2.assign()` z 150 iteracjami blokuje main thread.

---

## Rozwiązanie: Architektura z Web Workerem

```text
┌──────────────────┐     postMessage      ┌─────────────────────┐
│  Main Thread     │ ──────────────────── │  Web Worker         │
│                  │                      │                     │
│  ConnectionGraph │  nodes, edges,       │  forceAtlas2Worker  │
│  GraphDataLoader │  settings, iterations│                     │
│                  │ ──────────────────── │                     │
│                  │                      │  ┌─────────────────┐│
│  ┌─────────────┐ │                      │  │ Batch iteracje  ││
│  │ Progress:   │ │  ← progress %        │  │ (10 na raz)     ││
│  │ [████░░] 40%│ │ ──────────────────── │  │                 ││
│  └─────────────┘ │                      │  │ forceAtlas2.    ││
│                  │                      │  │   assign()      ││
│  Aplikacja      │  ← positions{}       │  └─────────────────┘│
│  pozycji na graf │ ──────────────────── │                     │
└──────────────────┘                      └─────────────────────┘
```

---

## Składniki implementacji

### Krok 1: Worker `src/workers/forceAtlas2Worker.ts`

**Nowy plik** - worker obliczający layout ForceAtlas2 w tle:

```typescript
// src/workers/forceAtlas2Worker.ts
import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';

interface WorkerInput {
  nodes: Array<{ key: string; attributes: Record<string, unknown> }>;
  edges: Array<{ source: string; target: string; attributes: Record<string, unknown> }>;
  settings: Record<string, unknown>;
  iterations: number;
}

self.onmessage = (event: MessageEvent<WorkerInput>) => {
  const { nodes, edges, settings, iterations } = event.data;
  
  // Odbuduj graf w kontekście workera
  const graph = new Graph();
  nodes.forEach(n => graph.addNode(n.key, n.attributes));
  edges.forEach(e => {
    try {
      graph.addEdge(e.source, e.target, e.attributes);
    } catch { /* edge may exist */ }
  });

  // Iteracyjny layout z progress updates (batch po 10)
  const batchSize = 10;
  for (let i = 0; i < iterations; i += batchSize) {
    const count = Math.min(batchSize, iterations - i);
    forceAtlas2.assign(graph, { iterations: count, settings });
    
    self.postMessage({
      type: 'progress',
      progress: Math.round(((i + count) / iterations) * 100),
    });
  }

  // Wyślij finalne pozycje
  const positions: Record<string, { x: number; y: number }> = {};
  graph.forEachNode((key, attrs) => {
    positions[key] = { x: attrs.x as number, y: attrs.y as number };
  });

  self.postMessage({ type: 'result', positions });
};
```

### Krok 2: Hook `src/hooks/useForceAtlas2Worker.ts`

**Nowy plik** - hook zarządzający workerem:

```typescript
import { useRef, useCallback, useState } from 'react';
import Graph from 'graphology';

interface ForceAtlas2Settings {
  gravity?: number;
  scalingRatio?: number;
  strongGravityMode?: boolean;
  slowDown?: number;
  barnesHutOptimize?: boolean;
  linLogMode?: boolean;
  outboundAttractionDistribution?: boolean;
}

interface ComputeResult {
  [key: string]: { x: number; y: number };
}

export function useForceAtlas2Worker() {
  const workerRef = useRef<Worker | null>(null);
  const [progress, setProgress] = useState(0);
  const [isComputing, setIsComputing] = useState(false);

  const compute = useCallback((
    graph: Graph, 
    settings: ForceAtlas2Settings, 
    iterations: number = 150
  ): Promise<ComputeResult> => {
    return new Promise((resolve, reject) => {
      setIsComputing(true);
      setProgress(0);

      // Utwórz worker z Vite URL pattern
      const worker = new Worker(
        new URL('../workers/forceAtlas2Worker.ts', import.meta.url),
        { type: 'module' }
      );
      workerRef.current = worker;

      // Serializuj graf do przekazania do workera
      const nodes: Array<{ key: string; attributes: Record<string, unknown> }> = [];
      const edges: Array<{ source: string; target: string; attributes: Record<string, unknown> }> = [];

      graph.forEachNode((key, attrs) => {
        nodes.push({ key, attributes: { ...attrs } });
      });
      graph.forEachEdge((key, attrs, source, target) => {
        edges.push({ source, target, attributes: { ...attrs } });
      });

      worker.onmessage = (e) => {
        if (e.data.type === 'progress') {
          setProgress(e.data.progress);
        }
        if (e.data.type === 'result') {
          setIsComputing(false);
          setProgress(100);
          worker.terminate();
          workerRef.current = null;
          resolve(e.data.positions);
        }
      };

      worker.onerror = (error) => {
        setIsComputing(false);
        worker.terminate();
        workerRef.current = null;
        reject(error);
      };

      worker.postMessage({ nodes, edges, settings, iterations });
    });
  }, []);

  const cancel = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
      setIsComputing(false);
      setProgress(0);
    }
  }, []);

  return { compute, cancel, progress, isComputing };
}
```

### Krok 3: Aktualizacja `ConnectionGraph.tsx`

**Zmiany w GraphDataLoader:**

| Przed | Po |
|-------|-----|
| Synchroniczny `forceAtlas2.assign()` | Asynchroniczny worker z `await compute()` |
| Brak progress indicator | Progress bar podczas obliczeń |
| Freeze UI 2-5s | UI responsywne |

```typescript
// Zmiany w GraphDataLoader:

// 1. Dodaj stan dla workera (przekazany jako props)
interface GraphDataLoaderProps {
  nodes: ContactNode[];
  edges: Connection[];
  onComputingChange: (isComputing: boolean) => void;
  onProgressChange: (progress: number) => void;
}

// 2. Użyj hooka
const { compute, progress, isComputing } = useForceAtlas2Worker();

// 3. Zamień synchroniczny layout na asynchroniczny
useEffect(() => {
  async function buildGraph() {
    const graph = new Graph();
    // ... budowanie grafu (bez zmian) ...

    if (graph.order > 0) {
      onComputingChange(true);
      
      // ASYNC zamiast sync
      const positions = await compute(graph, {
        gravity: 0.5,
        scalingRatio: 20,
        strongGravityMode: false,
        slowDown: 3,
        barnesHutOptimize: true,
        linLogMode: true,
        outboundAttractionDistribution: true,
      }, 150);

      // Aplikuj pozycje na graf
      Object.entries(positions).forEach(([key, pos]) => {
        graph.setNodeAttribute(key, 'x', pos.x);
        graph.setNodeAttribute(key, 'y', pos.y);
      });

      onComputingChange(false);
    }

    loadGraph(graph);
  }
  
  buildGraph();
}, [nodes, edges, loadGraph, sigma, compute]);
```

### Krok 4: UI Progress Indicator w ConnectionGraph

Dodanie overlaya z progress barem podczas obliczeń:

```typescript
// W głównym komponencie ConnectionGraph:
const [isComputing, setIsComputing] = useState(false);
const [progress, setProgress] = useState(0);

return (
  <div className="w-full h-[500px] bg-background rounded-lg border relative">
    {/* Progress overlay */}
    {isComputing && (
      <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 rounded-lg">
        <div className="text-center">
          <Progress value={progress} className="w-48 mb-2" />
          <p className="text-sm text-muted-foreground">
            Obliczanie layoutu... {progress}%
          </p>
        </div>
      </div>
    )}

    <SigmaContainer ...>
      <GraphDataLoader 
        nodes={nodes} 
        edges={edges}
        onComputingChange={setIsComputing}
        onProgressChange={setProgress}
      />
      ...
    </SigmaContainer>
  </div>
);
```

---

## Pliki do utworzenia/modyfikacji

| Plik | Operacja | Opis |
|------|----------|------|
| `src/workers/forceAtlas2Worker.ts` | NOWY | Worker z ForceAtlas2 |
| `src/hooks/useForceAtlas2Worker.ts` | NOWY | Hook zarządzający workerem |
| `src/components/network/ConnectionGraph.tsx` | MODYFIKACJA | Integracja z workerem + progress UI |

---

## Korzyści wydajnościowe

| Metryka | Przed | Po |
|---------|-------|-----|
| UI freeze (500 węzłów) | 2-5 sekund | 0ms |
| Interakcja podczas obliczeń | Niemożliwa | Pełna (scroll, click, etc.) |
| Feedback dla użytkownika | Brak | Progress bar z % |
| Anulowanie obliczeń | Niemożliwe | `cancel()` terminuje worker |

---

## Szczegóły techniczne

### Wzorzec Vite Worker
```typescript
new Worker(
  new URL('../workers/forceAtlas2Worker.ts', import.meta.url),
  { type: 'module' }
)
```
Ten wzorzec jest wspierany przez Vite i poprawnie bundluje worker jako osobny moduł.

### Serializacja grafu
Graf Graphology nie może być przekazany przez `postMessage` (nie jest strukturą serializowalną), więc serializujemy go do tablicy nodes/edges, a worker odbudowuje graf.

### Memory Leak Protection
- Worker jest terminowany po zakończeniu (`worker.terminate()`)
- Hook `cancel()` pozwala terminować worker przy unmount komponentu
- `workerRef` jest czyszczony

### Error Handling
- `worker.onerror` łapie błędy w workerze
- Zachowany ErrorBoundary w Network.tsx obsługuje UI fallback

---

## Guardrails (bez zmian)

| Element | Status |
|---------|--------|
| Logika budowania grafu (nodes/edges) | Bez zmian |
| ErrorBoundary w Network.tsx | Zachowany |
| Kolory i style węzłów/krawędzi | Bez zmian |
| GraphEvents (click, highlight) | Bez zmian |
| Sigma settings | Bez zmian |

---

## Testy weryfikacyjne

1. **Responsywność UI**: Otwórz `/network` → podczas obliczeń layoutu możesz scrollować i klikać
2. **Progress bar**: Widoczny postęp 0-100% podczas obliczeń
3. **Poprawność layoutu**: Graf wyświetla się z tym samym layoutem co wcześniej (ForceAtlas2)
4. **Duże grafy**: Test z >500 węzłami — brak freeze UI
5. **Błędy**: Worker crashuje → ErrorBoundary łapie błąd i wyświetla fallback
6. **Cleanup**: Nawigacja poza `/network` podczas obliczeń nie powoduje memory leaków
