import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePasswordPolicy } from '@/hooks/usePasswordPolicy';
import { ForcePasswordChange } from './ForcePasswordChange';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { shouldShowForceChange, daysUntilExpiry, isLoading: policyLoading, updatePasswordChangedAt } = usePasswordPolicy();

  if (loading || policyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Show force password change if password expired (not for OAuth users)
  if (shouldShowForceChange) {
    const daysOverdue = daysUntilExpiry < 0 ? Math.abs(daysUntilExpiry) : 0;
    return (
      <ForcePasswordChange 
        onPasswordChanged={updatePasswordChangedAt}
        daysOverdue={daysOverdue}
      />
    );
  }

  return <>{children}</>;
}
