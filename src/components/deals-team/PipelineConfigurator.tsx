import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { Plus, RotateCcw, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  usePipelineStages,
  usePipelineTransitions,
  useUpsertPipelineStage,
  useDeletePipelineStage,
  useUpsertTransition,
  useDeleteTransition,
  useSeedPipelineStages,
  type PipelineStage,
} from '@/hooks/usePipelineConfig';
import { StageNode, type StageNodeData } from './StageNode';
import { StageEditPanel } from './StageEditPanel';

const nodeTypes = { stage: StageNode };

interface PipelineConfiguratorProps {
  teamId: string;
  tenantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type KanbanTab = 'main' | 'sub' | 'workflow';

// ─── Auto-layout with dagre ─────────────────────────────────

function getLayoutedElements(nodes: Node[], edges: Edge[], direction = 'LR') {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 60, ranksep: 100 });

  nodes.forEach(n => g.setNode(n.id, { width: 180, height: 60 }));
  edges.forEach(e => g.setEdge(e.source, e.target));

  dagre.layout(g);

  const layoutedNodes = nodes.map(n => {
    const pos = g.node(n.id);
    return { ...n, position: { x: pos.x - 90, y: pos.y - 30 } };
  });

  return { nodes: layoutedNodes, edges };
}

export function PipelineConfigurator({ teamId, tenantId, open, onOpenChange }: PipelineConfiguratorProps) {
  const [tab, setTab] = useState<KanbanTab>('main');
  const [subParent, setSubParent] = useState<string>('offering');
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null);

  const { data: allStages = [], isLoading: stagesLoading } = usePipelineStages(teamId);
  const { data: allTransitions = [], isLoading: transitionsLoading } = usePipelineTransitions(teamId);

  const upsertStage = useUpsertPipelineStage();
  const deleteStage = useDeletePipelineStage();
  const upsertTransition = useUpsertTransition();
  const deleteTransitionMut = useDeleteTransition();
  const seedStages = useSeedPipelineStages();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Filter stages for current tab
  const filteredStages = useMemo(() => {
    let stages = allStages.filter(s => s.kanban_type === tab);
    if (tab === 'sub') {
      stages = stages.filter(s => s.parent_stage_key === subParent);
    }
    return stages.sort((a, b) => a.position - b.position);
  }, [allStages, tab, subParent]);

  const filteredTransitions = useMemo(() => {
    const stageIds = new Set(filteredStages.map(s => s.id));
    return allTransitions.filter(
      t => t.kanban_type === tab && stageIds.has(t.from_stage_id) && stageIds.has(t.to_stage_id)
    );
  }, [allTransitions, filteredStages, tab]);

  // Build React Flow nodes & edges from DB data
  useEffect(() => {
    const rfNodes: Node[] = filteredStages.map(s => ({
      id: s.id,
      type: 'stage',
      position: { x: 0, y: 0 },
      data: {
        label: s.label,
        icon: s.icon,
        color: s.color,
        stageKey: s.stage_key,
        isDefault: s.is_default,
        isSelected: selectedStage?.id === s.id,
      } satisfies StageNodeData,
    }));

    const rfEdges: Edge[] = filteredTransitions.map(t => ({
      id: t.id,
      source: t.from_stage_id,
      target: t.to_stage_id,
      markerEnd: { type: MarkerType.ArrowClosed },
      label: t.label || undefined,
      style: { strokeWidth: 2 },
      animated: true,
    }));

    const { nodes: layouted, edges: layoutedEdges } = getLayoutedElements(rfNodes, rfEdges);
    setNodes(layouted);
    setEdges(layoutedEdges);
  }, [filteredStages, filteredTransitions, selectedStage?.id]);

  // Handle new connection (create transition)
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      upsertTransition.mutate({
        team_id: teamId,
        tenant_id: tenantId,
        from_stage_id: connection.source,
        to_stage_id: connection.target,
        kanban_type: tab,
      });
      setEdges(eds => addEdge({ ...connection, markerEnd: { type: MarkerType.ArrowClosed }, animated: true }, eds));
    },
    [teamId, tenantId, tab, upsertTransition, setEdges]
  );

  // Handle edge click (delete transition)
  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      deleteTransitionMut.mutate({ id: edge.id, teamId });
      setEdges(eds => eds.filter(e => e.id !== edge.id));
    },
    [deleteTransitionMut, teamId, setEdges]
  );

  // Handle node click (select for editing)
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const stage = filteredStages.find(s => s.id === node.id);
      setSelectedStage(stage || null);
    },
    [filteredStages]
  );

  // Add new stage
  const handleAddStage = () => {
    const newKey = `stage_${Date.now()}`;
    upsertStage.mutate({
      team_id: teamId,
      tenant_id: tenantId,
      stage_key: newKey,
      kanban_type: tab,
      label: 'Nowy etap',
      icon: '📋',
      color: 'border-t-slate-500',
      position: filteredStages.length,
      parent_stage_key: tab === 'sub' ? subParent : null,
      section: tab === 'workflow' ? 'inne' : null,
    });
  };

  // Save stage edits
  const handleSaveStage = (updates: Partial<PipelineStage>) => {
    if (!selectedStage) return;
    upsertStage.mutate({
      ...selectedStage,
      ...updates,
    });
    setSelectedStage(prev => prev ? { ...prev, ...updates } : null);
  };

  // Delete stage
  const handleDeleteStage = () => {
    if (!selectedStage) return;
    deleteStage.mutate({ id: selectedStage.id, teamId });
    setSelectedStage(null);
  };

  // Reset to defaults
  const handleReset = () => {
    seedStages.mutate({ teamId, tenantId });
  };

  // Parent categories for sub-kanban tab
  const parentCategories = useMemo(() => {
    const mainStages = allStages.filter(s => s.kanban_type === 'main');
    const subParents = new Set(
      allStages.filter(s => s.kanban_type === 'sub').map(s => s.parent_stage_key)
    );
    return mainStages.filter(s => subParents.has(s.stage_key));
  }, [allStages]);

  const isLoading = stagesLoading || transitionsLoading;
  const isEmpty = !filteredStages.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Konfigurator przepływu</DialogTitle>
        </DialogHeader>

        <div className="px-6 flex items-center gap-4">
          <Tabs value={tab} onValueChange={v => { setTab(v as KanbanTab); setSelectedStage(null); }}>
            <TabsList>
              <TabsTrigger value="main">Lejek główny</TabsTrigger>
              <TabsTrigger value="sub">Sub-kanbany</TabsTrigger>
              <TabsTrigger value="workflow">Kanban zadań</TabsTrigger>
            </TabsList>
          </Tabs>

          {tab === 'sub' && parentCategories.length > 0 && (
            <Select value={subParent} onValueChange={setSubParent}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {parentCategories.map(p => (
                  <SelectItem key={p.stage_key} value={p.stage_key}>
                    {p.icon} {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} disabled={seedStages.isPending}>
              {seedStages.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              <span className="ml-1">Resetuj</span>
            </Button>
            <Button size="sm" onClick={handleAddStage} disabled={upsertStage.isPending}>
              <Plus className="h-4 w-4 mr-1" />
              Dodaj etap
            </Button>
          </div>
        </div>

        <div className="flex-1 flex min-h-0">
          <div className="flex-1 relative">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : isEmpty ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                <p>Brak etapów. Wczytaj domyślne lub dodaj nowy.</p>
                <Button onClick={handleReset}>Wczytaj domyślne etapy</Button>
              </div>
            ) : (
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onEdgeClick={onEdgeClick}
                onNodeClick={onNodeClick}
                nodeTypes={nodeTypes}
                fitView
                deleteKeyCode={null}
                proOptions={{ hideAttribution: true }}
              >
                <Background />
                <Controls />
              </ReactFlow>
            )}
          </div>

          {selectedStage && (
            <StageEditPanel
              stage={selectedStage}
              onSave={handleSaveStage}
              onDelete={handleDeleteStage}
              onClose={() => setSelectedStage(null)}
            />
          )}
        </div>

        <div className="px-6 py-3 border-t text-xs text-muted-foreground">
          Połącz etapy przeciągając między nimi aby zdefiniować dozwolone przejścia. Kliknij na połączenie aby je usunąć.
        </div>
      </DialogContent>
    </Dialog>
  );
}
