import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSGUAccess } from '@/hooks/useSGUAccess';
import { useSGUTeamId } from '@/hooks/useSGUTeamId';
import { useOwnerPanel } from '@/hooks/useOwnerPanel';
import { useSuperadmin } from '@/hooks/useSuperadmin';
import { PageLoadingFallback } from '@/components/PageLoadingFallback';

export function SGUAccessGuard({ children }: { children: ReactNode }) {
  const { hasAccess, isLoading } = useSGUAccess();
  const { isAdmin } = useOwnerPanel();
  const { isSuperadmin } = useSuperadmin();
  const { enabled, isLoading: loadingFlag } = useSGUTeamId();

  if (isLoading || loadingFlag) return <PageLoadingFallback />;
  if (!enabled) return <Navigate to="/" replace />;
  if (!hasAccess && !isAdmin && !isSuperadmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
