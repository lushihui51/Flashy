// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { mockSignedOut } from 'src/test/mocks/clerk';
import AppShell from 'src/components/shell/AppShell';

beforeEach(() => {
  vi.clearAllMocks();
  mockSignedOut();
});

function renderShell(initialEntries: string[] = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<div>home content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
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
});
