import { useState } from 'react';
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
import { Loader2, Network } from 'lucide-react';
import { MFAVerification } from '@/components/auth/MFAVerification';

const loginSchema = z.object({
  email: z.string().email('Nieprawidłowy adres email'),
  password: z.string().min(1, 'Hasło jest wymagane'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const { signIn, user, loading: authLoading, mfaState, completeMFAVerification, cancelMFA } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setIsSubmitting(true);
    setError(null);

    const result = await signIn(data.email, data.password);

    if (result.error) {
      if (result.error.message.includes('Invalid login credentials')) {
        setError('Nieprawidłowy email lub hasło');
      } else {
        setError('Wystąpił błąd podczas logowania. Spróbuj ponownie.');
      }
      setIsSubmitting(false);
    } else if (result.needsMFA) {
      // MFA flow will be handled by mfaState change
      setIsSubmitting(false);
    } else {
      // Login successful without MFA
      setIsSubmitting(false);
    }
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
            {error && (
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
              <Label htmlFor="password">Hasło</Label>
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
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Zaloguj się
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Nie masz konta?{' '}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                Zarejestruj się
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
