import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Network, ShieldAlert } from 'lucide-react';
import { MFAVerification } from '@/components/auth/MFAVerification';
import { GoogleIcon } from '@/components/icons/GoogleIcon';
import { useLoginRateLimiter } from '@/hooks/useLoginRateLimiter';

const loginSchema = z.object({
  email: z.string().email('Nieprawidłowy adres email'),
  password: z.string().min(1, 'Hasło jest wymagane'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const { signIn, signInWithGoogle, user, loading: authLoading, mfaState, completeMFAVerification, cancelMFA } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectionMessage, setRejectionMessage] = useState<string | null>(null);
  const { isLocked, attemptsRemaining, formatRemainingTime, recordFailedAttempt, recordSuccess } = useLoginRateLimiter();

  // Check for auth rejection message (unregistered user tried to login)
  useEffect(() => {
    const msg = sessionStorage.getItem('auth_rejection');
    if (msg) {
      setRejectionMessage(msg);
      sessionStorage.removeItem('auth_rejection');
      setIsGoogleLoading(false);
      setIsSubmitting(false);
    }
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user is logged in and MFA is not required, redirect
  if (user && !mfaState.required) {
    return <Navigate to="/" replace />;
  }

  // Show MFA verification screen if needed
  if (mfaState.required && mfaState.factorId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <MFAVerification
          factorId={mfaState.factorId}
          onSuccess={completeMFAVerification}
          onCancel={cancelMFA}
        />
      </div>
    );
  }

  const onSubmit = async (data: LoginFormData) => {
    // Check rate limit before attempting login
    if (isLocked) {
      setError(`Konto tymczasowo zablokowane. Spróbuj za ${formatRemainingTime()}`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await signIn(data.email, data.password);

    if (result.error) {
      const { locked, attemptsRemaining: remaining } = recordFailedAttempt(data.email);
      
      if (locked) {
        setError(`Zbyt wiele nieudanych prób. Konto zablokowane na 15 minut.`);
      } else if (result.error.message.includes('Invalid login credentials')) {
        setError(`Nieprawidłowy email lub hasło. Pozostało prób: ${remaining}`);
      } else {
        setError('Wystąpił błąd podczas logowania. Spróbuj ponownie.');
      }
      setIsSubmitting(false);
    } else if (result.needsMFA) {
      // MFA flow will be handled by mfaState change
      recordSuccess();
      setIsSubmitting(false);
    } else {
      // Login successful without MFA
      recordSuccess();
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setError(null);

    const { error } = await signInWithGoogle();

    if (error) {
      if (error.message.includes('popup')) {
        setError('Popup został zablokowany. Zezwól na wyskakujące okna.');
      } else {
        setError('Wystąpił błąd podczas logowania przez Google.');
      }
    }
    setIsGoogleLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Network className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-primary">Network Assistant</span>
          </div>
          <CardTitle className="text-2xl">Zaloguj się</CardTitle>
          <CardDescription>Wprowadź swoje dane aby się zalogować</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {isLocked && (
              <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
                <ShieldAlert className="h-4 w-4" />
                <AlertDescription className="ml-2">
                  Konto tymczasowo zablokowane z powodu zbyt wielu nieudanych prób logowania. 
                  Spróbuj ponownie za <strong>{formatRemainingTime()}</strong>.
                </AlertDescription>
              </Alert>
            )}
            {rejectionMessage && (
              <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertDescription className="ml-2">{rejectionMessage}</AlertDescription>
              </Alert>
            )}
            {error && !isLocked && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="jan@przyklad.pl"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Hasło</Label>
                <Link 
                  to="/forgot-password" 
                  className="text-sm text-primary hover:underline"
                  tabIndex={-1}
                >
                  Nie pamiętasz hasła?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isSubmitting || isGoogleLoading || isLocked}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLocked ? `Zablokowane (${formatRemainingTime()})` : 'Zaloguj się'}
            </Button>
            
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">lub</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleLogin}
              disabled={isSubmitting || isGoogleLoading}
            >
              {isGoogleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <GoogleIcon className="mr-2 h-4 w-4" />
              )}
              Zaloguj się przez Google
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              Aby uzyskać konto, skontaktuj się z administratorem.
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
