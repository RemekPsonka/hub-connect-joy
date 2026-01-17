import { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import Graph from 'graphology';
import { SigmaContainer, useRegisterEvents, useSigma } from '@react-sigma/core';
import '@react-sigma/core/lib/style.css';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { ContactNode, Connection } from '@/hooks/useConnections';

interface ConnectionGraphProps {
  nodes: ContactNode[];
  edges: Connection[];
  selectedNodeId: string | null;
  highlightedPath: string[] | null;
  onNodeClick: (nodeId: string | null) => void;
  searchTerm: string;
}

// Inner component to handle Sigma events
function GraphEvents({ 
  onNodeClick, 
  selectedNodeId,
  highlightedPath,
  searchTerm 
}: { 
  onNodeClick: (nodeId: string | null) => void;
  selectedNodeId: string | null;
  highlightedPath: string[] | null;
  searchTerm: string;
}) {
  const registerEvents = useRegisterEvents();
  const sigma = useSigma();

  useEffect(() => {
    registerEvents({
      clickNode: (event) => {
        onNodeClick(event.node);
      },
      clickStage: () => {
        onNodeClick(null);
      },
    });
  }, [registerEvents, onNodeClick]);

  // Update node colors based on selection and highlighting
  useEffect(() => {
    const graph = sigma.getGraph();
    
    graph.forEachNode((node, attributes) => {
      let color = attributes.originalColor || '#6366f1';
      let size = attributes.originalSize || 10;
      let hidden = false;

      // Check if node matches search
      if (searchTerm) {
        const label = (attributes.label || '').toLowerCase();
        if (!label.includes(searchTerm.toLowerCase())) {
          color = '#e5e7eb';
          size = size * 0.7;
        } else {
          size = size * 1.2;
        }
      }

      // Highlight path nodes
      if (highlightedPath && highlightedPath.length > 0) {
        if (highlightedPath.includes(node)) {
          color = '#22c55e';
          size = size * 1.5;
        } else {
          color = '#e5e7eb';
          size = size * 0.7;
        }
      }

      // Highlight selected node
      if (selectedNodeId === node) {
        color = '#3b82f6';
        size = size * 1.3;
      }

      graph.setNodeAttribute(node, 'color', color);
      graph.setNodeAttribute(node, 'size', size);
      graph.setNodeAttribute(node, 'hidden', hidden);
    });

    // Update edge colors
    graph.forEachEdge((edge, attributes, source, target) => {
      let color = '#d1d5db';
      let size = 1;

      if (highlightedPath && highlightedPath.length > 0) {
        const sourceIdx = highlightedPath.indexOf(source);
        const targetIdx = highlightedPath.indexOf(target);
        if (sourceIdx !== -1 && targetIdx !== -1 && Math.abs(sourceIdx - targetIdx) === 1) {
          color = '#22c55e';
          size = 3;
        }
      }

      if (selectedNodeId && (source === selectedNodeId || target === selectedNodeId)) {
        color = '#3b82f6';
        size = 2;
      }

      graph.setEdgeAttribute(edge, 'color', color);
      graph.setEdgeAttribute(edge, 'size', size);
    });

    sigma.refresh();
  }, [sigma, selectedNodeId, highlightedPath, searchTerm]);

  return null;
}

export function ConnectionGraph({
  nodes,
  edges,
  selectedNodeId,
  highlightedPath,
  onNodeClick,
  searchTerm,
}: ConnectionGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLayoutDone, setIsLayoutDone] = useState(false);

  // Build the graph
  const graph = useMemo(() => {
    const g = new Graph();

    // Add nodes
    nodes.forEach((node) => {
      const baseSize = 8 + (node.connection_count || 0) * 2;
      const size = Math.min(baseSize, 30);
      const color = node.group_color || '#6366f1';

      g.addNode(node.id, {
        label: node.full_name,
        size,
        color,
        originalColor: color,
        originalSize: size,
        x: Math.random() * 100,
        y: Math.random() * 100,
        company: node.company,
        position: node.position,
      });
    });

    // Add edges
    edges.forEach((edge) => {
      // Only add edge if both nodes exist
      if (g.hasNode(edge.contact_a_id) && g.hasNode(edge.contact_b_id)) {
        try {
          g.addEdge(edge.contact_a_id, edge.contact_b_id, {
            size: (edge.strength || 5) / 5,
            color: '#d1d5db',
            type: edge.connection_type,
          });
        } catch (e) {
          // Edge might already exist
        }
      }
    });

    return g;
  }, [nodes, edges]);

  // Apply force layout
  useEffect(() => {
    if (graph.order > 0) {
      setIsLayoutDone(false);
      
      // Apply ForceAtlas2 layout
      forceAtlas2.assign(graph, {
        iterations: 100,
        settings: {
          gravity: 1,
          scalingRatio: 10,
          strongGravityMode: true,
          slowDown: 5,
          barnesHutOptimize: graph.order > 100,
        },
      });

      setIsLayoutDone(true);
    }
  }, [graph]);

  const handleNodeClick = useCallback((nodeId: string | null) => {
    onNodeClick(nodeId);
  }, [onNodeClick]);

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/20 rounded-lg border border-dashed">
        <div className="text-center p-8">
          <p className="text-muted-foreground text-lg mb-2">Brak połączeń do wyświetlenia</p>
          <p className="text-sm text-muted-foreground">
            Połączenia są tworzone automatycznie gdy logujesz spotkania 1-na-1
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full min-h-[500px] bg-background rounded-lg border">
      {isLayoutDone && (
        <SigmaContainer
          graph={graph}
          style={{ height: '100%', width: '100%' }}
          settings={{
            renderLabels: true,
            labelSize: 12,
            labelColor: { color: '#374151' },
            labelRenderedSizeThreshold: 6,
            defaultEdgeType: 'line',
            enableEdgeEvents: false,
            zoomToSizeRatioFunction: (ratio) => ratio,
            itemSizesReference: 'positions',
            zoomDuration: 200,
          }}
        >
          <GraphEvents
            onNodeClick={handleNodeClick}
            selectedNodeId={selectedNodeId}
            highlightedPath={highlightedPath}
            searchTerm={searchTerm}
          />
        </SigmaContainer>
      )}
    </div>
  );
}
