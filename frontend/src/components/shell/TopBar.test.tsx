// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from 'src/test/testUtils';
import { mockSignedOut, mockSignedIn } from 'src/test/mocks/clerk';
import TopBar from 'src/components/shell/TopBar';

beforeEach(() => {
  vi.clearAllMocks();
  mockSignedOut();
});

function renderTopBar(overrides: Partial<Parameters<typeof TopBar>[0]> = {}) {
  return renderWithRouter(
    <TopBar onMenuClick={() => {}} isMenuOpen={false} onAvatarClick={() => {}} {...overrides} />,
  );
}

describe('TopBar', () => {
  it('renders the hamburger, logo, Create, and a signed-out Log in button', () => {
    renderTopBar();

    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByRole('link', { name: /flashy home/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('button', { name: '+ Create' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();
  });

  it('signed in: renders the avatar instead of Log in', () => {
    mockSignedIn();
    renderTopBar();

    expect(screen.queryByRole('button', { name: 'Log in' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /account menu/i })).toBeInTheDocument();
  });

  it('calls onMenuClick when the hamburger is clicked', async () => {
    const user = userEvent.setup();
    const onMenuClick = vi.fn();
    renderTopBar({ onMenuClick });

    await user.click(screen.getByRole('button', { name: 'Open menu' }));

    expect(onMenuClick).toHaveBeenCalledTimes(1);
  });

  it('reflects isMenuOpen in aria-expanded and label', () => {
    renderTopBar({ isMenuOpen: true });

    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('does not navigate when Create is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <TopBar onMenuClick={() => {}} isMenuOpen={false} onAvatarClick={() => {}} />,
      ['/practice'],
    );

    await user.click(screen.getByRole('button', { name: '+ Create' }));

    expect(screen.getByRole('button', { name: '+ Create' })).toBeInTheDocument();
  });
});
