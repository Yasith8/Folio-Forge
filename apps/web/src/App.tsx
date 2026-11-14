import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { RedirectIfAuthenticated, RequireAuth } from './components/RequireAuth';
import { FullPageSpinner } from './components/ui/Spinner';
import { Toaster } from './components/ui/Toaster';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SignupPage } from './pages/SignupPage';

// The editor pulls in Tiptap and dnd-kit, so it loads only when needed.
const EditorPage = lazy(() => import('./pages/EditorPage'));

/** Moves focus to the main heading after navigation, so screen readers announce the new page. */
function RouteFocus() {
  const { pathname } = useLocation();
  useEffect(() => {
    const heading = document.querySelector<HTMLElement>('h1[data-route-focus]');
    heading?.focus({ preventScroll: true });
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded bg-surface px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <RouteFocus />
      <Suspense fallback={<FullPageSpinner />}>
        <Routes>
          <Route
            path="/login"
            element={
              <RedirectIfAuthenticated>
                <LoginPage />
              </RedirectIfAuthenticated>
            }
          />
          <Route
            path="/signup"
            element={
              <RedirectIfAuthenticated>
                <SignupPage />
              </RedirectIfAuthenticated>
            }
          />
          <Route
            path="/"
            element={
              <RequireAuth>
                <DashboardPage />
              </RequireAuth>
            }
          />
          <Route
            path="/resumes/:id"
            element={
              <RequireAuth>
                <EditorPage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <Toaster />
    </>
  );
}
