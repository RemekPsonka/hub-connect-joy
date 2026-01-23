import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle2, 
  XCircle, 
  Building2, 
  AlertTriangle,
  Loader2,
  Search
} from 'lucide-react';

export interface CompanyCandidate {
  official_name?: string;
  krs?: string;
  nip?: string;
  regon?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  legal_form?: string;
  status?: string;
  registration_date?: string;
  management?: Array<{ name: string; position: string }>;
  source: 'krs_api' | 'ceidg_api' | 'perplexity_only';
  confidence?: 'verified' | 'high' | 'medium' | 'low';
}

interface ConfirmCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: CompanyCandidate | null;
  companyName: string;
  onConfirm: (krs?: string, nip?: string) => void;
  onReject: () => void;
  isLoading?: boolean;
}

function getSourceBadge(source: string, confidence?: string) {
  switch (source) {
    case 'krs_api':
      return <Badge className="bg-green-500">KRS API ✓</Badge>;
    case 'ceidg_api':
      return <Badge className="bg-blue-500">CEIDG API ✓</Badge>;
    case 'perplexity_only':
      return <Badge variant="secondary" className="bg-yellow-500 text-yellow-900">Perplexity (niepewne)</Badge>;
    default:
      return <Badge variant="outline">Nieznane źródło</Badge>;
  }
}

function getLegalFormLabel(form?: string): string {
  const forms: Record<string, string> = {
    'sp_z_oo': 'Spółka z o.o.',
    'sa': 'Spółka Akcyjna',
    'sp_j': 'Spółka Jawna',
    'sp_k': 'Spółka Komandytowa',
    'psa': 'Prosta Spółka Akcyjna',
    'jednoosobowa_dzialalnosc': 'JDG',
  };
  return forms[form || ''] || form || '';
}

export function ConfirmCompanyModal({
  isOpen,
  onClose,
  candidate,
  companyName,
  onConfirm,
  onReject,
  isLoading
}: ConfirmCompanyModalProps) {
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualKrs, setManualKrs] = useState('');
  const [manualNip, setManualNip] = useState('');

  const handleConfirm = () => {
    onConfirm(candidate?.krs, candidate?.nip);
  };

  const handleManualSubmit = () => {
    if (manualKrs || manualNip) {
      onConfirm(manualKrs || undefined, manualNip || undefined);
    }
  };

  const handleReject = () => {
    setShowManualInput(true);
  };

  const handleClose = () => {
    setShowManualInput(false);
    setManualKrs('');
    setManualNip('');
    onClose();
  };

  if (!candidate) return null;

  const isVerified = candidate.source === 'krs_api' || candidate.source === 'ceidg_api';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Czy to właściwa firma?
          </DialogTitle>
          <DialogDescription>
            Szukana firma: <strong>{companyName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Source badge */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Źródło danych:</span>
            {getSourceBadge(candidate.source, candidate.confidence)}
          </div>

          <Separator />

          {/* Company details */}
          <div className="space-y-3 bg-muted/50 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <span className="text-sm font-medium text-muted-foreground min-w-24">Nazwa:</span>
              <span className="font-medium">{candidate.official_name || companyName}</span>
            </div>

            {candidate.krs && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground min-w-24">KRS:</span>
                <span className="font-mono">{candidate.krs}</span>
                {isVerified && <CheckCircle2 className="h-4 w-4 text-green-500" />}
              </div>
            )}

            {candidate.nip && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground min-w-24">NIP:</span>
                <span className="font-mono">{candidate.nip}</span>
                {isVerified && <CheckCircle2 className="h-4 w-4 text-green-500" />}
              </div>
            )}

            {candidate.regon && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground min-w-24">REGON:</span>
                <span className="font-mono">{candidate.regon}</span>
              </div>
            )}

            {candidate.legal_form && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground min-w-24">Forma:</span>
                <span>{getLegalFormLabel(candidate.legal_form)}</span>
              </div>
            )}

            {(candidate.address || candidate.city) && (
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium text-muted-foreground min-w-24">Adres:</span>
                <span className="text-sm">
                  {[candidate.address, candidate.postal_code, candidate.city].filter(Boolean).join(', ')}
                </span>
              </div>
            )}

            {candidate.management && candidate.management.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium text-muted-foreground min-w-24">Zarząd:</span>
                <div className="text-sm space-y-0.5">
                  {candidate.management.slice(0, 3).map((m, i) => (
                    <div key={i}>{m.name} <span className="text-muted-foreground">({m.position})</span></div>
                  ))}
                  {candidate.management.length > 3 && (
                    <div className="text-muted-foreground">+{candidate.management.length - 3} więcej...</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Warning for perplexity-only source */}
          {candidate.source === 'perplexity_only' && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">Dane wymagają weryfikacji</p>
                <p className="text-yellow-700 dark:text-yellow-300">
                  Nie znaleziono firmy w oficjalnych rejestrach KRS/CEIDG. 
                  Upewnij się, że to prawidłowa firma przed akceptacją.
                </p>
              </div>
            </div>
          )}

          {/* Manual input section */}
          {showManualInput && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="text-sm font-medium">Podaj dane właściwej firmy:</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="manual-krs" className="text-xs text-muted-foreground">KRS (10 cyfr)</Label>
                    <Input
                      id="manual-krs"
                      placeholder="0000123456"
                      value={manualKrs}
                      onChange={(e) => setManualKrs(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="manual-nip" className="text-xs text-muted-foreground">NIP (10 cyfr)</Label>
                    <Input
                      id="manual-nip"
                      placeholder="1234567890"
                      value={manualNip}
                      onChange={(e) => setManualNip(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="font-mono"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleManualSubmit}
                  disabled={(!manualKrs && !manualNip) || isLoading}
                  className="w-full"
                  variant="secondary"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Pobierz dane z rejestru
                </Button>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {!showManualInput && (
            <>
              <Button
                variant="outline"
                onClick={handleReject}
                disabled={isLoading}
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                To inna firma
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Tak, to ta firma
              </Button>
            </>
          )}
          {showManualInput && (
            <Button
              variant="ghost"
              onClick={() => setShowManualInput(false)}
              disabled={isLoading}
            >
              Wróć
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
