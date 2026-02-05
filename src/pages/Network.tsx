import { useState, useMemo, useCallback } from 'react';
import { Share2, Search, Filter, AlertCircle, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { ConnectionGraph } from '@/components/network/ConnectionGraph';
import { GraphSidebar } from '@/components/network/GraphSidebar';
import { FindPathModal } from '@/components/network/FindPathModal';
import { AddConnectionModal } from '@/components/network/AddConnectionModal';
import { ConnectionLegend } from '@/components/network/ConnectionLegend';
import { useConnections } from '@/hooks/useConnections';
import type { Connection } from '@/hooks/useConnections';
import { useContactGroups } from '@/hooks/useContactGroups';

function GraphErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  return (
    <Card className="m-4">
      <CardContent className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">Nie udało się załadować grafu</h3>
        <p className="text-muted-foreground mb-4 max-w-md">
          Wystąpił błąd podczas renderowania grafu sieci kontaktów. 
          Spróbuj odświeżyć stronę lub skontaktuj się z pomocą techniczną.
        </p>
        <p className="text-xs text-muted-foreground mb-4 font-mono bg-muted p-2 rounded max-w-md overflow-auto">
          {errorMessage}
        </p>
        <Button onClick={resetErrorBoundary}>Spróbuj ponownie</Button>
      </CardContent>
    </Card>
  );
}

export default function Network() {
  const { data: graphData, isLoading } = useConnections();
  const { data: groups } = useContactGroups();
  
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedPath, setHighlightedPath] = useState<string[] | null>(null);
  const [findPathOpen, setFindPathOpen] = useState(false);
  const [pathStartContactId, setPathStartContactId] = useState<string | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [addConnectionOpen, setAddConnectionOpen] = useState(false);

  const nodes = graphData?.nodes || [];
  const edges = graphData?.edges || [];

  // Pokaż tylko kontakty które mają połączenia
  const connectedNodeIds = useMemo(() => {
    const ids = new Set<string>();
    edges.forEach((edge) => {
      if (edge.contact_a_id) ids.add(edge.contact_a_id);
      if (edge.contact_b_id) ids.add(edge.contact_b_id);
    });
    return ids;
  }, [edges]);

  // Filtrowane węzły - tylko te z połączeniami + opcjonalnie filtr grup
  const filteredNodes = useMemo(() => {
    let result = nodes.filter((node) => connectedNodeIds.has(node.id));
    
    if (selectedGroups.length > 0) {
      result = result.filter((node) => 
        node.primary_group_id && selectedGroups.includes(node.primary_group_id)
      );
    }
    return result;
  }, [nodes, connectedNodeIds, selectedGroups]);

  // Filter edges to only include those where both nodes are visible
  const filteredEdges = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    return edges.filter((edge) => {
      if (!edge.contact_a_id || !edge.contact_b_id) return false;
      return nodeIds.has(edge.contact_a_id) && nodeIds.has(edge.contact_b_id);
    });
  }, [edges, filteredNodes]);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );

  const handleNodeClick = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    setHighlightedPath(null);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSelectedNodeId(null);
    setHighlightedPath(null);
  }, []);

  const handleFindPath = useCallback((contactId: string) => {
    setPathStartContactId(contactId);
    setFindPathOpen(true);
  }, []);

  const handlePathFound = useCallback((path: string[]) => {
    setHighlightedPath(path);
    setFindPathOpen(false);
  }, []);

  const handleClearPath = useCallback(() => {
    setHighlightedPath(null);
  }, []);

  const handleGroupToggle = (groupId: string) => {
    setSelectedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  const connectedNodesCount = filteredNodes.filter((n) => (n.connection_count || 0) > 0).length;

  if (isLoading) {
    return (
      <div className="flex h-full">
        <div className="flex-1 flex flex-col p-6">
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-64" />
          </div>
          <Skeleton className="flex-1 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Share2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Sieć kontaktów</h1>
              <p className="text-sm text-muted-foreground">
                {filteredNodes.length} kontaktów • {filteredEdges.length} połączeń
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj w sieci..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-64"
              />
            </div>

            <Button onClick={() => setAddConnectionOpen(true)}>
              <Link2 className="h-4 w-4 mr-2" />
              Dodaj połączenie
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Filtruj według grupy</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {groups?.map((group) => (
                  <DropdownMenuCheckboxItem
                    key={group.id}
                    checked={selectedGroups.includes(group.id)}
                    onCheckedChange={() => handleGroupToggle(group.id)}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: group.color || '#6366f1' }}
                      />
                      {group.name}
                    </div>
                  </DropdownMenuCheckboxItem>
                ))}
                {selectedGroups.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setSelectedGroups([])}
                    >
                      Wyczyść filtry
                    </Button>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Status Bar */}
        {(highlightedPath || selectedGroups.length > 0) && (
          <div className="px-4 py-2 bg-muted/50 border-b flex items-center gap-2 flex-wrap">
            {highlightedPath && (
              <Badge variant="secondary" className="gap-1">
                Ścieżka: {highlightedPath.length} węzłów
                <button
                  onClick={handleClearPath}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            )}
            {selectedGroups.length > 0 && (
              <Badge variant="outline">
                Filtr: {selectedGroups.length} grup
              </Badge>
            )}
          </div>
        )}

        {/* Graph with Error Boundary */}
        <div className="flex-1 p-4">
          <ErrorBoundary
            FallbackComponent={GraphErrorFallback}
            onReset={() => window.location.reload()}
          >
            <ConnectionGraph
              nodes={filteredNodes}
              edges={filteredEdges as Connection[]}
              selectedNodeId={selectedNodeId}
              highlightedPath={highlightedPath}
              onNodeClick={handleNodeClick}
              searchTerm={searchTerm}
            />
          </ErrorBoundary>
        </div>

        {/* Legend */}
        <ConnectionLegend className="mx-4 mb-2" />

        {/* Footer Stats */}
        <div className="px-4 py-2 border-t bg-muted/30 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>Węzły: {filteredNodes.length}</span>
            <span>Połączenia: {filteredEdges.length}</span>
            <span>Połączonych: {connectedNodesCount}</span>
          </div>
          <div className="text-xs">
            Kliknij węzeł aby zobaczyć szczegóły
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <GraphSidebar
        selectedNode={selectedNode}
        onClose={handleCloseSidebar}
        onFindPath={handleFindPath}
        nodes={nodes}
      />

      {/* Find Path Modal */}
      <FindPathModal
        open={findPathOpen}
        onOpenChange={setFindPathOpen}
        nodes={nodes}
        startContactId={pathStartContactId}
        onPathFound={handlePathFound}
      />

      {/* Add Connection Modal */}
      <AddConnectionModal
        open={addConnectionOpen}
        onOpenChange={setAddConnectionOpen}
      />
    </div>
  );
}
