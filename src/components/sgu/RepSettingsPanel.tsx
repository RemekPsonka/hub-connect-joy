import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { UserX } from 'lucide-react';
import { useUpdateRepProfile, useRepCommissionOverride, useSetRepCommissionOverride } from '@/hooks/useRepProfile';
import { useDeactivateRep } from '@/hooks/useDeactivateRep';
import type { SGURepresentativeProfile } from '@/types/sgu-representative';

interface RepSettingsPanelProps {
  rep: SGURepresentativeProfile | null;
  onClose: () => void;
}

export function RepSettingsPanel({ rep, onClose }: RepSettingsPanelProps) {
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('');
  const [notes, setNotes] = useState('');
  const [sharePct, setSharePct] = useState<number>(10);
  const [reason, setReason] = useState('');

  const updateProfile = useUpdateRepProfile();
  const { data: override } = useRepCommissionOverride(rep?.user_id, rep?.tenant_id);
  const setOverride = useSetRepCommissionOverride();
  const deactivate = useDeactivateRep();

  useEffect(() => {
    if (rep) {
      setPhone(rep.phone ?? '');
      setRegion(rep.region ?? '');
      setNotes(rep.notes ?? '');
    }
  }, [rep]);

  useEffect(() => {
    if (override) setSharePct(Number(override.share_pct));
  }, [override]);

  if (!rep) return null;

  const handleSave = async () => {
    await updateProfile.mutateAsync({
      userId: rep.user_id,
      patch: { phone, region, notes },
    });
  };

  const handleSaveCommission = async () => {
    await setOverride.mutateAsync({ userId: rep.user_id, tenantId: rep.tenant_id, sharePct });
  };

  const handleDeactivate = async () => {
    await deactivate.mutateAsync({ userId: rep.user_id, reason });
    onClose();
  };

  return (
    <Sheet open={!!rep} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{rep.first_name} {rep.last_name}</SheetTitle>
          <p className="text-sm text-muted-foreground">{rep.email}</p>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Profil</h3>
            <div className="space-y-2">
              <Label>Telefon</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Region</Label>
              <Input value={region} onChange={(e) => setRegion(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Notatki</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
            <Button onClick={handleSave} disabled={updateProfile.isPending} size="sm">
              Zapisz profil
            </Button>
          </section>

          <Separator />

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Stawka prowizji (override)</h3>
            <p className="text-xs text-muted-foreground">
              Indywidualna stawka procentowa od bazy prowizji. Zostawienie domyślnej (10%) oznacza brak override'u.
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Stawka</Label>
                <span className="font-mono font-medium">{sharePct.toFixed(2)}%</span>
              </div>
              <Slider
                value={[sharePct]}
                onValueChange={(v) => setSharePct(v[0])}
                min={0}
                max={30}
                step={0.5}
              />
            </div>
            <Button onClick={handleSaveCommission} disabled={setOverride.isPending} size="sm" variant="outline">
              Zapisz prowizję
            </Button>
          </section>

          {rep.active && (
            <>
              <Separator />
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-destructive">Strefa zagrożenia</h3>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <UserX className="h-4 w-4 mr-2" />
                      Dezaktywuj przedstawiciela
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Dezaktywować {rep.first_name} {rep.last_name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Przedstawiciel utraci dostęp do SGU, a wszystkie jego aktywne przypisania klientów zostaną wycofane.
                        Możesz go reaktywować w przyszłości, ale przypisania trzeba będzie nadać ponownie.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2">
                      <Label>Powód (opcjonalnie)</Label>
                      <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Anuluj</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeactivate} className="bg-destructive">
                        Dezaktywuj
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
