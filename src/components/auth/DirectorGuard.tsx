import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface DirectorGuardProps {
  children: ReactNode;
}

export function DirectorGuard({ children }: DirectorGuardProps) {
  const { isAssistant, loading } = useAuth();

  // Wait for auth to load
  if (loading) {
    return null;
  }

  // Redirect assistants to contacts page
  if (isAssistant) {
    return <Navigate to="/contacts" replace />;
  }

  return <>{children}</>;
}
