import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Globe,
  Hash,
  AlertTriangle,
  Database,
  Search,
  DollarSign,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface FullAnalysisConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  krs?: string | null;
  nip?: string | null;
  website?: string | null;
  onConfirm: () => void;
  isLoading?: boolean;
}

const stages = [
  { icon: Database, label: 'Weryfikacja w KRS/CEIDG', time: '~10s' },
  { icon: Globe, label: 'Skanowanie strony WWW', time: '~30s' },
  { icon: Search, label: 'Analiza zewnętrzna (Perplexity)', time: '~20s' },
  { icon: DollarSign, label: 'Pobieranie danych finansowych', time: '~15s' },
  { icon: Sparkles, label: 'Synteza profilu firmy AI', time: '~10s' },
];

export function FullAnalysisConfirmModal({
  isOpen,
  onClose,
  companyName,
  krs,
  nip,
  website,
  onConfirm,
  isLoading,
}: FullAnalysisConfirmModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Pełna Analiza Firmy AI
          </DialogTitle>
          <DialogDescription>
            Potwierdź dane przed rozpoczęciem automatycznej analizy
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Company info */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Nazwa firmy</p>
                <p className="font-medium">{companyName}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">KRS / NIP</p>
                {krs || nip ? (
                  <div className="flex items-center gap-2">
                    {krs && <Badge variant="outline">KRS: {krs}</Badge>}
                    {nip && <Badge variant="outline">NIP: {nip}</Badge>}
                  </div>
                ) : (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Zostanie wykryte automatycznie
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Strona WWW</p>
                {website ? (
                  <a 
                    href={website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    {website}
                  </a>
                ) : (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Brak - etap WWW zostanie pominięty
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Process stages */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <p className="text-sm font-medium">Proces uruchomi 5 etapów:</p>
            </div>
            <div className="space-y-2">
              {stages.map((stage, index) => {
                const Icon = stage.icon;
                return (
                  <div key={index} className="flex items-center gap-3 text-sm">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-xs font-medium">
                      {index + 1}
                    </span>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1">{stage.label}</span>
                    <span className="text-xs text-muted-foreground">{stage.time}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Szacowany czas:</span>
              <Badge variant="secondary">~1-2 minuty</Badge>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Anuluj
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            <Sparkles className="h-4 w-4 mr-2" />
            Rozpocznij analizę
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
