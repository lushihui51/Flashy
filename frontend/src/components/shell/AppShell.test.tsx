// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mockSignedOut, mockSignedIn } from 'src/test/mocks/clerk';
import AppShell from 'src/components/shell/AppShell';

beforeEach(() => {
  vi.clearAllMocks();
  mockSignedOut();
});

function renderShell(initialEntries: string[] = ['/']) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<div>home content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AppShell', () => {
  it('renders the top bar, search bar, and the routed page content', () => {
    renderShell();

    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.getByText('home content')).toBeInTheDocument();
  });

  it('opens the side drawer when the hamburger is clicked', async () => {
    const user = userEvent.setup();
    renderShell();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open menu' }));

    // Radix hides the rest of the page (including the now "Close menu"
    // hamburger) from the accessibility tree while the modal drawer is
    // trapped, so the queryable close paths here are Esc/scrim/item-click.
    expect(screen.getByRole('dialog', { name: 'Main menu' })).toBeInTheDocument();
  });

  it('closes the drawer when the hamburger is clicked again while open', async () => {
    const user = userEvent.setup();
    renderShell();

    const hamburger = screen.getByRole('button', { name: 'Open menu' });
    await user.click(hamburger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // The hamburger is still visually the top bar's close control, and
    // remains genuinely clickable (pointer-events-auto overrides the
    // pointer-events:none Radix puts on <body> for everything else while
    // the modal drawer is trapped) — clicking it again should close it.
    await user.click(hamburger);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('returns focus to the hamburger when the drawer closes via Escape', async () => {
    const user = userEvent.setup();
    renderShell();

    const hamburger = screen.getByRole('button', { name: 'Open menu' });
    await user.click(hamburger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(hamburger).toHaveFocus();
  });

  it('opens the account sheet when the avatar is clicked, not the drawer, without navigating', async () => {
    mockSignedIn({ username: 'ada' });
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole('button', { name: /account menu/i }));

    expect(screen.getByRole('dialog', { name: 'ada' })).toBeInTheDocument();
    expect(screen.getByText('home content')).toBeInTheDocument();
  });

  it('never has the drawer and the account sheet open at the same time', async () => {
    mockSignedIn({ username: 'ada' });
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getAllByRole('dialog')).toHaveLength(1);

    // The drawer is modal: Radix hides everything outside its trapped
    // content from the accessibility tree (and blocks its pointer events),
    // so the avatar isn't even queryable while it's open — proving the two
    // overlays can't both be open through the UI.
    expect(screen.queryByRole('button', { name: /account menu/i })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Main menu' })).toBeInTheDocument();
  });
});
