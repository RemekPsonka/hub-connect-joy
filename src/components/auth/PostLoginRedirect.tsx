import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSGUAccess } from '@/hooks/useSGUAccess';
import { useSGUTeamId } from '@/hooks/useSGUTeamId';

const SESSION_FLAG = 'sgu.post-login-redirect-done';

/**
 * One-shot redirect after first login: representatives → SGU pipeline tasks,
 * partners → SGU dashboard, others stay on `/`. Skips if already navigated
 * within this browser session, if user landed on a deep link (anything other
 * than `/` or `/login`), or if the SGU layout flag is disabled.
 */
export function PostLoginRedirect() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { isPartner, isRep, isLoading: accessLoading } = useSGUAccess();
  const { enabled, isLoading: flagLoading } = useSGUTeamId();

  useEffect(() => {
    if (loading || accessLoading || flagLoading) return;
    if (!user) return;
    if (!enabled) return;
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(SESSION_FLAG)) return;

    // only auto-redirect from root or /login — deep links are intentional
    if (location.pathname !== '/' && location.pathname !== '/login') {
      sessionStorage.setItem(SESSION_FLAG, '1');
      return;
    }

    sessionStorage.setItem(SESSION_FLAG, '1');

    if (isRep && !isPartner) {
      navigate('/sgu/pipeline?view=tasks', { replace: true });
    } else if (isPartner) {
      navigate('/sgu/pipeline?view=kanban', { replace: true });
    }
  }, [user, loading, accessLoading, flagLoading, enabled, isPartner, isRep, location.pathname, navigate]);

  return null;
}
