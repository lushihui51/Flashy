import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, type InitialEntry } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function renderWithRouter(ui: ReactElement, initialEntries: InitialEntry[] = ['/']) {
  return render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>);
}

/** For components/pages that fetch via TanStack Query. Fresh QueryClient per call —
 * retries off so a mocked error response fails the test immediately instead of
 * retrying into the default timeout. An entry may be `{ pathname, state }` instead of
 * a bare string when the route under test reads `useLocation().state` (e.g.
 * DeckEditor's subject-locked entry point, §4.7). */
export function renderWithProviders(ui: ReactElement, initialEntries: InitialEntry[] = ['/']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
      </QueryClientProvider>,
    ),
  };
}
