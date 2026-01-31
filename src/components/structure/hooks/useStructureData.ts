import { useMemo } from 'react';
import type { CapitalGroupMember } from '@/hooks/useCapitalGroupMembers';
import type { InsuranceStatus, ParentCompanyNodeData, SubsidiaryNodeData } from '../types';

interface Company {
  id: string;
  name: string;
  nip?: string | null;
  krs?: string | null;
  revenue_amount?: number | null;
  revenue_year?: number | null;
  logo_url?: string | null;
}

interface UseStructureDataProps {
  company: Company;
  members: CapitalGroupMember[];
  insuranceAssessments?: Map<string, InsuranceStatus>;
}

export function useStructureData({ company, members, insuranceAssessments }: UseStructureDataProps) {
  const { nodes, edges } = useMemo(() => {
    const resultNodes: any[] = [];
    const resultEdges: any[] = [];

    // Determine insurance status for parent company
    const parentInsuranceStatus: InsuranceStatus = 
      insuranceAssessments?.get(company.id) || 'unknown';

    // Create parent company node
    const parentNodeData: ParentCompanyNodeData = {
      label: company.name,
      nip: company.nip || undefined,
      krs: company.krs || undefined,
      revenue: company.revenue_amount || undefined,
      revenueYear: company.revenue_year || undefined,
      insuranceStatus: parentInsuranceStatus,
      companyId: company.id,
    };

    resultNodes.push({
      id: `parent-${company.id}`,
      type: 'parent',
      position: { x: 0, y: 0 },
      data: parentNodeData,
    });

    // Create subsidiary nodes from capital group members
    members.forEach((member, index) => {
      // Determine insurance status - use linked company if available
      const memberInsuranceStatus: InsuranceStatus = member.member_company_id
        ? (insuranceAssessments?.get(member.member_company_id) || 'unknown')
        : 'unknown';

      // Map relationship_type to role
      const roleMap: Record<string, 'subsidiary' | 'affiliate' | 'branch' | 'parent'> = {
        subsidiary: 'subsidiary',
        affiliate: 'affiliate',
        branch: 'branch',
        parent: 'parent',
      };

      const subsidiaryNodeData: SubsidiaryNodeData = {
        label: member.member_company?.name || member.external_name,
        role: roleMap[member.relationship_type] || 'subsidiary',
        ownershipPercent: member.ownership_percent || undefined,
        nip: member.external_nip || undefined,
        krs: member.external_krs || undefined,
        regon: member.external_regon || undefined,
        revenue: member.revenue_amount || member.member_company?.revenue_amount || undefined,
        revenueYear: member.revenue_year || member.member_company?.revenue_year || undefined,
        insuranceStatus: memberInsuranceStatus,
        linkedCompanyId: member.member_company_id || undefined,
        memberId: member.id,
      };

      const nodeId = `subsidiary-${member.id}`;
      
      resultNodes.push({
        id: nodeId,
        type: 'subsidiary',
        position: { x: (index % 3) * 220, y: Math.floor(index / 3) * 150 + 200 },
        data: subsidiaryNodeData,
      });

      // Create edge from parent to subsidiary
      resultEdges.push({
        id: `edge-${company.id}-${member.id}`,
        source: `parent-${company.id}`,
        target: nodeId,
        type: 'smoothstep',
        animated: member.relationship_type === 'affiliate',
        style: { 
          stroke: member.relationship_type === 'parent' ? '#8B5CF6' : '#94A3B8',
          strokeWidth: 2,
        },
      });
    });

    return { nodes: resultNodes, edges: resultEdges };
  }, [company, members, insuranceAssessments]);

  return { nodes, edges };
}
