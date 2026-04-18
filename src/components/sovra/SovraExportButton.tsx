import { FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * Sprint 06 — stub. Pełna implementacja w Sprincie 11 (Workspace).
 */
export function SovraExportButton({ disabled }: { disabled?: boolean }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={disabled}
      onClick={() => toast.info('Eksport do notatki będzie dostępny po Sprincie 11 (Workspace).')}
      className="gap-1.5 text-xs text-muted-foreground"
    >
      <FileDown className="h-3.5 w-3.5" />
      Eksportuj do notatki
    </Button>
  );
}
