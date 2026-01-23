import { Save, Sparkles, History, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { BusinessInterview, BIValidationResult } from './types';

interface BIActionBarProps {
  biData: BusinessInterview | null;
  validation: BIValidationResult;
  isSaving: boolean;
  isProcessingAI: boolean;
  onSave: () => void;
  onSaveAndClose: () => void;
  onProcessAI: () => void;
  onShowHistory: () => void;
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Szkic', variant: 'secondary' },
  completed: { label: 'Zapisany', variant: 'default' },
  ai_processed: { label: 'AI przetworzony', variant: 'outline' },
  approved: { label: 'Zatwierdzony', variant: 'default' },
};

export function BIActionBar({
  biData,
  validation,
  isSaving,
  isProcessingAI,
  onSave,
  onSaveAndClose,
  onProcessAI,
  onShowHistory,
}: BIActionBarProps) {
  const status = biData?.status || 'draft';
  const statusConfig = statusLabels[status] || statusLabels.draft;

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b pb-4 mb-6">
      <div className="flex items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Business Interview</h2>
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          {biData?.version && biData.version > 1 && (
            <Badge variant="outline" className="text-xs">
              v{biData.version}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* History Button */}
          {biData?.id && (
            <Button variant="ghost" size="sm" onClick={onShowHistory}>
              <History className="h-4 w-4 mr-1" />
              Historia
            </Button>
          )}

          {/* Save Button */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Zapisz
          </Button>

          {/* Save and Close Button */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onSaveAndClose}
            disabled={isSaving}
          >
            Zapisz i zamknij
          </Button>

          {/* Process AI Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button 
                  size="sm" 
                  onClick={onProcessAI}
                  disabled={!validation.valid || isProcessingAI || !biData?.id}
                  className="gap-1"
                >
                  {isProcessingAI ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Opracuj AI
                </Button>
              </span>
            </TooltipTrigger>
            {!validation.valid && (
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Uzupełnij wymagane pola:</p>
                    <ul className="text-xs mt-1 space-y-0.5">
                      {validation.missing.map((field, i) => (
                        <li key={i}>• {field}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
