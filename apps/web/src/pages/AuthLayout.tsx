import type { ReactNode } from 'react';
import { ColorSchemeToggle, Wordmark } from '../components/AppHeader';

export function AuthLayout({
  title,
  intro,
  children,
  footer,
}: {
  title: string;
  intro: ReactNode;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="min-h-full workbench">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Wordmark />
        <ColorSchemeToggle />
      </div>
      <main
        id="main"
        className="mx-auto grid max-w-5xl gap-10 px-4 pt-6 pb-16 md:grid-cols-[1fr_26rem] md:items-start md:pt-16"
      >
        <section className="hidden md:block" aria-hidden="true">
          <p className="font-display text-4xl leading-tight font-semibold text-ink">
            Write it once.
            <br />
            Send it as a PDF.
            <br />
            Share it as a page.
          </p>
          <p className="mt-4 max-w-sm text-muted">
            Edit your career details on the left, watch the printed page update on the right, then
            publish the same content at your own link.
          </p>
        </section>
        <div className="rounded-lg border border-line bg-surface p-6 shadow-sm">
          <h1
            data-route-focus
            tabIndex={-1}
            className="font-display text-2xl font-semibold focus:outline-none"
          >
            {title}
          </h1>
          <p className="mt-1 mb-5 text-sm text-muted">{intro}</p>
          {children}
          <div className="mt-5 border-t border-line pt-4 text-sm text-muted">{footer}</div>
        </div>
      </main>
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="mb-4 rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger"
    >
      {message}
    </div>
  );
}
