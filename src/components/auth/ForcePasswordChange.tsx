import { useState } from 'react';
import { Lock, Eye, EyeOff, Shield, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Password requirements
const PASSWORD_REQUIREMENTS = [
  { id: 'length', label: 'Co najmniej 12 znaków', regex: /.{12,}/ },
  { id: 'uppercase', label: 'Co najmniej jedna wielka litera', regex: /[A-Z]/ },
  { id: 'lowercase', label: 'Co najmniej jedna mała litera', regex: /[a-z]/ },
  { id: 'number', label: 'Co najmniej jedna cyfra', regex: /[0-9]/ },
  { id: 'special', label: 'Co najmniej jeden znak specjalny (!@#$%^&*)', regex: /[!@#$%^&*(),.?":{}|<>]/ },
];

interface ForcePasswordChangeProps {
  onPasswordChanged: () => void;
  daysOverdue?: number;
}

export function ForcePasswordChange({ onPasswordChanged, daysOverdue = 0 }: ForcePasswordChangeProps) {
  const { signOut } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkRequirements = (password: string) => {
    return PASSWORD_REQUIREMENTS.map((req) => ({
      ...req,
      met: req.regex.test(password),
    }));
  };

  const requirements = checkRequirements(newPassword);
  const allRequirementsMet = requirements.every((req) => req.met);
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!allRequirementsMet) {
      setError('Hasło nie spełnia wszystkich wymagań');
      return;
    }

    if (!passwordsMatch) {
      setError('Hasła nie są identyczne');
      return;
    }

    setIsLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      // Update password_changed_at in policy
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('user_password_policies')
          .update({ 
            password_changed_at: new Date().toISOString(),
            force_password_change: false,
          })
          .eq('user_id', user.id);
      }

      toast.success('Hasło zostało zmienione pomyślnie');
      onPasswordChanged();
    } catch (err) {
      console.error('Error changing password:', err);
      setError('Nie udało się zmienić hasła. Spróbuj ponownie.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            Zmiana hasła wymagana
          </CardTitle>
          <CardDescription>
            {daysOverdue > 0 
              ? `Twoje hasło wygasło ${daysOverdue} dni temu. Ze względów bezpieczeństwa musisz je zmienić.`
              : 'Ze względów bezpieczeństwa musisz zmienić hasło aby kontynuować.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="new-password">Nowe hasło</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Wprowadź nowe hasło"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Potwierdź hasło</Label>
              <Input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Potwierdź nowe hasło"
                required
              />
              {confirmPassword && !passwordsMatch && (
                <p className="text-sm text-destructive">Hasła nie są identyczne</p>
              )}
            </div>

            {/* Password requirements checklist */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Wymagania hasła:</p>
              <ul className="space-y-1">
                {requirements.map((req) => (
                  <li
                    key={req.id}
                    className={`text-sm flex items-center gap-2 ${
                      req.met ? 'text-emerald-600' : 'text-muted-foreground'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                      req.met ? 'bg-emerald-100 text-emerald-600' : 'bg-muted text-muted-foreground'
                    }`}>
                      {req.met ? '✓' : '○'}
                    </span>
                    {req.label}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button 
                type="submit" 
                disabled={isLoading || !allRequirementsMet || !passwordsMatch}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Lock className="mr-2 h-4 w-4 animate-pulse" />
                    Zapisywanie...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Zmień hasło
                  </>
                )}
              </Button>
              <Button 
                type="button" 
                variant="outline"
                onClick={handleLogout}
                className="w-full"
              >
                Wyloguj się
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
