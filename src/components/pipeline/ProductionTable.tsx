import { useState } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProductionRecords, ProductionRecord } from '@/hooks/useProductionRecords';
import { usePipelineKPI } from '@/hooks/usePipelineKPI';
import { cn } from '@/lib/utils';
import { AddProductionRecordModal } from './AddProductionRecordModal';

const MONTH_NAMES = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
];

interface ProductionTableProps {
  year: number;
}

export function ProductionTable({ year }: ProductionTableProps) {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const { monthlyTotals, records, createRecord, deleteRecord } = useProductionRecords(year);
  const { yearlyTarget, monthlyTargets } = usePipelineKPI(year);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDelta = (actual: number, plan: number) => {
    const delta = actual - plan;
    if (delta === 0) return '-';
    const prefix = delta > 0 ? '+' : '';
    return `${prefix}${formatCurrency(delta)}`;
  };

  const getDeltaClass = (actual: number, plan: number) => {
    if (plan === 0) return '';
    const delta = actual - plan;
    if (delta > 0) return 'text-green-600';
    if (delta < 0) return 'text-red-600';
    return '';
  };

  const handleAddRecord = (month: number) => {
    setSelectedMonth(month);
    setAddModalOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Produkcja miesięczna {year}</CardTitle>
            <Button size="sm" onClick={() => handleAddRecord(new Date().getMonth() + 1)}>
              <Plus className="h-4 w-4 mr-1" />
              Dodaj
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Miesiąc</TableHead>
                  <TableHead className="text-right">Plan składki</TableHead>
                  <TableHead className="text-right">Składka realna</TableHead>
                  <TableHead className="text-right">Δ</TableHead>
                  <TableHead className="text-right">Prowizja</TableHead>
                  <TableHead className="text-center w-24">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyTotals.map((mt) => {
                  const monthTarget = monthlyTargets.find(t => t.month === mt.month);
                  const planPremium = monthTarget?.target_premium || (yearlyTarget?.target_premium || 0) / 12;
                  const hasData = mt.actualPremium > 0 || mt.actualCommission > 0;

                  return (
                    <TableRow
                      key={mt.month}
                      className={cn(
                        !hasData && 'text-muted-foreground',
                        hasData && 'font-medium'
                      )}
                    >
                      <TableCell>{MONTH_NAMES[mt.month - 1]}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(planPremium)}
                      </TableCell>
                      <TableCell className="text-right">
                        {hasData ? formatCurrency(mt.actualPremium) : '-'}
                      </TableCell>
                      <TableCell className={cn('text-right', getDeltaClass(mt.actualPremium, planPremium))}>
                        {hasData ? formatDelta(mt.actualPremium, planPremium) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {hasData ? formatCurrency(mt.actualCommission) : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleAddRecord(mt.month)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AddProductionRecordModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        year={year}
        month={selectedMonth || new Date().getMonth() + 1}
        onSubmit={(data) => {
          createRecord.mutate(data, {
            onSuccess: () => setAddModalOpen(false),
          });
        }}
        isLoading={createRecord.isPending}
      />
    </>
  );
}
