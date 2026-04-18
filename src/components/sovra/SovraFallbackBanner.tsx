import { AlertTriangle, RotateCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SovraFallbackBannerProps {
  onRetry?: () => void;
  onDismiss: () => void;
}

/**
 * Sprint 06 — pokazywany gdy Sovra zwróciła 503/504/network error.
 */
export function SovraFallbackBanner({ onRetry, onDismiss }: SovraFallbackBannerProps) {
  return (
    <div className="mx-4 mt-3 flex items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <div className="flex-1">
        <span className="font-medium">Sovra chwilowo niedostępna.</span>{' '}
        <span className="text-destructive/80">Spróbuj za moment.</span>
      </div>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry} className="h-7 gap-1.5">
          <RotateCw className="h-3.5 w-3.5" />
          Ponów
        </Button>
      )}
      <Button size="icon" variant="ghost" onClick={onDismiss} className="h-7 w-7">
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
