import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { SGULogo } from '@/lib/sgu/SGULogo';

type Step = 1 | 2 | 3 | 4;

export default function SetupSGU() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('');
  const [notes, setNotes] = useState('');
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('sgu_representative_profiles')
        .select('first_name, last_name, phone, region, notes, onboarded_at')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        const d = data as { phone: string | null; region: string | null; notes: string | null };
        setPhone(d.phone ?? '');
        setRegion(d.region ?? '');
        setNotes(d.notes ?? '');
      }
      setProfileLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (loading || !profileLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    navigate('/login', { replace: true });
    return null;
  }

  const progress = (step / 4) * 100;

  const handleSetPassword = async () => {
    if (password.length < 8) {
      toast.error('Hasło musi mieć co najmniej 8 znaków');
      return;
    }
    if (password !== confirm) {
      toast.error('Hasła nie są zgodne');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      toast.error(`Błąd: ${error.message}`);
      return;
    }
    toast.success('Hasło ustawione');
    setStep(3);
  };

  const handleFinish = async () => {
    setSubmitting(true);
    const { error } = await supabase.rpc('rpc_sgu_complete_onboarding', {
      p_phone: phone || undefined,
      p_region: region || undefined,
      p_notes: notes || undefined,
    });
    setSubmitting(false);
    if (error) {
      toast.error(`Błąd: ${error.message}`);
      return;
    }
    toast.success('Onboarding zakończony!');
    navigate('/sgu/pipeline?view=tasks', { replace: true });
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3 mb-4">
            <SGULogo className="h-10 w-10" />
            <div>
              <CardTitle>Konfiguracja konta SGU</CardTitle>
              <CardDescription>Krok {step} z 4</CardDescription>
            </div>
          </div>
          <Progress value={progress} className="h-1.5" />
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-4 text-center py-6">
              <h2 className="text-xl font-semibold">Witaj w Sieci Generacji Ubezpieczeń!</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Za chwilę przeprowadzimy Cię przez krótkie ustawienie konta: ustawisz hasło,
                potwierdzisz dane profilowe i zaczniesz pracę z klientami.
              </p>
              <Button onClick={() => setStep(2)} size="lg" className="mt-4">
                Zaczynamy <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Ustaw hasło</h2>
              <div className="space-y-2">
                <Label>Nowe hasło</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 znaków"
                />
              </div>
              <div className="space-y-2">
                <Label>Powtórz hasło</Label>
                <Input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              <Button onClick={handleSetPassword} disabled={submitting} className="w-full">
                {submitting ? 'Zapisywanie...' : 'Ustaw hasło'}
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Twój profil</h2>
              <p className="text-xs text-muted-foreground">
                Poniższe dane już mamy, możesz je uzupełnić lub poprawić.
              </p>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+48..." />
              </div>
              <div className="space-y-2">
                <Label>Region</Label>
                <Input value={region} onChange={(e) => setRegion(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>O mnie (opcjonalnie)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </div>
              <Button onClick={() => setStep(4)} className="w-full">
                Dalej <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 text-center py-6">
              <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
              <h2 className="text-xl font-semibold">Wszystko gotowe!</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Po kliknięciu poniżej trafisz do swojego dziennika zadań — tam czekają na Ciebie
                pierwsi klienci.
              </p>
              <Button onClick={handleFinish} disabled={submitting} size="lg" className="mt-4">
                {submitting ? 'Finalizuję...' : 'Przejdź do pracy'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
