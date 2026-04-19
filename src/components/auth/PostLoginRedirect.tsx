import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSGUAccess } from '@/hooks/useSGUAccess';
import { useSGUTeamId } from '@/hooks/useSGUTeamId';
import { useOwnerPanel } from '@/hooks/useOwnerPanel';
import { useSuperadmin } from '@/hooks/useSuperadmin';

const SESSION_FLAG = 'sgu.post-login-redirect-done';

const PUBLIC_PATHS = ['/login', '/forgot-password', '/setup-sgu', '/reset-password'];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

/**
 * Post-login routing:
 * - SGU-only users (no director/assistant/admin/superadmin): hard-forced into /sgu/*
 *   on every CRM route. They have no CRM access.
 * - Mixed-role users (director + sgu, etc.): one-shot redirect from `/` or `/login`
 *   to their preferred SGU landing, then free navigation.
 */
export function PostLoginRedirect() {
  const { user, loading, director, isAssistant } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { isPartner, isRep, isLoading: accessLoading } = useSGUAccess();
  const { enabled, isLoading: flagLoading } = useSGUTeamId();
  const { isAdmin, isAdminLoading } = useOwnerPanel();
  const { isSuperadmin, isCheckingRole } = useSuperadmin();

  useEffect(() => {
    if (loading || accessLoading || flagLoading || isAdminLoading || isCheckingRole) return;
    if (!user) return;
    if (typeof window === 'undefined') return;

    const pathname = location.pathname;
    if (isPublicPath(pathname)) return;
    if (pathname.startsWith('/sgu')) return;

    const hasSguAccess = isPartner || isRep;
    const hasCrmAccess = director !== null || isAssistant || isAdmin || isSuperadmin;
    const isSguOnly = hasSguAccess && !hasCrmAccess;

    const landing = isPartner
      ? '/sgu/pipeline?view=kanban'
      : '/sgu/pipeline?view=tasks';

    // SGU-only: always force into SGU, regardless of route or session flag
    if (isSguOnly) {
      navigate(landing, { replace: true });
      return;
    }

    // Mixed roles: one-shot from `/` only (deep links to CRM routes are intentional)
    if (!enabled) return;
    if (sessionStorage.getItem(SESSION_FLAG)) return;
    if (pathname !== '/') {
      sessionStorage.setItem(SESSION_FLAG, '1');
      return;
    }

    sessionStorage.setItem(SESSION_FLAG, '1');
    if (hasSguAccess) {
      navigate(landing, { replace: true });
    }
  }, [
    user,
    loading,
    accessLoading,
    flagLoading,
    isAdminLoading,
    isCheckingRole,
    enabled,
    isPartner,
    isRep,
    director,
    isAssistant,
    isAdmin,
    isSuperadmin,
    location.pathname,
    navigate,
  ]);

  // Clear one-shot flag on logout so next login re-triggers redirect logic
  useEffect(() => {
    if (!user && typeof window !== 'undefined') {
      sessionStorage.removeItem(SESSION_FLAG);
    }
  }, [user]);

  return null;
}
