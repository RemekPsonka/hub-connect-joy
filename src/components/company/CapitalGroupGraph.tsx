import { useNavigate } from 'react-router-dom';
import { Building2, ArrowDown, Crown, GitBranch, Link2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { CapitalGroupMember } from '@/hooks/useCapitalGroupMembers';

interface CapitalGroupGraphProps {
  members: CapitalGroupMember[];
  currentCompany: {
    id: string;
    name: string;
    logo_url?: string | null;
  };
}

function formatRevenue(amount: number | null | undefined): string {
  if (!amount) return '';
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(2)} mld PLN`;
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)} mln PLN`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)} tys. PLN`;
  }
  return `${amount} PLN`;
}

interface CompanyNodeProps {
  name: string;
  variant: 'parent' | 'current' | 'subsidiary' | 'affiliate' | 'branch';
  ownershipPercent?: number | null;
  revenue?: number | null;
  isLinked?: boolean;
  companyId?: string | null;
  krsVerified?: boolean;
  onClick?: () => void;
}

function CompanyNode({ 
  name, 
  variant, 
  ownershipPercent, 
  revenue, 
  isLinked, 
  companyId,
  krsVerified,
  onClick 
}: CompanyNodeProps) {
  const navigate = useNavigate();
  
  const variantStyles = {
    parent: 'border-amber-500 bg-amber-50 dark:bg-amber-950/30',
    current: 'border-primary bg-primary/10 ring-2 ring-primary',
    subsidiary: 'border-blue-500 bg-blue-50 dark:bg-blue-950/30',
    affiliate: 'border-muted-foreground/50 bg-muted/50',
    branch: 'border-green-500 bg-green-50 dark:bg-green-950/30'
  };
  
  const variantIcons = {
    parent: <Crown className="h-4 w-4 text-amber-600" />,
    current: <Building2 className="h-4 w-4 text-primary" />,
    subsidiary: <GitBranch className="h-4 w-4 text-blue-600" />,
    affiliate: <Link2 className="h-4 w-4 text-muted-foreground" />,
    branch: <GitBranch className="h-4 w-4 text-green-600" />
  };
  
  const handleClick = () => {
    if (companyId) {
      navigate(`/contacts/company/${companyId}`);
    } else if (onClick) {
      onClick();
    }
  };
  
  return (
    <Card 
      className={cn(
        "p-3 min-w-[160px] max-w-[200px] border-2 transition-all cursor-pointer hover:shadow-md",
        variantStyles[variant],
        companyId && "hover:ring-2 hover:ring-primary/50"
      )}
      onClick={handleClick}
    >
      <div className="flex items-start gap-2">
        {variantIcons[variant]}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm leading-tight truncate" title={name}>
            {name}
          </p>
          <div className="flex flex-wrap gap-1 mt-1">
            {ownershipPercent && (
              <Badge variant="secondary" className="text-[10px] px-1 py-0">
                {ownershipPercent}%
              </Badge>
            )}
            {revenue && (
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                {formatRevenue(revenue)}
              </Badge>
            )}
            {krsVerified && (
              <Badge variant="default" className="text-[10px] px-1 py-0 bg-green-600">
                KRS
              </Badge>
            )}
          </div>
          {isLinked && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Powiązana w bazie
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

export function CapitalGroupGraph({ members, currentCompany }: CapitalGroupGraphProps) {
  const parents = members.filter(m => m.relationship_type === 'parent');
  const subsidiaries = members.filter(m => m.relationship_type === 'subsidiary');
  const affiliates = members.filter(m => m.relationship_type === 'affiliate');
  const branches = members.filter(m => m.relationship_type === 'branch');
  
  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Building2 className="h-12 w-12 mb-4 opacity-50" />
        <p>Brak zdefiniowanych powiązań kapitałowych</p>
      </div>
    );
  }
  
  return (
    <div className="relative py-6 space-y-6">
      {/* Parent companies - górny rząd */}
      {parents.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground text-center font-medium uppercase tracking-wide">
            Spółki nadrzędne
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            {parents.map(p => (
              <CompanyNode
                key={p.id}
                name={p.external_name}
                variant="parent"
                ownershipPercent={p.ownership_percent}
                revenue={p.member_company?.revenue_amount || p.revenue_amount}
                isLinked={!!p.member_company_id}
                companyId={p.member_company_id}
                krsVerified={p.krs_verified}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Arrow down */}
      {parents.length > 0 && (
        <div className="flex justify-center">
          <ArrowDown className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      
      {/* Current company - centrum */}
      <div className="flex justify-center">
        <CompanyNode
          name={currentCompany.name}
          variant="current"
        />
      </div>
      
      {/* Arrow down to subsidiaries */}
      {(subsidiaries.length > 0 || affiliates.length > 0) && (
        <div className="flex justify-center">
          <ArrowDown className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      
      {/* Subsidiaries - spółki zależne */}
      {subsidiaries.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground text-center font-medium uppercase tracking-wide">
            Spółki zależne
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            {subsidiaries.map(s => (
              <CompanyNode
                key={s.id}
                name={s.external_name}
                variant="subsidiary"
                ownershipPercent={s.ownership_percent}
                revenue={s.member_company?.revenue_amount || s.revenue_amount}
                isLinked={!!s.member_company_id}
                companyId={s.member_company_id}
                krsVerified={s.krs_verified}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Affiliates - spółki stowarzyszone */}
      {affiliates.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground text-center font-medium uppercase tracking-wide">
            Spółki stowarzyszone
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            {affiliates.map(a => (
              <CompanyNode
                key={a.id}
                name={a.external_name}
                variant="affiliate"
                ownershipPercent={a.ownership_percent}
                revenue={a.member_company?.revenue_amount || a.revenue_amount}
                isLinked={!!a.member_company_id}
                companyId={a.member_company_id}
                krsVerified={a.krs_verified}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Branches - oddziały */}
      {branches.length > 0 && (
        <div className="space-y-2 pt-4 border-t border-dashed">
          <p className="text-xs text-muted-foreground text-center font-medium uppercase tracking-wide">
            Oddziały ({branches.length})
          </p>
          <div className="flex justify-center gap-2 flex-wrap max-h-40 overflow-y-auto">
            {branches.slice(0, 10).map(b => (
              <Badge key={b.id} variant="outline" className="text-xs">
                {b.external_name}
              </Badge>
            ))}
            {branches.length > 10 && (
              <Badge variant="secondary" className="text-xs">
                +{branches.length - 10} więcej
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
