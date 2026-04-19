import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { generateSGUReportPDF, buildSGUReportFilename } from '@/lib/pdf/sgu-report-pdf';
import type { SGUReportSnapshot } from '@/types/sgu-report-snapshot';

interface ExportPDFButtonProps {
  snapshot: SGUReportSnapshot;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default';
}

export function ExportPDFButton({ snapshot, variant = 'outline', size = 'sm' }: ExportPDFButtonProps) {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    setBusy(true);
    try {
      const blob = generateSGUReportPDF(snapshot);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = buildSGUReportFilename(snapshot);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('PDF pobrany');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Nie udało się wygenerować PDF';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button onClick={handleClick} variant={variant} size={size} disabled={busy}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      <span className="ml-2">PDF</span>
    </Button>
  );
}
