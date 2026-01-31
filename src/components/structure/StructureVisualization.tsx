import { useMemo, useState } from 'react';
import { Loader2, Network, Plus } from 'lucide-react';
import { useCapitalGroupMembers } from '@/hooks/useCapitalGroupMembers';
import { StructureCanvas } from './StructureCanvas';
import { useStructureData } from './hooks/useStructureData';
import { useStructureLayout } from './hooks/useStructureLayout';
import { AddCapitalGroupMemberModal } from '@/components/company/AddCapitalGroupMemberModal';
import { Button } from '@/components/ui/button';
import type { InsuranceStatus } from './types';

interface Company {
  id: string;
  name: string;
  nip?: string | null;
  krs?: string | null;
  revenue_amount?: number | null;
  revenue_year?: number | null;
  logo_url?: string | null;
}

interface StructureVisualizationProps {
  company: Company;
}

export function StructureVisualization({ company }: StructureVisualizationProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { data: members = [], isLoading } = useCapitalGroupMembers(company.id);
  const { getLayoutedElements } = useStructureLayout();

  // TODO: In future, fetch insurance assessments from insurance_risk_assessments table
  // For now, we'll use a mock map
  const insuranceAssessments = useMemo(() => {
    return new Map<string, InsuranceStatus>();
  }, []);

  // Get initial nodes and edges from data
  const { nodes: dataNodes, edges: dataEdges } = useStructureData({
    company,
    members,
    insuranceAssessments,
  });

  // Apply initial layout
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    if (dataNodes.length === 0) return { nodes: [], edges: [] };
    return getLayoutedElements(dataNodes, dataEdges, { 
      direction: 'TB', 
      nodeSep: 80, 
      rankSep: 120 
    });
  }, [dataNodes, dataEdges, getLayoutedElements]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <Network className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">
          Brak struktury grupy kapitałowej
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mb-4">
          Dodaj spółki zależne, aby zobaczyć wizualizację struktury holdingowej.
        </p>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Dodaj spółkę do grupy
        </Button>
        
        <AddCapitalGroupMemberModal
          open={isAddModalOpen}
          onOpenChange={setIsAddModalOpen}
          parentCompanyId={company.id}
        />
      </div>
    );
  }

  return (
    <div className="h-[600px] w-full border rounded-lg overflow-hidden bg-background">
      <StructureCanvas
        initialNodes={layoutedNodes}
        initialEdges={layoutedEdges}
        onAddEntity={() => setIsAddModalOpen(true)}
      />
      
      <AddCapitalGroupMemberModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        parentCompanyId={company.id}
      />
    </div>
  );
}
