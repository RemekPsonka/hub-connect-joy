import { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PASSWORD_REQUIREMENTS, isPasswordStrong } from '@/utils/passwordValidation';

export function PasswordChangeForm() {
  const { user } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const checkRequirements = (password: string) => {
    return PASSWORD_REQUIREMENTS.map((req) => ({
      ...req,
      met: req.regex.test(password),
    }));
  };

  const requirements = checkRequirements(newPassword);
  const allRequirementsMet = isPasswordStrong(newPassword);
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!allRequirementsMet) {
      toast.error('Hasło nie spełnia wszystkich wymagań');
      return;
    }

    if (!passwordsMatch) {
      toast.error('Hasła nie są identyczne');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      // Update password_changed_at in policy
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
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Nie udało się zmienić hasła');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Zmiana hasła
        </CardTitle>
        <CardDescription>
          Ustaw nowe hasło do swojego konta. Hasło wygasa co 30 dni.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
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
          {newPassword.length > 0 && (
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
          )}

          <Button 
            type="submit" 
            disabled={isLoading || !allRequirementsMet || !passwordsMatch}
          >
            {isLoading ? 'Zapisywanie...' : 'Zmień hasło'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
