import { useState } from 'react';
import { Shield, Loader2, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTwoFactorAuth } from '@/hooks/useTwoFactorAuth';

interface MFAVerificationProps {
  factorId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function MFAVerification({ factorId, onSuccess, onCancel }: MFAVerificationProps) {
  const { verifyLogin, isLoading } = useTwoFactorAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('Wprowadź 6-cyfrowy kod');
      return;
    }

    setError(null);
    setIsVerifying(true);

    const success = await verifyLogin(factorId, code);
    
    setIsVerifying(false);

    if (success) {
      onSuccess();
    } else {
      setCode('');
      setError('Nieprawidłowy kod. Spróbuj ponownie.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length === 6 && !isVerifying) {
      handleVerify();
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Weryfikacja dwuskładnikowa</CardTitle>
        <CardDescription>
          Wprowadź kod z aplikacji authenticator
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col items-center gap-6" onKeyDown={handleKeyDown}>
          <InputOTP
            maxLength={6}
            value={code}
            onChange={(value) => {
              setCode(value);
              setError(null);
            }}
            disabled={isVerifying || isLoading}
            autoFocus
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>

          <div className="w-full space-y-3">
            <Button
              onClick={handleVerify}
              disabled={code.length !== 6 || isVerifying || isLoading}
              className="w-full"
            >
              {(isVerifying || isLoading) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Zweryfikuj
            </Button>

            <Button
              variant="ghost"
              onClick={onCancel}
              disabled={isVerifying || isLoading}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Wróć do logowania
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Kod zmienia się co 30 sekund. Upewnij się, że używasz aktualnego kodu z aplikacji.
        </p>
      </CardContent>
    </Card>
  );
}
