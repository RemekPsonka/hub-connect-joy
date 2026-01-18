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
import { GoogleIcon } from '@/components/icons/GoogleIcon';

const signupSchema = z.object({
  fullName: z.string().min(2, 'Imię i nazwisko musi mieć co najmniej 2 znaki').max(100, 'Imię i nazwisko jest za długie'),
  email: z.string().email('Nieprawidłowy adres email').max(255, 'Email jest za długi'),
  password: z.string().min(8, 'Hasło musi mieć co najmniej 8 znaków'),
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function Signup() {
  const { signUp, signInWithGoogle, user, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (data: SignupFormData) => {
    setIsSubmitting(true);
    setError(null);

    const { error } = await signUp(data.email, data.password, data.fullName);

    if (error) {
      if (error.message.includes('User already registered')) {
        setError('Użytkownik z tym adresem email już istnieje');
      } else if (error.message.includes('Password')) {
        setError('Hasło jest za słabe. Użyj silniejszego hasła.');
      } else {
        setError('Wystąpił błąd podczas rejestracji. Spróbuj ponownie.');
      }
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true);
    setError(null);

    const { error } = await signInWithGoogle();

    if (error) {
      if (error.message.includes('popup')) {
        setError('Popup został zablokowany. Zezwól na wyskakujące okna.');
      } else {
        setError('Wystąpił błąd podczas rejestracji przez Google.');
      }
      setIsGoogleLoading(false);
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
          <CardTitle className="text-2xl">Utwórz konto</CardTitle>
          <CardDescription>Wprowadź swoje dane aby się zarejestrować</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="fullName">Imię i nazwisko</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Jan Kowalski"
                {...register('fullName')}
              />
              {errors.fullName && (
                <p className="text-sm text-destructive">{errors.fullName.message}</p>
              )}
            </div>
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
                placeholder="Minimum 8 znaków"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isSubmitting || isGoogleLoading}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Zarejestruj się
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
              onClick={handleGoogleSignup}
              disabled={isSubmitting || isGoogleLoading}
            >
              {isGoogleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <GoogleIcon className="mr-2 h-4 w-4" />
              )}
              Zarejestruj się przez Google
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              Masz już konto?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Zaloguj się
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
