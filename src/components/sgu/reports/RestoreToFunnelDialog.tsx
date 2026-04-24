import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  STAGE_LABELS,
  type DealCategory,
  type DealStage,
} from '@/types/dealTeam';
import { useRestoreFromLost } from '@/hooks/useLostClients';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rowId: string;
  contactName: string;
  teamId: string;
}

const ACTIVE_STAGES: DealStage[] = ['prospect', 'lead', 'offering', 'client'];

const STAGE_TO_CATEGORIES: Record<DealStage, DealCategory[]> = {
  prospect: ['cold'],
  lead: ['hot', 'top', '10x', 'cold'],
  offering: ['offering'],
  client: ['client'],
  lost: [],
};

const CATEGORY_LABELS: Record<DealCategory, string> = {
  hot: '🔥 HOT',
  top: '⭐ TOP',
  '10x': '🔄 10x',
  cold: '❄️ COLD',
  lead: 'Lead',
  offering: 'Ofertowanie',
  client: 'Klient',
  lost: 'Utracony',
  audit: 'Audyt',
};

export function RestoreToFunnelDialog({
  open,
  onOpenChange,
  rowId,
  contactName,
  teamId,
}: Props) {
  const [stage, setStage] = useState<DealStage>('lead');
  const [category, setCategory] = useState<DealCategory>('hot');
  const restore = useRestoreFromLost();

  useEffect(() => {
    const cats = STAGE_TO_CATEGORIES[stage];
    if (cats.length > 0 && !cats.includes(category)) {
      setCategory(cats[0]);
    }
  }, [stage, category]);

  const handleConfirm = () => {
    restore.mutate(
      { id: rowId, teamId, category },
      {
        onSuccess: () => {
          toast.success('Kontakt przywrócony do lejka');
          onOpenChange(false);
        },
        onError: (e: Error) => toast.error('Błąd', { description: e.message }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Przywróć do lejka — {contactName}</DialogTitle>
          <DialogDescription>
            Wybierz etap docelowy. Powód utraty zostanie wyczyszczony, a historia zachowana w
            audit logu.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Etap</Label>
            <Select value={stage} onValueChange={(v) => setStage(v as DealStage)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVE_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {STAGE_TO_CATEGORIES[stage].length > 1 && (
            <div className="space-y-2">
              <Label>Kategoria</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as DealCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGE_TO_CATEGORIES[stage].map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button onClick={handleConfirm} disabled={restore.isPending}>
            Przywróć do lejka
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}