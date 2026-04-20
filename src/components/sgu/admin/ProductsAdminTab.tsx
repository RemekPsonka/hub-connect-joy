import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProductCategoryManager } from '@/components/deals-team/ProductCategoryManager';
import {
  useProductCategories,
  useUpdateProductCategory,
  type SalesArea,
} from '@/hooks/useProductCategories';

interface ProductsAdminTabProps {
  teamId: string | null;
}

const SALES_AREA_OPTIONS: { value: SalesArea; label: string }[] = [
  { value: 'property', label: 'Majątek' },
  { value: 'financial', label: 'Finanse' },
  { value: 'communication', label: 'Komunikacja' },
  { value: 'life_group', label: 'Życie / Grupowe' },
];

const UNSET = '__unset__';

function SalesAreaMappingTable({ teamId }: { teamId: string }) {
  const { data: categories = [], isLoading } = useProductCategories(teamId);
  const update = useUpdateProductCategory();

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        Najpierw dodaj grupy produktów powyżej.
      </p>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th className="text-left px-3 py-2 font-medium">Produkt</th>
            <th className="text-left px-3 py-2 font-medium w-64">Obszar sprzedaży</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => (
            <tr key={cat.id} className="border-t">
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span>{cat.name}</span>
                </div>
              </td>
              <td className="px-3 py-2">
                <Select
                  value={cat.sales_area ?? UNSET}
                  onValueChange={(v) =>
                    update.mutate({
                      id: cat.id,
                      teamId,
                      salesArea: v === UNSET ? null : (v as SalesArea),
                    })
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="— wybierz obszar —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNSET}>— brak —</SelectItem>
                    {SALES_AREA_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProductsAdminTab({ teamId }: ProductsAdminTabProps) {
  if (!teamId) {
    return (
      <Alert>
        <AlertDescription>Brak skonfigurowanego zespołu SGU.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <ProductCategoryManager teamId={teamId} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mapowanie produktu do obszaru sprzedaży</CardTitle>
          <p className="text-sm text-muted-foreground">
            Przypisz każdą grupę produktów do jednego z czterech obszarów kompleksowości klienta.
          </p>
        </CardHeader>
        <CardContent>
          <SalesAreaMappingTable teamId={teamId} />
        </CardContent>
      </Card>
    </div>
  );
}
