// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mockSignedOut } from 'src/test/mocks/clerk';
import { appRoutes } from 'src/App';

vi.mock('src/pages/HomePage', () => ({
  default: () => {
    throw new Error('a page that fails while it is being drawn');
  },
}));

beforeEach(() => {
  mockSignedOut();
  // jsdom loads no index.html, whose title is the one a page without a name keeps.
  document.title = 'Flashy';
  // React and the router each log the error a boundary catches.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

describe('the route tree', () => {
  it('has one boundary route under the shell, with the catch-all as its last child', () => {
    expect(appRoutes).toHaveLength(1);
    const shellChildren = appRoutes[0]?.children;
    expect(shellChildren).toHaveLength(1);

    const boundary = shellChildren?.[0];
    expect(boundary?.path).toBeUndefined();
    expect(boundary?.errorElement).toBeTruthy();
    expect(boundary?.children?.at(-1)?.path).toBe('*');
  });
});

describe('a page that cannot be shown', () => {
  it('shows "Page not found." under the shell at an address that leads to no page', async () => {
    renderAt('/nowhere');

    expect(await screen.findByText('Page not found.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument();
    expect(document.title).toBe('Flashy');
  });

  it('shows "Could not load this page." under the shell, and leaves it on the next navigation', async () => {
    const router = renderAt('/');

    expect(await screen.findByText('Could not load this page.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument();

    await act(() => router.navigate('/nowhere'));

    expect(await screen.findByText('Page not found.')).toBeInTheDocument();
    expect(screen.queryByText('Could not load this page.')).not.toBeInTheDocument();
  });
});
