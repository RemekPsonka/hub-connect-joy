import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSGUAccess } from '@/hooks/useSGUAccess';

interface DirectorGuardProps {
  children: ReactNode;
}

export function DirectorGuard({ children }: DirectorGuardProps) {
  const { director, isAssistant, loading } = useAuth();
  const { isPartner, isRep, isLoading: sguLoading } = useSGUAccess();

  if (loading || sguLoading) {
    return null;
  }

  // SGU-only users (no director, no assistant) → push into their SGU landing
  if (!director && !isAssistant && (isPartner || isRep)) {
    const landing = isPartner ? '/sgu/pipeline?view=kanban' : '/sgu/pipeline?view=tasks';
    return <Navigate to={landing} replace />;
  }

  // Assistants → contacts
  if (isAssistant) {
    return <Navigate to="/contacts" replace />;
  }

  return <>{children}</>;
}
