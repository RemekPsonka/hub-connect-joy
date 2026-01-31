import { useCallback, useRef, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';

import ParentCompanyNode from './nodes/ParentCompanyNode';
import SubsidiaryNode from './nodes/SubsidiaryNode';
import AssetLocationNode from './nodes/AssetLocationNode';
import { PropertiesSidebar } from './PropertiesSidebar';
import { StructureToolbar } from './StructureToolbar';
import { useStructureLayout } from './hooks/useStructureLayout';
import type { SelectedNodeInfo, InsuranceStatus, StructureNodeData } from './types';

const nodeTypes = {
  parent: ParentCompanyNode,
  subsidiary: SubsidiaryNode,
  asset: AssetLocationNode,
};

interface StructureCanvasInnerProps {
  initialNodes: any[];
  initialEdges: any[];
  onStatusChange?: (nodeId: string, status: InsuranceStatus) => void;
}

function StructureCanvasInner({ 
  initialNodes, 
  initialEdges,
  onStatusChange,
}: StructureCanvasInnerProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<SelectedNodeInfo | null>(null);
  const [coverageOverlay, setCoverageOverlay] = useState(false);
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const { getLayoutedElements } = useStructureLayout();

  // Handle node click
  const onNodeClick = useCallback((_: React.MouseEvent, node: any) => {
    setSelectedNode({
      id: node.id,
      type: node.type as 'parent' | 'subsidiary' | 'asset',
      data: node.data as StructureNodeData,
    });
  }, []);

  // Handle pane click (deselect)
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Auto layout
  const handleAutoLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes as any[],
      edges as any[],
      { direction: 'TB', nodeSep: 80, rankSep: 120 }
    );
    setNodes(layoutedNodes as any);
    setEdges(layoutedEdges as any);
    
    // Fit view after layout with a small delay
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 500 });
    }, 50);
  }, [nodes, edges, getLayoutedElements, setNodes, setEdges, fitView]);

  // Export to PNG
  const handleExportPng = useCallback(async () => {
    if (!reactFlowWrapper.current) return;

    try {
      const dataUrl = await toPng(reactFlowWrapper.current, {
        backgroundColor: '#ffffff',
        quality: 1,
        pixelRatio: 2,
      });

      const link = document.createElement('a');
      link.download = `struktura-grupy-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
      
      toast.success('Wyeksportowano strukturę do PNG');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Błąd eksportu do PNG');
    }
  }, []);

  // Handle status change from sidebar
  const handleStatusChange = useCallback((nodeId: string, status: InsuranceStatus) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, insuranceStatus: status },
          };
        }
        return node;
      })
    );
    
    // Update selected node state
    setSelectedNode((prev) => 
      prev?.id === nodeId 
        ? { ...prev, data: { ...prev.data, insuranceStatus: status } }
        : prev
    );

    // Call external handler if provided
    onStatusChange?.(nodeId, status);
  }, [setNodes, onStatusChange]);

  return (
    <div className="relative h-full w-full flex flex-col">
      <StructureToolbar
        onAutoLayout={handleAutoLayout}
        onExportPng={handleExportPng}
        onZoomIn={() => zoomIn()}
        onZoomOut={() => zoomOut()}
        coverageOverlay={coverageOverlay}
        onCoverageOverlayChange={setCoverageOverlay}
      />

      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2}
          className="bg-muted/20"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls position="bottom-left" showInteractive={false} />
          
          {/* Legend panel */}
          <Panel position="bottom-right" className="bg-background/90 backdrop-blur-sm border rounded-lg p-3 m-4">
            <div className="text-xs font-medium mb-2 text-muted-foreground">Legenda statusów</div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-xs">Ubezpieczone</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-xs">LUKA</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-xs">Oczekuje</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-gray-500" />
                <span className="text-xs">Nieznane</span>
              </div>
            </div>
          </Panel>
        </ReactFlow>

        {/* Properties sidebar */}
        <PropertiesSidebar
          selectedNode={selectedNode}
          onClose={() => setSelectedNode(null)}
          onStatusChange={handleStatusChange}
        />
      </div>
    </div>
  );
}

interface StructureCanvasProps {
  initialNodes: any[];
  initialEdges: any[];
  onStatusChange?: (nodeId: string, status: InsuranceStatus) => void;
}

export function StructureCanvas(props: StructureCanvasProps) {
  return (
    <ReactFlowProvider>
      <StructureCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
