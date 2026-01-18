import { useState } from 'react';
import { Shield, ShieldCheck, ShieldOff, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTwoFactorAuth } from '@/hooks/useTwoFactorAuth';
import { Enable2FAModal } from './Enable2FAModal';

export function TwoFactorSettings() {
  const { isMFAEnabled, isLoading, disable2FA } = useTwoFactorAuth();
  const [showEnableModal, setShowEnableModal] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  const handleDisable2FA = async () => {
    setIsDisabling(true);
    const success = await disable2FA();
    setIsDisabling(false);
    if (success) {
      setShowDisableDialog(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Uwierzytelnianie dwuskładnikowe (2FA)
          </CardTitle>
          <CardDescription>
            Dodatkowa warstwa bezpieczeństwa przy logowaniu za pomocą aplikacji authenticator
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              {isMFAEnabled ? (
                <ShieldCheck className="h-8 w-8 text-green-500" />
              ) : (
                <ShieldOff className="h-8 w-8 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">
                  Status 2FA:{' '}
                  {isMFAEnabled ? (
                    <Badge variant="default" className="bg-green-500 ml-2">Włączone</Badge>
                  ) : (
                    <Badge variant="secondary" className="ml-2">Wyłączone</Badge>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isMFAEnabled
                    ? 'Twoje konto jest chronione dodatkowym kodem weryfikacyjnym'
                    : 'Włącz 2FA, aby zwiększyć bezpieczeństwo konta'}
                </p>
              </div>
            </div>
          </div>

          {isMFAEnabled ? (
            <Button
              variant="destructive"
              onClick={() => setShowDisableDialog(true)}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Wyłącz 2FA
            </Button>
          ) : (
            <Button onClick={() => setShowEnableModal(true)} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Shield className="mr-2 h-4 w-4" />
              Włącz 2FA
            </Button>
          )}

          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium">Obsługiwane aplikacje:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Google Authenticator</li>
              <li>Microsoft Authenticator</li>
              <li>Authy</li>
              <li>1Password</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Enable 2FA Modal */}
      <Enable2FAModal
        isOpen={showEnableModal}
        onClose={() => setShowEnableModal(false)}
      />

      {/* Disable 2FA Confirmation Dialog */}
      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wyłączyć uwierzytelnianie dwuskładnikowe?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta operacja zmniejszy bezpieczeństwo Twojego konta. Po wyłączeniu 2FA, 
              do logowania będzie wymagane tylko hasło.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDisabling}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisable2FA}
              disabled={isDisabling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDisabling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Wyłącz 2FA
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
