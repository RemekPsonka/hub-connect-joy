import { useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Pencil,
  X,
} from 'lucide-react';

export interface AnalysisOverrides {
  krs?: string;
  nip?: string;
  website?: string;
}

interface FullAnalysisConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  krs?: string | null;
  nip?: string | null;
  website?: string | null;
  onConfirm: (overrides?: AnalysisOverrides) => void;
  isLoading?: boolean;
  onEditCompany?: () => void;
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
  onEditCompany,
}: FullAnalysisConfirmModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editKrs, setEditKrs] = useState(krs || '');
  const [editNip, setEditNip] = useState(nip || '');
  const [editWebsite, setEditWebsite] = useState(website || '');

  // Reset state when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      setEditKrs(krs || '');
      setEditNip(nip || '');
      setEditWebsite(website || '');
      setIsEditing(false);
    }
  }, [isOpen, krs, nip, website]);

  const handleKrsChange = (value: string) => {
    // Only digits, max 10 chars
    setEditKrs(value.replace(/\D/g, '').slice(0, 10));
  };

  const handleNipChange = (value: string) => {
    // Only digits, max 10 chars
    setEditNip(value.replace(/\D/g, '').slice(0, 10));
  };

  const handleWebsiteChange = (value: string) => {
    setEditWebsite(value);
  };

  const handleConfirm = () => {
    const overrides: AnalysisOverrides = {};
    
    // Only include if different from original
    if (editKrs && editKrs !== krs) overrides.krs = editKrs;
    if (editNip && editNip !== nip) overrides.nip = editNip;
    if (editWebsite && editWebsite !== website) {
      // Auto-add https:// if missing
      let url = editWebsite.trim();
      if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      overrides.website = url;
    }
    
    onConfirm(Object.keys(overrides).length > 0 ? overrides : undefined);
  };

  const cancelEditing = () => {
    setEditKrs(krs || '');
    setEditNip(nip || '');
    setEditWebsite(website || '');
    setIsEditing(false);
  };

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
          <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
            {/* Company name */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Nazwa firmy</p>
                  <p className="font-medium">{companyName}</p>
                </div>
              </div>
              {onEditCompany && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onEditCompany}
                  className="text-xs"
                >
                  Zmień firmę
                </Button>
              )}
            </div>

            {/* KRS / NIP */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">KRS / NIP</p>
                    {!isEditing && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setIsEditing(true)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  
                  {isEditing ? (
                    <div className="flex gap-2 mt-1">
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">KRS</Label>
                        <Input
                          value={editKrs}
                          onChange={(e) => handleKrsChange(e.target.value)}
                          placeholder="0000000000"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">NIP</Label>
                        <Input
                          value={editNip}
                          onChange={(e) => handleNipChange(e.target.value)}
                          placeholder="0000000000"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      {(krs || nip || editKrs || editNip) ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          {(editKrs || krs) && (
                            <Badge variant="outline">KRS: {editKrs || krs}</Badge>
                          )}
                          {(editNip || nip) && (
                            <Badge variant="outline">NIP: {editNip || nip}</Badge>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-amber-600 dark:text-amber-400">
                          Zostanie wykryte automatycznie
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Website */}
            <div className="flex items-start gap-3">
              <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Strona WWW</p>
                  {!isEditing && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setIsEditing(true)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                
                {isEditing ? (
                  <div className="mt-1">
                    <Input
                      value={editWebsite}
                      onChange={(e) => handleWebsiteChange(e.target.value)}
                      placeholder="https://example.com"
                      className="h-8 text-sm"
                    />
                  </div>
                ) : (
                  <>
                    {(editWebsite || website) ? (
                      <a 
                        href={editWebsite || website || '#'} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        {editWebsite || website}
                      </a>
                    ) : (
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        Brak - etap WWW zostanie pominięty
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Cancel editing button */}
            {isEditing && (
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cancelEditing}
                  className="text-xs gap-1"
                >
                  <X className="h-3 w-3" />
                  Anuluj edycję
                </Button>
              </div>
            )}
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
          <Button onClick={handleConfirm} disabled={isLoading}>
            <Sparkles className="h-4 w-4 mr-2" />
            Rozpocznij analizę
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
