import { Link } from 'react-router-dom';
import { buttonClasses } from '../components/ui/Button';

export function NotFoundPage() {
  return (
    <main id="main" className="grid min-h-full place-items-center p-8 text-center">
      <div>
        <h1
          data-route-focus
          tabIndex={-1}
          className="font-display text-3xl font-semibold focus:outline-none"
        >
          This page does not exist
        </h1>
        <p className="mt-2 text-muted">Check the address, or go back to your resumes.</p>
        <Link to="/" className={buttonClasses('primary', 'md', 'mt-6')}>
          Go to your resumes
        </Link>
      </div>
    </main>
  );
}
