import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSGUAccess } from '@/hooks/useSGUAccess';
import { useOwnerPanel } from '@/hooks/useOwnerPanel';

interface CRMOnlyGuardProps {
  children: ReactNode;
}

/**
 * Blocks SGU-only users (sgu_partner / sgu_representative without director/admin role)
 * from accessing CRM-only deeplinks like /contacts/:id and /companies/:id.
 *
 * Allowed: directors, assistants, admins, superadmins.
 * Blocked: SGU users with no other role → redirected to /sgu/dashboard.
 */
export function CRMOnlyGuard({ children }: CRMOnlyGuardProps) {
  const { director, isAssistant } = useAuth();
  const { hasAccess, isLoading: sguLoading } = useSGUAccess();
  const { isAdmin, isSuperadmin, isLoading: ownerLoading } = useOwnerPanel();

  if (sguLoading || ownerLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isCrmUser = director !== null || isAssistant || isAdmin || isSuperadmin;

  if (hasAccess && !isCrmUser) {
    return <Navigate to="/sgu/dashboard" replace />;
  }

  return <>{children}</>;
}
