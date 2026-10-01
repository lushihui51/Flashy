// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { server } from 'src/test/server';
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

describe('AppShell connection banner (ADR 062)', () => {
  afterEach(() => {
    onlineManager.setOnline(true);
  });

  it('shows no banner while the health probe answers ok', async () => {
    let probed = false;
    server.use(
      http.get('*/api/health', () => {
        probed = true;
        return HttpResponse.json({ status: 'ok' });
      }),
    );
    renderShell();

    await waitFor(() => expect(probed).toBe(true));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the server-trouble banner when the probe answers 503', async () => {
    server.use(
      http.get('*/api/health', () =>
        HttpResponse.json(
          {
            detail: {
              code: 'database_unavailable',
              message: 'Flashy is temporarily unavailable.',
            },
          },
          { status: 503 },
        ),
      ),
    );
    renderShell();

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Flashy is having trouble right now. Retrying automatically.',
    );
  });

  it("shows the can't-connect banner when the probe gets no response", async () => {
    server.use(http.get('*/api/health', () => HttpResponse.error()));
    renderShell();

    expect(await screen.findByRole('status')).toHaveTextContent(
      "Can't reach Flashy. Check your connection; retrying automatically.",
    );
  });

  it('shows the offline banner when the browser goes offline', async () => {
    renderShell();
    act(() => onlineManager.setOnline(false));

    expect(await screen.findByRole('status')).toHaveTextContent(
      "You're offline. Flashy will reconnect automatically.",
    );
  });
});
