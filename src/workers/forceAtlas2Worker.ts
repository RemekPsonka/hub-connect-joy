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
    } catch {
      // Edge may already exist
    }
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
