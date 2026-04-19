import { CheckCircle2, AlertCircle, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { CaseDPreviewTable } from '@/components/sgu/CaseDPreviewTable';
import { useCaseDStatus } from '@/hooks/useCaseDStatus';

export default function SGUCaseD() {
  const { data: status, isLoading, confirmMutation } = useCaseDStatus();
  const isConfirmed = status?.case_d_confirmed ?? false;

  return (
    <div className="container mx-auto py-6 max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-6 w-6" /> Case D — rep + handling
          </h1>
          <p className="text-muted-foreground mt-1">
            Algorytm prowizji v2 dla polis z aktywnym przedstawicielem (rep) ORAZ handlingiem.
          </p>
        </div>
        {isConfirmed ? (
          <Badge className="gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Aktywny</Badge>
        ) : (
          <Badge variant="destructive" className="gap-1.5"><AlertCircle className="h-3.5 w-3.5" /> Oczekuje</Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="h-12 bg-muted animate-pulse rounded" />
          ) : isConfirmed ? (
            <div className="text-sm space-y-1">
              <p>
                <strong>Aktywowany:</strong>{' '}
                {status?.case_d_confirmed_at
                  ? new Date(status.case_d_confirmed_at).toLocaleString('pl-PL')
                  : '—'}
              </p>
              <p className="text-muted-foreground">
                Trigger `tr_calculate_commission_entries_for_payment` używa algorytmu v2-case-d
                dla polis z `has_handling=true AND representative_user_id IS NOT NULL`.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm">
                Bez potwierdzenia każda próba oznaczenia raty (dla polisy spełniającej warunki Case D) zakończy się
                błędem fail-fast: <code className="text-xs bg-muted px-1 rounded">[SGU commission] Edge Case D — awaiting Remek confirmation</code>.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button>Potwierdzam aktywację Case D</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Aktywować Case D?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Po potwierdzeniu wszystkie nowe płatności polis z rep + handling będą rozliczane algorytmem v2.
                      Operacja nie wpływa na istniejące wpisy commission_entries (algorithm_version='v1').
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Anuluj</AlertDialogCancel>
                    <AlertDialogAction onClick={() => confirmMutation.mutate()}>
                      Tak, aktywuj
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Podgląd kalkulacji</CardTitle>
        </CardHeader>
        <CardContent>
          <CaseDPreviewTable />
        </CardContent>
      </Card>
    </div>
  );
}
