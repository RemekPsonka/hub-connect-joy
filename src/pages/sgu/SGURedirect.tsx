import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';

interface SGURedirectProps {
  to: string;
  message?: string;
}

/**
 * Redirect helper for renamed SGU routes.
 * Shows a one-time toast then navigates to the new path.
 */
export default function SGURedirect({ to, message }: SGURedirectProps) {
  useEffect(() => {
    toast.info(message ?? 'Ta strona ma nowy adres', {
      description: `Przekierowuje do ${to}`,
      duration: 3000,
    });
  }, [to, message]);

  return <Navigate to={to} replace />;
}
