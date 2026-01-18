import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EnrollmentData {
  factorId: string;
  qrCode: string;
  secret: string;
}

interface MFAFactor {
  id: string;
  status: 'verified' | 'unverified';
  friendly_name?: string;
  factor_type: 'totp';
}

export function useTwoFactorAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [isMFAEnabled, setIsMFAEnabled] = useState(false);
  const [factors, setFactors] = useState<MFAFactor[]>([]);
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData | null>(null);

  // Check MFA status
  const checkMFAStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      
      if (error) {
        console.error('Error checking MFA status:', error);
        return false;
      }

      const verifiedFactors = data?.totp?.filter(f => f.status === 'verified') || [];
      setFactors(verifiedFactors as MFAFactor[]);
      setIsMFAEnabled(verifiedFactors.length > 0);
      
      return verifiedFactors.length > 0;
    } catch (error) {
      console.error('Error checking MFA status:', error);
      return false;
    }
  }, []);

  // Initial check on mount
  useEffect(() => {
    checkMFAStatus();
  }, [checkMFAStatus]);

  // Start enrollment - generate QR code
  const startEnrollment = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'Network Assistant',
      });

      if (error) {
        console.error('Error starting MFA enrollment:', error);
        toast.error('Nie udało się rozpocząć konfiguracji 2FA');
        return null;
      }

      const enrollData: EnrollmentData = {
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      };

      setEnrollmentData(enrollData);
      return enrollData;
    } catch (error) {
      console.error('Error starting MFA enrollment:', error);
      toast.error('Wystąpił błąd podczas konfiguracji 2FA');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Verify and activate 2FA
  const verifyAndActivate = async (code: string): Promise<boolean> => {
    if (!enrollmentData) {
      toast.error('Brak danych do weryfikacji');
      return false;
    }

    setIsLoading(true);
    try {
      // Create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: enrollmentData.factorId,
      });

      if (challengeError) {
        console.error('Error creating MFA challenge:', challengeError);
        toast.error('Nie udało się utworzyć wyzwania weryfikacyjnego');
        return false;
      }

      // Verify the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrollmentData.factorId,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) {
        console.error('Error verifying MFA code:', verifyError);
        if (verifyError.message.includes('Invalid')) {
          toast.error('Nieprawidłowy kod. Sprawdź i spróbuj ponownie.');
        } else {
          toast.error('Weryfikacja nie powiodła się');
        }
        return false;
      }

      // Success
      setIsMFAEnabled(true);
      setEnrollmentData(null);
      await checkMFAStatus();
      toast.success('Uwierzytelnianie dwuskładnikowe zostało włączone!');
      return true;
    } catch (error) {
      console.error('Error activating MFA:', error);
      toast.error('Wystąpił błąd podczas aktywacji 2FA');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel enrollment (unenroll unverified factor)
  const cancelEnrollment = async () => {
    if (!enrollmentData) return;

    try {
      await supabase.auth.mfa.unenroll({
        factorId: enrollmentData.factorId,
      });
    } catch (error) {
      console.error('Error cancelling enrollment:', error);
    } finally {
      setEnrollmentData(null);
    }
  };

  // Disable 2FA
  const disable2FA = async (): Promise<boolean> => {
    if (factors.length === 0) {
      toast.error('2FA nie jest włączone');
      return false;
    }

    setIsLoading(true);
    try {
      // Unenroll all verified factors
      for (const factor of factors) {
        const { error } = await supabase.auth.mfa.unenroll({
          factorId: factor.id,
        });

        if (error) {
          console.error('Error disabling MFA:', error);
          toast.error('Nie udało się wyłączyć 2FA');
          return false;
        }
      }

      setIsMFAEnabled(false);
      setFactors([]);
      toast.success('Uwierzytelnianie dwuskładnikowe zostało wyłączone');
      return true;
    } catch (error) {
      console.error('Error disabling MFA:', error);
      toast.error('Wystąpił błąd podczas wyłączania 2FA');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Verify login with MFA
  const verifyLogin = async (factorId: string, code: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Create challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) {
        console.error('Error creating MFA challenge:', challengeError);
        toast.error('Błąd weryfikacji');
        return false;
      }

      // Verify
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) {
        console.error('Error verifying MFA:', verifyError);
        if (verifyError.message.includes('Invalid')) {
          toast.error('Nieprawidłowy kod');
        } else {
          toast.error('Weryfikacja nie powiodła się');
        }
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error during MFA verification:', error);
      toast.error('Wystąpił błąd podczas weryfikacji');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Get MFA factors for login
  const getMFAFactors = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      
      if (error) {
        console.error('Error getting MFA factors:', error);
        return [];
      }

      return data?.totp?.filter(f => f.status === 'verified') || [];
    } catch (error) {
      console.error('Error getting MFA factors:', error);
      return [];
    }
  };

  return {
    isLoading,
    isMFAEnabled,
    factors,
    enrollmentData,
    checkMFAStatus,
    startEnrollment,
    verifyAndActivate,
    cancelEnrollment,
    disable2FA,
    verifyLogin,
    getMFAFactors,
  };
}
