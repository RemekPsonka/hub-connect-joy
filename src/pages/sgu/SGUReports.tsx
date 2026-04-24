import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Eye, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useSGUReports } from '@/hooks/useSGUReports';
import { GenerateSnapshotDialog } from '@/components/sgu/GenerateSnapshotDialog';
import { ReportPreview } from '@/components/sgu/ReportPreview';
import { ExportPDFButton } from '@/components/sgu/ExportPDFButton';
import { FunnelKpiCard } from '@/components/sgu/reports/FunnelKpiCard';
import {
  PERIOD_TYPE_LABELS,
  type SGUPeriodType,
} from '@/types/sgu-report-snapshot';

const TABS: SGUPeriodType[] = ['weekly', 'monthly', 'quarterly', 'yearly', 'custom'];

interface SGUReportsProps {
  period?: SGUPeriodType;
}

function ReportsTable({ periodType, onOpen }: { periodType: SGUPeriodType; onOpen: (id: string) => void }) {
  const { data, isLoading } = useSGUReports(periodType);

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Brak raportów dla tego okresu. Wygeneruj pierwszy snapshot.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Okres</TableHead>
          <TableHead>Wygenerowano</TableHead>
          <TableHead>Tryb</TableHead>
          <TableHead className="text-right">Akcje</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={row.id} className="cursor-pointer" onClick={() => onOpen(row.id)}>
            <TableCell className="font-medium">
              {row.period_start} → {row.period_end}
            </TableCell>
            <TableCell>{new Date(row.generated_at).toLocaleString('pl-PL')}</TableCell>
            <TableCell>
              <Badge variant={row.generated_by === 'cron' ? 'secondary' : 'outline'}>
                {row.generated_by === 'cron' ? 'auto' : 'ręcznie'}
              </Badge>
            </TableCell>
            <TableCell className="text-right space-x-2" onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" onClick={() => onOpen(row.id)}>
                <Eye className="h-4 w-4" />
              </Button>
              <ExportPDFButton snapshot={row} variant="ghost" size="sm" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function SGUReports({ period }: SGUReportsProps = {}) {
  const params = useParams<{ period?: string }>();
  const initial = (period ?? (params.period as SGUPeriodType) ?? 'monthly') as SGUPeriodType;
  const [activeTab, setActiveTab] = useState<SGUPeriodType>(
    TABS.includes(initial) ? initial : 'monthly',
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Raporty SGU</h1>
          <p className="text-sm text-muted-foreground">
            Snapshoty KPI, top produktów, wyników zespołu i podziału prowizji.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Generuj teraz
        </Button>
      </div>

      <FunnelKpiCard />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lista raportów</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SGUPeriodType)}>
            <TabsList>
              {TABS.map((t) => (
                <TabsTrigger key={t} value={t}>
                  {PERIOD_TYPE_LABELS[t]}
                </TabsTrigger>
              ))}
            </TabsList>
            {TABS.map((t) => (
              <TabsContent key={t} value={t} className="mt-4">
                <ReportsTable periodType={t} onOpen={setSelectedId} />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <GenerateSnapshotDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultPeriodType={activeTab}
      />

      <Sheet open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Podgląd raportu</SheetTitle>
          </SheetHeader>
          {selectedId && <ReportPreview snapshotId={selectedId} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}
