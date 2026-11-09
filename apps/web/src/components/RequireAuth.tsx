import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useCurrentUser } from '../hooks/useAuth';
import { Button } from './ui/Button';
import { FullPageSpinner } from './ui/Spinner';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { data: user, isPending, isError, refetch } = useCurrentUser();
  const location = useLocation();
  if (isPending) return <FullPageSpinner label="Checking your session" />;
  if (isError) {
    return (
      <div className="grid h-full place-items-center p-8 text-center">
        <div>
          <p className="mb-3">Could not reach the server.</p>
          <Button onClick={() => void refetch()}>Try again</Button>
        </div>
      </div>
    );
  }
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <>{children}</>;
}

/** Sends already signed-in users away from the login and signup pages. */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { data: user, isPending } = useCurrentUser();
  if (isPending) return <FullPageSpinner />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}
