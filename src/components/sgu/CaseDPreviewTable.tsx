import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Row {
  recipient: string;
  role: string;
  share_pct: number;
  amount_pln: number;
}

function calculateCaseD(amountPln: number, ratePct: number): { rows: Row[]; basePln: number; sumPln: number } {
  const baseGr = Math.round(amountPln * ratePct);
  const repGr = Math.round((baseGr * 10) / 100);
  const afterRepGr = baseGr - repGr;
  const handlingGr = Math.round((afterRepGr * 10) / 100);
  const remainingGr = afterRepGr - handlingGr;
  const sguGr = Math.round((remainingGr * 30) / 100);
  const adamGr = Math.round((remainingGr * 35) / 100);
  const pawelGr = Math.round((remainingGr * 17.5) / 100);
  let remekGr = remainingGr - sguGr - adamGr - pawelGr;

  // Korekta zaokrąglenia → SGU
  let sguAdjusted = sguGr;
  const sumGr = repGr + handlingGr + sguGr + adamGr + pawelGr + remekGr;
  const diff = baseGr - sumGr;
  if (diff !== 0) sguAdjusted = sguGr + diff;

  const toRow = (recipient: string, role: string, pct: number, gr: number): Row => ({
    recipient,
    role,
    share_pct: pct,
    amount_pln: gr / 100,
  });

  return {
    basePln: baseGr / 100,
    sumPln: (repGr + handlingGr + sguAdjusted + adamGr + pawelGr + remekGr) / 100,
    rows: [
      toRow('Rep (przedstawiciel)', 'representative', 10, repGr),
      toRow('Handling', 'handling', 9, handlingGr),
      toRow('SGU', 'sgu_company', 24.3, sguAdjusted),
      toRow('Adam', 'partner', 28.35, adamGr),
      toRow('Paweł', 'partner', 14.175, pawelGr),
      toRow('Remek', 'director', 14.175, remekGr),
    ],
  };
}

export function CaseDPreviewTable() {
  const [amountPln, setAmountPln] = useState(1000);
  const [ratePct, setRatePct] = useState(20);

  const calc = useMemo(() => calculateCaseD(amountPln, ratePct), [amountPln, ratePct]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 max-w-md">
        <div>
          <Label htmlFor="amt">Rata (PLN)</Label>
          <Input
            id="amt"
            type="number"
            value={amountPln}
            onChange={(e) => setAmountPln(Number(e.target.value) || 0)}
            min={0}
          />
        </div>
        <div>
          <Label htmlFor="rate">Stawka prowizji (%)</Label>
          <Input
            id="rate"
            type="number"
            value={ratePct}
            onChange={(e) => setRatePct(Number(e.target.value) || 0)}
            min={0}
            max={100}
            step={0.5}
          />
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Baza prowizji: <strong className="text-foreground">{calc.basePln.toFixed(2)} PLN</strong>{' '}
        ({amountPln} × {ratePct}%)
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Odbiorca</TableHead>
            <TableHead>Rola</TableHead>
            <TableHead className="text-right">Udział %</TableHead>
            <TableHead className="text-right">Kwota PLN</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {calc.rows.map((r) => (
            <TableRow key={r.recipient}>
              <TableCell className="font-medium">{r.recipient}</TableCell>
              <TableCell className="text-muted-foreground text-xs">{r.role}</TableCell>
              <TableCell className="text-right tabular-nums">{r.share_pct.toFixed(3)}%</TableCell>
              <TableCell className="text-right tabular-nums">{r.amount_pln.toFixed(2)}</TableCell>
            </TableRow>
          ))}
          <TableRow className="border-t-2">
            <TableCell colSpan={2} className="font-semibold">Suma</TableCell>
            <TableCell className="text-right tabular-nums font-semibold">100%</TableCell>
            <TableCell className="text-right tabular-nums font-semibold">{calc.sumPln.toFixed(2)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <p className="text-xs text-muted-foreground">
        Algorytm: Rep 10% bazy → Handling 10% z (base − rep) → pozostałe 90% × baseline (SGU 30 / Adam 35 / Paweł 17.5 / Remek 17.5).
        Korekta zaokrąglenia trafia do SGU.
      </p>
    </div>
  );
}
