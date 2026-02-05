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
      graph.forEachEdge((_key, attrs, source, target) => {
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
