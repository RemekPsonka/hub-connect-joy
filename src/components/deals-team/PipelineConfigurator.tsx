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

// ─── Per-group dagre layout with offset ──────────────────────

function layoutGroup(
  stages: PipelineStage[],
  edges: Edge[],
  offsetX: number,
  offsetY: number,
  selectedId: string | undefined,
): { nodes: Node[]; edges: Edge[] } {
  if (!stages.length) return { nodes: [], edges };

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 60 });

  const stageIds = new Set(stages.map(s => s.id));
  const groupEdges = edges.filter(e => stageIds.has(e.source) && stageIds.has(e.target));

  stages.forEach(s => g.setNode(s.id, { width: 180, height: 70 }));
  groupEdges.forEach(e => g.setEdge(e.source, e.target));

  dagre.layout(g);

  const nodes: Node[] = stages.map(s => {
    const pos = g.node(s.id);
    return {
      id: s.id,
      type: 'stage',
      position: { x: pos.x - 90 + offsetX, y: pos.y - 35 + offsetY },
      data: {
        label: s.label,
        icon: s.icon,
        color: s.color,
        stageKey: s.stage_key,
        isDefault: s.is_default,
        isSelected: selectedId === s.id,
        kanbanType: s.kanban_type,
        parentStageKey: s.parent_stage_key,
      } satisfies StageNodeData,
    };
  });

  return { nodes, edges: groupEdges };
}

export function PipelineConfigurator({ teamId, tenantId, open, onOpenChange }: PipelineConfiguratorProps) {
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null);
  const [addKanbanType, setAddKanbanType] = useState<string>('main');

  const { data: allStages = [], isLoading: stagesLoading } = usePipelineStages(teamId);
  const { data: allTransitions = [], isLoading: transitionsLoading } = usePipelineTransitions(teamId);

  const upsertStage = useUpsertPipelineStage();
  const deleteStage = useDeletePipelineStage();
  const upsertTransition = useUpsertTransition();
  const deleteTransitionMut = useDeleteTransition();
  const seedStages = useSeedPipelineStages();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Build all edges from transitions
  const allEdges = useMemo<Edge[]>(() =>
    allTransitions.map(t => ({
      id: t.id,
      source: t.from_stage_id,
      target: t.to_stage_id,
      markerEnd: { type: MarkerType.ArrowClosed },
      label: t.label || undefined,
      style: { strokeWidth: 2 },
      animated: true,
    })),
    [allTransitions]
  );

  // Group stages and layout
  useEffect(() => {
    const mainStages = allStages.filter(s => s.kanban_type === 'main').sort((a, b) => a.position - b.position);
    const subStages = allStages.filter(s => s.kanban_type === 'sub').sort((a, b) => a.position - b.position);
    const workflowStages = allStages.filter(s => s.kanban_type === 'workflow').sort((a, b) => a.position - b.position);

    // Sub-stages grouped by parent
    const subByParent = new Map<string, PipelineStage[]>();
    subStages.forEach(s => {
      const key = s.parent_stage_key || '_none';
      if (!subByParent.has(key)) subByParent.set(key, []);
      subByParent.get(key)!.push(s);
    });

    const sid = selectedStage?.id;

    // Layout main at x=0
    const mainLayout = layoutGroup(mainStages, allEdges, 0, 60, sid);

    // Layout sub groups stacked vertically at x=500
    let subOffsetY = 60;
    const subNodes: Node[] = [];
    const subEdgesAll: Edge[] = [];
    subByParent.forEach((stages, _parentKey) => {
      const { nodes: gn, edges: ge } = layoutGroup(stages, allEdges, 500, subOffsetY, sid);
      subNodes.push(...gn);
      subEdgesAll.push(...ge);
      subOffsetY += stages.length * 90 + 60;
    });

    // Layout workflow at x=1000
    const workLayout = layoutGroup(workflowStages, allEdges, 1000, 60, sid);

    // Cross-group edges (edges not assigned to any single group)
    const assignedEdgeIds = new Set([
      ...mainLayout.edges.map(e => e.id),
      ...subEdgesAll.map(e => e.id),
      ...workLayout.edges.map(e => e.id),
    ]);
    const crossEdges = allEdges.filter(e => !assignedEdgeIds.has(e.id));

    setNodes([...mainLayout.nodes, ...subNodes, ...workLayout.nodes]);
    setEdges([...mainLayout.edges, ...subEdgesAll, ...workLayout.edges, ...crossEdges]);
  }, [allStages, allTransitions, selectedStage?.id]);

  // Create transition on connect
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const sourceStage = allStages.find(s => s.id === connection.source);
      const targetStage = allStages.find(s => s.id === connection.target);
      const kanbanType = sourceStage?.kanban_type === targetStage?.kanban_type
        ? sourceStage?.kanban_type || 'main'
        : 'cross';

      upsertTransition.mutate({
        team_id: teamId,
        tenant_id: tenantId,
        from_stage_id: connection.source,
        to_stage_id: connection.target,
        kanban_type: kanbanType,
      });
      setEdges(eds => addEdge({ ...connection, markerEnd: { type: MarkerType.ArrowClosed }, animated: true }, eds));
    },
    [teamId, tenantId, allStages, upsertTransition, setEdges]
  );

  // Delete transition on edge click
  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      deleteTransitionMut.mutate({ id: edge.id, teamId });
      setEdges(eds => eds.filter(e => e.id !== edge.id));
    },
    [deleteTransitionMut, teamId, setEdges]
  );

  // Select stage on node click
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const stage = allStages.find(s => s.id === node.id);
      setSelectedStage(stage || null);
    },
    [allStages]
  );

  // Add new stage
  const handleAddStage = () => {
    const newKey = `stage_${Date.now()}`;
    upsertStage.mutate({
      team_id: teamId,
      tenant_id: tenantId,
      stage_key: newKey,
      kanban_type: addKanbanType as 'main' | 'sub' | 'workflow',
      label: 'Nowy etap',
      icon: '📋',
      color: 'border-t-slate-500',
      position: allStages.filter(s => s.kanban_type === addKanbanType).length,
      parent_stage_key: null,
      section: null,
    });
  };

  const handleSaveStage = (updates: Partial<PipelineStage>) => {
    if (!selectedStage) return;
    upsertStage.mutate({ ...selectedStage, ...updates });
    setSelectedStage(prev => prev ? { ...prev, ...updates } : null);
  };

  const handleDeleteStage = () => {
    if (!selectedStage) return;
    deleteStage.mutate({ id: selectedStage.id, teamId });
    setSelectedStage(null);
  };

  const handleReset = () => {
    seedStages.mutate({ teamId, tenantId });
  };

  const isLoading = stagesLoading || transitionsLoading;
  const isEmpty = !allStages.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Konfigurator przepływu — wszystkie kanbany</DialogTitle>
        </DialogHeader>

        <div className="px-6 flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-block w-3 h-3 rounded-full bg-blue-500" /> Lejek główny
            <span className="inline-block w-3 h-3 rounded-full bg-amber-500 ml-2" /> Sub-kanbany
            <span className="inline-block w-3 h-3 rounded-full bg-emerald-500 ml-2" /> Workflow
          </div>

          <div className="ml-auto flex gap-2 items-center">
            <Select value={addKanbanType} onValueChange={setAddKanbanType}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="main">Lejek główny</SelectItem>
                <SelectItem value="sub">Sub-kanban</SelectItem>
                <SelectItem value="workflow">Workflow</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleAddStage} disabled={upsertStage.isPending}>
              <Plus className="h-4 w-4 mr-1" />
              Dodaj etap
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset} disabled={seedStages.isPending}>
              {seedStages.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              <span className="ml-1">Resetuj</span>
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
          Wszystkie 3 kanbany na jednym canvas. Połącz dowolne etapy przeciągając między nimi. Kliknij na połączenie aby je usunąć.
        </div>
      </DialogContent>
    </Dialog>
  );
}
