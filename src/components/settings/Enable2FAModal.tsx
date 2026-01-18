import { useState, useEffect } from 'react';
import { Loader2, Copy, Check, QrCode, KeyRound } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useTwoFactorAuth } from '@/hooks/useTwoFactorAuth';
import { toast } from 'sonner';

interface Enable2FAModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Enable2FAModal({ isOpen, onClose }: Enable2FAModalProps) {
  const {
    isLoading,
    enrollmentData,
    startEnrollment,
    verifyAndActivate,
    cancelEnrollment,
  } = useTwoFactorAuth();

  const [step, setStep] = useState<'qr' | 'verify'>('qr');
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Start enrollment when modal opens
  useEffect(() => {
    if (isOpen && !enrollmentData) {
      startEnrollment();
    }
  }, [isOpen, enrollmentData, startEnrollment]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('qr');
      setCode('');
      setCopied(false);
    }
  }, [isOpen]);

  const handleCopySecret = async () => {
    if (!enrollmentData?.secret) return;

    try {
      await navigator.clipboard.writeText(enrollmentData.secret);
      setCopied(true);
      toast.success('Klucz skopiowany do schowka');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Nie udało się skopiować klucza');
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast.error('Wprowadź 6-cyfrowy kod');
      return;
    }

    setIsVerifying(true);
    const success = await verifyAndActivate(code);
    setIsVerifying(false);

    if (success) {
      onClose();
    }
  };

  const handleClose = () => {
    if (enrollmentData) {
      cancelEnrollment();
    }
    onClose();
  };

  // Format secret for display (groups of 4)
  const formatSecret = (secret: string) => {
    return secret.match(/.{1,4}/g)?.join(' ') || secret;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Konfiguracja 2FA
          </DialogTitle>
          <DialogDescription>
            {step === 'qr'
              ? 'Zeskanuj kod QR w aplikacji authenticator'
              : 'Wprowadź kod z aplikacji authenticator'}
          </DialogDescription>
        </DialogHeader>

        {isLoading && !enrollmentData ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Generowanie kodu QR...</p>
          </div>
        ) : step === 'qr' && enrollmentData ? (
          <div className="space-y-6">
            {/* QR Code */}
            <div className="flex justify-center">
              <div
                className="p-4 bg-white rounded-lg"
                dangerouslySetInnerHTML={{ __html: enrollmentData.qrCode }}
              />
            </div>

            {/* Secret key for manual entry */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground text-center">
                Lub wprowadź klucz ręcznie:
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-sm text-center break-all">
                  {formatSecret(enrollmentData.secret)}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopySecret}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Alert>
              <KeyRound className="h-4 w-4" />
              <AlertDescription>
                <strong>Ważne:</strong> Zachowaj ten klucz w bezpiecznym miejscu. 
                Będzie potrzebny do odzyskania dostępu w przypadku utraty telefonu.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Anuluj
              </Button>
              <Button onClick={() => setStep('verify')} className="flex-1">
                Dalej
              </Button>
            </div>
          </div>
        ) : step === 'verify' ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-muted-foreground text-center">
                Wprowadź 6-cyfrowy kod wyświetlony w aplikacji authenticator
              </p>

              <InputOTP
                maxLength={6}
                value={code}
                onChange={setCode}
                disabled={isVerifying}
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
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setStep('qr');
                  setCode('');
                }}
                disabled={isVerifying}
                className="flex-1"
              >
                Wstecz
              </Button>
              <Button
                onClick={handleVerify}
                disabled={code.length !== 6 || isVerifying}
                className="flex-1"
              >
                {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Aktywuj 2FA
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
