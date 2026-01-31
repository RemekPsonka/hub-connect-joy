import { useCallback } from 'react';
import dagre from 'dagre';

interface LayoutOptions {
  direction?: 'TB' | 'BT' | 'LR' | 'RL';
  nodeWidth?: number;
  nodeHeight?: number;
  nodeSep?: number;
  rankSep?: number;
}

const NODE_DIMENSIONS = {
  parent: { width: 220, height: 120 },
  subsidiary: { width: 180, height: 110 },
  asset: { width: 140, height: 90 },
};

export function useStructureLayout() {
  const getLayoutedElements = useCallback(
    (
      nodes: any[],
      edges: any[],
      options: LayoutOptions = {}
    ): { nodes: any[]; edges: any[] } => {
      const {
        direction = 'TB',
        nodeSep = 80,
        rankSep = 100,
      } = options;

      const dagreGraph = new dagre.graphlib.Graph();
      dagreGraph.setDefaultEdgeLabel(() => ({}));
      dagreGraph.setGraph({ 
        rankdir: direction, 
        nodesep: nodeSep, 
        ranksep: rankSep,
        marginx: 50,
        marginy: 50,
      });

      // Add nodes to dagre graph
      nodes.forEach((node) => {
        const dimensions = NODE_DIMENSIONS[node.type as keyof typeof NODE_DIMENSIONS] 
          || NODE_DIMENSIONS.subsidiary;
        dagreGraph.setNode(node.id, {
          width: dimensions.width,
          height: dimensions.height,
        });
      });

      // Add edges to dagre graph
      edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
      });

      // Run dagre layout algorithm
      dagre.layout(dagreGraph);

      // Apply layout positions to nodes
      const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        const dimensions = NODE_DIMENSIONS[node.type as keyof typeof NODE_DIMENSIONS] 
          || NODE_DIMENSIONS.subsidiary;

        return {
          ...node,
          position: {
            x: nodeWithPosition.x - dimensions.width / 2,
            y: nodeWithPosition.y - dimensions.height / 2,
          },
        };
      });

      return { nodes: layoutedNodes, edges };
    },
    []
  );

  return { getLayoutedElements };
}
