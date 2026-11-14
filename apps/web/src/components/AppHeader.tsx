import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCurrentUser, useLogout } from '../hooks/useAuth';
import { useColorScheme } from '../lib/colorScheme';
import { Button, IconButton } from './ui/Button';
import { Icon } from './ui/Icon';

export function Wordmark() {
  return (
    <Link to="/" className="font-display text-xl font-semibold tracking-tight text-ink">
      Folio<span className="text-spark">Forge</span>
    </Link>
  );
}

export function ColorSchemeToggle() {
  const [scheme, toggle] = useColorScheme();
  return (
    <IconButton
      label={scheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggle}
    >
      <Icon name={scheme === 'dark' ? 'sun' : 'moon'} />
    </IconButton>
  );
}

export function AppHeader({ children }: { children?: ReactNode }) {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const navigate = useNavigate();
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Wordmark />
        <div className="flex-1">{children}</div>
        <ColorSchemeToggle />
        {user && (
          <>
            <span className="hidden text-sm text-muted sm:inline">{user.displayName}</span>
            <Button
              size="sm"
              variant="ghost"
              busy={logout.isPending}
              onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/login') })}
            >
              Sign out
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
