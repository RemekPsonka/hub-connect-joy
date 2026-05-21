import { useGetCompanyHolding, type HoldingTreeNode } from '@/hooks/useRozliczenia';
import { formatCurrency } from '@/lib/formatCurrency';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Network } from 'lucide-react';

interface Props {
  rootCompanyId: string;
  currentCompanyId: string;
}

function indent(depth: number) {
  return { paddingLeft: `${depth * 16}px` };
}

export function HoldingTree({ rootCompanyId, currentCompanyId }: Props) {
  const { data, isLoading } = useGetCompanyHolding(rootCompanyId);

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!data || data.length === 0) return null;
  if (data.length === 1) {
    return (
      <div className="text-xs text-muted-foreground italic">
        Ta firma nie należy do struktury holdingowej.
      </div>
    );
  }

  return (
    <div className="rounded-lg border divide-y">
      <div className="px-3 py-2 flex items-center gap-2 bg-muted/30">
        <Network className="h-4 w-4" />
        <span className="text-sm font-medium">Drzewo holdingowe ({data.length} firm)</span>
      </div>
      {data.map((node: HoldingTreeNode) => {
        const isCurrent = node.company_id === currentCompanyId;
        return (
          <div
            key={node.company_id}
            className={`px-3 py-2 text-sm grid grid-cols-[1fr,80px,120px,120px] gap-2 items-center ${
              isCurrent ? 'bg-primary/10' : ''
            }`}
          >
            <div style={indent(node.depth)} className="flex items-center gap-2 min-w-0">
              <Link
                to={`/sgu/rozliczenia/klienci/${node.company_id}`}
                className="truncate hover:underline"
              >
                {node.name}
              </Link>
              {isCurrent && <Badge variant="secondary" className="text-[10px]">tutaj</Badge>}
            </div>
            <div className="text-xs text-muted-foreground">{node.nip ?? '—'}</div>
            <div className="text-xs tabular-nums text-right">
              <span className="text-muted-foreground">polis:</span> {node.total_policies}
            </div>
            <div className="text-xs tabular-nums text-right">{formatCurrency(node.total_premium_ytd)}</div>
          </div>
        );
      })}
    </div>
  );
}
