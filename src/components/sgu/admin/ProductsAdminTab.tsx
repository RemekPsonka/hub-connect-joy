import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProductCategoryManager } from '@/components/deals-team/ProductCategoryManager';

interface ProductsAdminTabProps {
  teamId: string | null;
}

export function ProductsAdminTab({ teamId }: ProductsAdminTabProps) {
  if (!teamId) {
    return <Alert><AlertDescription>Brak skonfigurowanego zespołu SGU.</AlertDescription></Alert>;
  }
  return <ProductCategoryManager teamId={teamId} />;
}
