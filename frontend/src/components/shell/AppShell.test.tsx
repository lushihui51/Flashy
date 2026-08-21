// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AppShell from 'src/components/shell/AppShell';

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

  it('toggles the hamburger state when clicked', async () => {
    const user = userEvent.setup();
    renderShell();

    const hamburger = screen.getByRole('button', { name: 'Open menu' });
    expect(hamburger).toHaveAttribute('aria-expanded', 'false');

    await user.click(hamburger);

    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });
});
