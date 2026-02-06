import { DealProductsCard } from './DealProductsCard';

interface DealProductsProps {
  dealId: string;
  currency: string;
  onValueChange?: (total: number) => void;
}

export function DealProducts({ dealId, currency, onValueChange }: DealProductsProps) {
  return (
    <DealProductsCard
      dealId={dealId}
      currency={currency}
      onValueChange={onValueChange}
    />
  );
}
