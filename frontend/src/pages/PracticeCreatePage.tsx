import { Link, useSearchParams } from 'react-router-dom';

// TODO(defer:practice-create) stub target for the overview's "New practice" button.
// Phase 3 builds the real surface here: the subject/deck filters (the same
// PracticeFilterBar this page is already handed via query params), the config list
// grouped by deck with one selection per deck, the name input pre-filled with a local
// date-time string, and a Create button that starts the session and lands on its
// details page.
export default function PracticeCreatePage() {
  const [searchParams] = useSearchParams();
  const search = searchParams.toString();

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold text-(--color-text)">New practice</h1>
      <p className="text-(--color-text-muted)">Coming soon.</p>

      {/* Until the config list lives on this page (Phase 3), these are the links it
          would otherwise provide — a session is built out of configs, so this is where
          someone lands looking for them. */}
      <div className="mt-4 flex flex-col items-start gap-2">
        <Link
          to={{ pathname: '/practice/configs/new', search }}
          className="text-sm font-medium text-(--color-primary)"
        >
          New practice config
        </Link>
        <Link
          to={{ pathname: '/practice/configs', search }}
          className="text-sm font-medium text-(--color-primary)"
        >
          Manage practice configs
        </Link>
      </div>
    </div>
  );
}
